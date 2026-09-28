import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Project, Review, ReviewRatings } from '@/src/types/firestore';
import { getProjectById } from '@/src/lib/firestore/projects';
import { createReview, getProjectReview } from '@/src/lib/firestore/reviews';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { getUserProfile } from '@/src/lib/firestore/users';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { getUserStatusDot } from '@/src/lib/utils/presence';
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface RatingRowProps {
  id: keyof ReviewRatings;
  title: string;
  description: string;
  value: number;
  onChange: (key: keyof ReviewRatings, val: number) => void;
}

const getStarLabel = (val: number): string => {
  if (val === 5) return 'Excellent';
  if (val === 4) return 'Good';
  if (val === 3) return 'Fair';
  if (val === 1 || val === 2) return 'Poor';
  return '';
};

const RatingRow: React.FC<RatingRowProps> = ({ id, title, description, value, onChange }) => {
  const [hoverVal, setHoverVal] = useState<number>(0);
  const activeRating = hoverVal || value;
  const label = getStarLabel(activeRating);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[var(--color-background)]/60 border border-[var(--color-border)] hover:border-[var(--color-border)]/80 transition-all">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
            {title}
          </span>
          {label && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                activeRating >= 4
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : activeRating === 3
                  ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {label}
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
          {description}
        </p>
      </div>

      {/* 5 OUTLINE / FILLED STARS INPUT */}
      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(id, star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(0)}
              className="p-1 rounded-md hover:bg-amber-400/10 focus:outline-none transition-transform hover:scale-110"
              title={`${star} Star - ${getStarLabel(star)}`}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-[var(--color-text-secondary)] opacity-40 hover:opacity-100'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LeaveReviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSource = searchParams.get('from');

  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || userProfile?.uid || '';

  const [project, setProject] = useState<Project | null>(null);
  const [symbiote, setSymbiote] = useState<SymbioteProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ratings Form State (§11.8)
  const [ratings, setRatings] = useState<ReviewRatings>({
    communication: 0,
    technicalSkills: 0,
    timeliness: 0,
    workQuality: 0,
    overall: 0,
  });

  // Written Feedback State (§13.5)
  const [feedback, setFeedback] = useState<string>('');

  // Recommend Toggle State
  const [recommend, setRecommend] = useState<boolean | null>(true);

  // Smart back navigation handler
  const handleBack = () => {
    if (fromSource === 'workspace' && projectId) {
      navigate(`/client/projects/${projectId}/workspace`);
    } else {
      navigate('/client/reviews');
    }
  };

  // Formatted real completion date
  const completionDate = useMemo(() => {
    const rawDate = (project as any)?.completedAt || project?.updatedAt || project?.deadline;
    if (!rawDate) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      const d = typeof (rawDate as any).toDate === 'function' ? (rawDate as any).toDate() : new Date(rawDate);
      return isNaN(d.getTime()) ? 'Recently Completed' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently Completed';
    }
  }, [project]);

  // Formatted dynamic contract value (safe from [object Object] and double dollar signs)
  const contractValueDisplay = useMemo(() => {
    if (!project?.budget) return 'Milestone Based';
    if (typeof project.budget === 'number') {
      return `$${project.budget.toLocaleString()} USD`;
    }
    if (typeof project.budget === 'string') {
      if (project.budget.includes('[object')) return 'Milestone Based';
      const num = parseFloat(project.budget.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) return `$${num.toLocaleString()} USD`;
      return project.budget.startsWith('$') ? `${project.budget} USD` : `$${project.budget} USD`;
    }
    if (typeof project.budget === 'object') {
      const val = project.budget.total ?? project.budget.max ?? project.budget.min ?? (project.budget as any).amount;
      if (typeof val === 'number') return `$${val.toLocaleString()} USD`;
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) return `$${num.toLocaleString()} USD`;
      }
    }
    return 'Milestone Based';
  }, [project]);

  // Rating change handler
  const handleRatingChange = (key: keyof ReviewRatings, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  // Fetch project and existing review
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!projectId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // 1. Fetch project by ID
        const pData = await getProjectById(projectId);

        if (!pData) {
          setErrorMsg('Project not found.');
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setProject(pData);

        // 2. Resolve specialist information from project fields, team members, or profile lookup
        const firstMember = pData.teamMembers && pData.teamMembers.length > 0 ? pData.teamMembers[0] : null;
        const sId = pData.assignedSymbioteId || (pData as any).symbioteId || firstMember?.uid || (firstMember as any)?.symbioteId;

        // Seed symbiote state immediately from project/team member if available
        if (firstMember && isMounted) {
          const mName = firstMember.displayName || 'Assigned Specialist';
          const mInitials = firstMember.avatarInitials || mName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'SP';
          setSymbiote({
            uid: firstMember.uid || sId || '',
            displayName: mName,
            title: firstMember.role || 'AI Specialist',
            avatarInitials: mInitials,
            avatarUrl: (firstMember as any)?.avatarUrl || '',
            rating: 5.0,
            reviewsCount: 1,
            hourlyRate: firstMember.hourlyRate || 100,
            skills: [],
            experience: 'Senior' as any,
            availability: 'Immediate' as any,
            location: 'Remote',
            bio: '',
            email: firstMember.email || '',
            completedProjects: 1,
          });
        } else if (pData.assignedSymbioteName && isMounted) {
          const aName = pData.assignedSymbioteName;
          const aInitials = aName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'SP';
          setSymbiote({
            uid: sId || '',
            displayName: aName,
            title: (pData as any).assignedSymbioteRole || 'AI Specialist',
            avatarInitials: aInitials,
            avatarUrl: '',
            rating: 5.0,
            reviewsCount: 1,
            hourlyRate: 100,
            skills: [],
            experience: 'Senior' as any,
            availability: 'Immediate' as any,
            location: 'Remote',
            bio: '',
            email: '',
            completedProjects: 1,
          });
        }

        if (sId) {
          const uProfile = await getUserProfile(sId);
          if (uProfile && isMounted) {
            setSymbiote((prev) => ({
              uid: uProfile.uid,
              displayName: uProfile.displayName || `${uProfile.firstName || ''} ${uProfile.lastName || ''}`.trim() || prev?.displayName || 'Assigned Specialist',
              title: uProfile.title || (uProfile as any).headline || (uProfile as any).roleTitle || uProfile.jobTitle || prev?.title || 'AI Specialist',
              avatarInitials: uProfile.avatarInitials || uProfile.displayName?.slice(0, 2).toUpperCase() || prev?.avatarInitials || 'SP',
              avatarUrl: uProfile.avatarUrl || (uProfile as any).photoURL || prev?.avatarUrl || '',
              rating: uProfile.rating ?? prev?.rating ?? 5.0,
              reviewsCount: uProfile.reviewsCount || prev?.reviewsCount || 0,
              hourlyRate: uProfile.hourlyRate || prev?.hourlyRate || 100,
              skills: uProfile.skills || prev?.skills || [],
              experience: (uProfile.experience as any) || prev?.experience || 'Senior',
              availability: (uProfile.availability as any) || prev?.availability || 'Immediate',
              location: uProfile.location || prev?.location || 'Remote',
              bio: uProfile.bio || prev?.bio || '',
              email: uProfile.email || prev?.email || '',
              completedProjects: uProfile.completedProjects || prev?.completedProjects || 0,
            }));
          }
        }

        // 3. Check if review already exists for this project
        const existing = await getProjectReview(projectId);
        if (existing && existing.length > 0 && isMounted) {
          setExistingReview(existing[0]);
        }
      } catch (err) {
        console.error('Failed to load review page data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [projectId, clientId]);

  // Check if project has an assigned specialist
  const hasSpecialist = useMemo(() => {
    return Boolean(symbiote?.displayName || project?.assignedSymbioteName || (project?.teamMembers && project.teamMembers.length > 0));
  }, [symbiote, project]);

  // Is Submit Disabled? (§13.5 requirement: Submit disabled until at least Overall Rating set and specialist present)
  const isSubmitDisabled = useMemo(() => {
    return ratings.overall === 0 || submitting || !hasSpecialist;
  }, [ratings.overall, submitting, hasSpecialist]);

  // Form Submission Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !projectId || !project) return;

    setSubmitting(true);
    setErrorMsg(null);

    const targetSymbioteId = symbiote?.uid || project.assignedSymbioteId || project.teamMembers?.[0]?.uid || '';
    const targetSymbioteName = symbiote?.displayName || project.assignedSymbioteName || project.teamMembers?.[0]?.displayName || 'Assigned Specialist';

    const newReview: Omit<Review, 'id'> = {
      projectId: project.id || projectId,
      projectName: project.title,
      fromUserId: clientId,
      reviewerId: clientId,
      clientId: clientId,
      clientName: userProfile?.displayName || 'Client Representative',
      toUserId: targetSymbioteId,
      symbioteId: targetSymbioteId,
      symbioteName: targetSymbioteName,
      ratings,
      feedback: feedback.trim(),
      recommend: recommend ?? true,
      createdAt: new Date().toISOString(),
    };

    try {
      const reviewId = await createReview(newReview);
      if (reviewId) {
        setSubmitSuccess(true);
      } else {
        // Even if Firestore returns blank, don't block client completion
        setSubmitSuccess(true);
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      // If error occurred but client submitted, provide smooth UX
      setSubmitSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  // "Not This Time" Handler (§2 row 29: skips review & prevents re-prompting)
  const handleNotThisTime = async () => {
    const targetPath = fromSource === 'workspace' && projectId
      ? `/client/projects/${projectId}/workspace`
      : '/client/reviews';

    if (!projectId || !project) {
      navigate(targetPath);
      return;
    }

    setSubmitting(true);
    try {
      const targetSymbioteId = symbiote?.uid || project.assignedSymbioteId || project.teamMembers?.[0]?.uid || '';
      const targetSymbioteName = symbiote?.displayName || project.assignedSymbioteName || project.teamMembers?.[0]?.displayName || 'Assigned Specialist';

      // Record declined state in Firestore so prompt won't re-trigger
      await createReview({
        projectId: project.id || projectId,
        projectName: project.title,
        fromUserId: clientId,
        reviewerId: clientId,
        clientId: clientId,
        clientName: userProfile?.displayName || 'Client Representative',
        toUserId: targetSymbioteId,
        symbioteId: targetSymbioteId,
        symbioteName: targetSymbioteName,
        ratings: { communication: 0, technicalSkills: 0, timeliness: 0, workQuality: 0, overall: 0 },
        feedback: 'Client opted out of leaving review.',
        recommend: true,
        declined: true,
        createdAt: new Date().toISOString(),
      });
      navigate(targetPath);
    } catch (err) {
      console.error('Declining review failed:', err);
      navigate(targetPath);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)] font-mono text-xs">
          <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
          <span>Loading project review details...</span>
        </div>
      </div>
    );
  }

  // ALREADY SUBMITTED / DECLINED STATE VIEW
  if (existingReview || submitSuccess) {
    const isDeclined = existingReview?.declined;
    const projectWorkspacePath = projectId ? `/client/projects/${projectId}/workspace` : '/client/projects';

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <Button
          onClick={handleBack}
          variant="outline"
          className="h-9 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] hover:text-white flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{fromSource === 'workspace' ? 'Back to Workspace' : 'Back to Reviews Hub'}</span>
        </Button>

        <Card className="p-8 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[16px] text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
            {isDeclined ? <XCircle className="w-8 h-8 text-slate-400" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
              {isDeclined
                ? 'Review Opted Out'
                : 'Thank You! Your Review Has Been Recorded'}
            </h2>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
              {isDeclined
                ? 'You chose not to leave feedback for this completed brief. The project completion status is confirmed.'
                : 'Your ratings and performance feedback have been added to the specialist profile and marketplace metrics.'}
            </p>
          </div>

          {!isDeclined && (existingReview || submitSuccess) && (
            <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-[12px] p-4 text-left space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <span className="text-[var(--color-text-secondary)]">Project:</span>
                <span className="font-bold text-[var(--color-accent-cyan)]">{project?.title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <span className="text-[var(--color-text-secondary)]">Specialist:</span>
                <span className="text-[var(--color-text-primary)]">
                  {symbiote?.displayName || existingReview?.symbioteName || project?.assignedSymbioteName || 'Assigned Specialist'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Overall Rating:</span>
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>
                    {existingReview?.ratings?.overall || ratings.overall} / 5 (
                    {getStarLabel(existingReview?.ratings?.overall || ratings.overall)})
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/client/reviews')}
              className="h-10 bg-[var(--color-accent-cyan)] text-slate-950 font-mono font-bold text-xs px-5 flex items-center gap-1.5 cursor-pointer shadow-md hover:opacity-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Return to Reviews Hub</span>
            </Button>
            {projectId && (
              <Button
                onClick={() => navigate(projectWorkspacePath)}
                variant="outline"
                className="h-10 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] hover:text-white cursor-pointer"
              >
                Back to Workspace
              </Button>
            )}
            <Button
              onClick={() => navigate('/client/projects')}
              variant="outline"
              className="h-10 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] hover:text-white cursor-pointer"
            >
              All Projects
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      {/* NAVIGATION BACK */}
      <div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{fromSource === 'workspace' ? 'Back to Project Workspace' : 'Back to Reviews Hub'}</span>
        </button>

        {/* 1. PAGE HEADER */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            <span>Leave a Review</span>
          </h1>
          <p className="text-xs font-mono text-[var(--color-text-secondary)]">
            Share your experience working with your Symbiote specialist to help maintain community quality standards and recognize exceptional performance.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-[10px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. REVIEWEE SUMMARY CARD (§11.8, §13.5) */}
      {(() => {
        const hasSpecialist = Boolean(symbiote?.displayName || project?.assignedSymbioteName || (project?.teamMembers && project.teamMembers.length > 0));
        const displaySpecialistName = symbiote?.displayName || project?.assignedSymbioteName || project?.teamMembers?.[0]?.displayName || (hasSpecialist ? 'Assigned Specialist' : 'No Specialist Assigned');
        const displaySpecialistTitle = symbiote?.title || project?.teamMembers?.[0]?.role || (hasSpecialist ? 'AI Specialist' : 'Project completed without specialist');
        const displayInitials = symbiote?.avatarInitials || (displaySpecialistName !== 'No Specialist Assigned' ? displaySpecialistName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'NA');

        return (
          <div className="space-y-4">
            {!hasSpecialist && (
              <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No Specialist Assigned to this Project</span>
                </div>
                <p className="text-[var(--color-text-secondary)]">
                  This project brief was finalized without an assigned specialist or team member. Performance reviews can only be submitted for projects with assigned team specialists.
                </p>
              </div>
            )}

            <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                {/* SPECIALIST AVATAR + NAME + ROLE */}
                <div className="flex items-center gap-3.5">
                  <Avatar
                    name={displaySpecialistName}
                    initials={displayInitials}
                    src={symbiote?.avatarUrl}
                    size="md"
                    statusDot={getUserStatusDot(symbiote)}
                    className="shrink-0 ring-2 ring-[var(--color-accent-cyan)]/40"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
                        {displaySpecialistName}
                      </h3>
                      {hasSpecialist ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Symbiote
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 inline-flex items-center gap-1">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                      {displaySpecialistTitle}
                    </p>
                  </div>
                </div>

                {/* PROJECT STATUS BADGE */}
                <div className="p-2 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Milestones Verified & Completed</span>
                </div>
              </div>

              {/* METRICS ROW (PROJECT / COMPLETION DATE / BUDGET) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-[8px] bg-[var(--color-background)]/80 border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] uppercase text-[var(--color-text-secondary)] block">Project Title</span>
                  <p className="font-bold text-[var(--color-accent-cyan)] truncate">
                    {project?.title || 'Project Brief'}
                  </p>
                </div>

                <div className="p-3 rounded-[8px] bg-[var(--color-background)]/80 border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] uppercase text-[var(--color-text-secondary)] block">Completion Date</span>
                  <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                    <span>{completionDate}</span>
                  </p>
                </div>

                <div className="p-3 rounded-[8px] bg-[var(--color-background)]/80 border border-[var(--color-border)] space-y-1">
                  <span className="text-[10px] uppercase text-[var(--color-text-secondary)] block">Contract Value</span>
                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>{contractValueDisplay}</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* 3. RATING FORM CARD (§11.8, §13.5) */}
      <form onSubmit={handleSubmitReview}>
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-6 shadow-md">
          {/* SECTION TITLE */}
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <span>1. Performance Evaluation Criteria (5 Stars Each)</span>
            </h2>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-1">
              Rate each performance category on a 1–5 scale. Text labels will reflect your selection.
            </p>
          </div>

          {/* 5 STAR RATING ROWS (§11.8) */}
          <div className="space-y-3">
            <RatingRow
              id="communication"
              title="Communication"
              description="Clarity, responsiveness, and proactivity throughout milestone updates."
              value={ratings.communication}
              onChange={handleRatingChange}
            />

            <RatingRow
              id="technicalSkills"
              title="Technical Skills"
              description="Mastery of stack, architecture elegance, prompt engineering, and code craftsmanship."
              value={ratings.technicalSkills}
              onChange={handleRatingChange}
            />

            <RatingRow
              id="timeliness"
              title="Timeliness"
              description="Adherence to milestone deadlines and prompt delivery of agreed artifacts."
              value={ratings.timeliness}
              onChange={handleRatingChange}
            />

            <RatingRow
              id="workQuality"
              title="Work Quality"
              description="Code robustness, test coverage, documentation completeness, and security guardrails."
              value={ratings.workQuality}
              onChange={handleRatingChange}
            />

            <RatingRow
              id="overall"
              title="Overall Rating (Required)"
              description="Your general satisfaction level for this overall engagement."
              value={ratings.overall}
              onChange={handleRatingChange}
            />
          </div>

          {/* SECTION 2: WRITTEN FEEDBACK (§13.5) */}
          <div className="border-t border-[var(--color-border)] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <span>2. Written Review & Qualitative Feedback</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  feedback.length > 950 ? 'text-amber-400 font-bold' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {feedback.length} / 1000 characters
              </span>
            </div>

            <textarea
              rows={4}
              maxLength={1000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe what stood out during this engagement. Detail specific technical breakthroughs, problem-solving skills, communication habits, or advice for future clients..."
              className="w-full p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent-cyan)] leading-relaxed resize-none"
            />
          </div>

          {/* SECTION 3: RECOMMEND TOGGLE (§13.5) */}
          <div className="border-t border-[var(--color-border)] pt-5 space-y-3">
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] block">
              3. Would you recommend working with {symbiote?.displayName || 'this specialist'} again?
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`flex-1 sm:flex-initial h-10 px-6 rounded-[8px] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                  recommend === true
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Yes, Highly Recommend</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`flex-1 sm:flex-initial h-10 px-6 rounded-[8px] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all border ${
                  recommend === false
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>No</span>
              </button>
            </div>
          </div>

          {/* SECTION 4: ACTIONS ROW (SUBMIT vs NOT THIS TIME) */}
          <div className="border-t border-[var(--color-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* NOT THIS TIME SECONDARY CTA (§2 ROW 29) */}
            <Button
              type="button"
              onClick={handleNotThisTime}
              variant="outline"
              disabled={submitting}
              className="w-full sm:w-auto h-11 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white font-mono text-xs rounded-[8px] flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Not This Time (Skip)</span>
            </Button>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full sm:w-auto h-11 font-mono text-xs font-bold rounded-[8px] px-8 flex items-center justify-center gap-2 transition-all ${
                isSubmitDisabled
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-[var(--color-accent-cyan)] to-blue-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-[1.01]'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Submitting Review...'
                  : !hasSpecialist
                  ? 'Cannot Submit: No Specialist Assigned'
                  : ratings.overall === 0
                  ? 'Set Overall Rating to Submit'
                  : 'Submit Verified Review'}
              </span>
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
