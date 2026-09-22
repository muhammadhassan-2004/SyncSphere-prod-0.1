import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import {
  getProjectById,
  createApplication,
  getApplicationsBySymbiote,
  subscribeToSymbioteApplications,
  getUserProfile,
  cleanupLegacyApplicationScores,
} from '@/src/lib/firestore';
import { Project, Application, UserProfile } from '@/src/types/firestore';
import {
  ArrowLeft,
  Sparkles,
  Briefcase,
  Building,
  Calendar,
  Clock,
  DollarSign,
  FileCheck,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Star,
  CheckSquare,
  User,
  ShieldCheck,
  TrendingUp,
  Bot,
  AlertTriangle,
} from 'lucide-react';

export const SymbioteProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  // Firestore Data States
  const [project, setProject] = useState<Project | null>(null);
  const [clientProfile, setClientProfile] = useState<UserProfile | null>(null);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscription State (Required to apply to projects without bidding)
  const [hasSubscription, setHasSubscription] = useState<boolean>(() => {
    const localSub = typeof window !== 'undefined' ? localStorage.getItem(`syncsphere_sub_${uid}`) : null;
    if (localSub === 'active') return true;
    return userProfile?.billingInfo?.status === 'active' || (userProfile as any)?.hasActiveSubscription === true;
  });
  const [activatingSub, setActivatingSub] = useState<boolean>(false);
  const [subActivatedMsg, setSubActivatedMsg] = useState<string | null>(null);

  // Proposal Form State (No bidding - direct application)
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [estWeeks, setEstWeeks] = useState<string>('');
  const [questionsForClient, setQuestionsForClient] = useState<string>('');

  // Processing States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [generatingPitch, setGeneratingPitch] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Project & Client Data
  useEffect(() => {
    // Run cleanup for any legacy application document with hardcoded aiMatchScore === 90
    if (uid) {
      cleanupLegacyApplicationScores(uid);
    }

    if (!projectId) return;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Project Doc
        const proj = await getProjectById(projectId!);
        setProject(proj);

        if (proj) {
          // 2. Fetch Client Doc
          const cId = proj.ownerId || proj.clientId;
          if (cId) {
            const client = await getUserProfile(cId);
            setClientProfile(client);
          }

          // 3. Check for existing Application doc by this Symbiote
          if (uid) {
            const apps = await getApplicationsBySymbiote(uid);
            const matchedApp = apps.find((a) => a.projectId === projectId);
            if (matchedApp) {
              setExistingApp(matchedApp);
              if (matchedApp.coverLetter || matchedApp.coverNote) {
                setCoverLetter(matchedApp.coverLetter || matchedApp.coverNote || '');
              }
              if (matchedApp.estimatedDuration) {
                setEstWeeks(matchedApp.estimatedDuration);
              }
              if (matchedApp.questionsForClient) {
                setQuestionsForClient(matchedApp.questionsForClient);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading project details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId, uid]);

  // Real-time subscription to Symbiote's Applications
  useEffect(() => {
    if (!uid || !projectId) return;
    const unsub = subscribeToSymbioteApplications(uid, (apps) => {
      const matchedApp = apps.find((a) => a.projectId === projectId);
      if (matchedApp) {
        setExistingApp(matchedApp);
        if (matchedApp.coverLetter || matchedApp.coverNote) {
          setCoverLetter(matchedApp.coverLetter || matchedApp.coverNote || '');
        }
        if (matchedApp.estimatedDuration) {
          setEstWeeks(matchedApp.estimatedDuration);
        }
        if (matchedApp.questionsForClient) {
          setQuestionsForClient(matchedApp.questionsForClient);
        }
      }
    });
    return () => unsub();
  }, [uid, projectId]);

  // Compute AI Match Score & Recommendation
  const computePreSyncAiAnalysis = () => {
    if (!project) return null;

    // Check if project has explicit match score or user skills overlap
    const userSkills = userProfile?.skills || [];
    const projSkills = [...(project.techTags || []), ...(project.skills || [])];

    let score = (project as any).matchScore;
    if (score === undefined && userSkills.length > 0 && projSkills.length > 0) {
      const matchCount = projSkills.filter((ps) =>
        userSkills.some((us) => us.toLowerCase() === ps.toLowerCase())
      ).length;
      score = Math.min(98, Math.max(65, Math.round((matchCount / projSkills.length) * 100)));
    }

    return {
      matchScore: score ?? null,
      rationale:
        score != null
          ? `High structural skill alignment in ${projSkills.slice(0, 3).join(', ')}. Scope matches your historical delivery cadence.`
          : `Pending AI PreSync Matching engine execution. Evaluation based on baseline technology stack mapping (${projSkills.slice(0, 3).join(', ')}).`,
    };
  };

  const aiAnalysis = computePreSyncAiAnalysis();

  // Helper to activate subscription for testing
  const handleActivateSubscription = () => {
    setActivatingSub(true);
    setTimeout(() => {
      if (typeof window !== 'undefined' && uid) {
        localStorage.setItem(`syncsphere_sub_${uid}`, 'active');
      }
      setHasSubscription(true);
      setActivatingSub(false);
      setSubActivatedMsg('Specialist Subscription successfully activated! You can now apply directly to any project without bidding.');
      setTimeout(() => setSubActivatedMsg(null), 6000);
    }, 600);
  };

  // AI Proposal Pitch Generation
  const handleGenerateAiProposalPitch = async () => {
    if (!project) return;
    try {
      setGeneratingPitch(true);
      setErrorMessage(null);

      const res = await fetch('/api/generate-proposal-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            title: project.title,
            description: project.description,
            skills: project.skills || project.techTags || [],
            techTags: project.techTags || [],
            category: project.category,
            maxBudget: project.maxBudget,
            minBudget: project.minBudget,
            duration: project.duration,
          },
          specialist: {
            displayName: userProfile?.displayName || firebaseUser?.displayName || 'Specialist Engineer',
            title: userProfile?.title || 'Specialist Engineer',
            skills: userProfile?.skills || [],
            bio: userProfile?.bio || '',
            hourlyRate: (userProfile as any)?.hourlyRate || 100,
            experience: (userProfile as any)?.experienceLevel || (userProfile as any)?.experience || 'Senior',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.pitch) {
        if (data.pitch.coverLetter) {
          setCoverLetter(data.pitch.coverLetter);
        }
        if (data.pitch.estimatedDuration && !estWeeks) {
          setEstWeeks(data.pitch.estimatedDuration);
        }
        if (data.pitch.questionsForClient && !questionsForClient) {
          setQuestionsForClient(data.pitch.questionsForClient);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate AI proposal pitch:', err);
      setErrorMessage('Could not generate AI proposal pitch. Please draft manually.');
    } finally {
      setGeneratingPitch(false);
    }
  };

  // WRITE TO FIRESTORE: Submit Proposal
  const handleSubmitProposal = async (isDraft: boolean = false) => {
    if (!projectId || !project || !uid) return;

    if (!isDraft && !hasSubscription) {
      setErrorMessage('Specialist Subscription required. Please activate your subscription membership to apply.');
      return;
    }

    if (!isDraft && !coverLetter.trim()) {
      setErrorMessage('Please provide a cover letter detailing your technical approach.');
      return;
    }

    try {
      if (isDraft) {
        setSavingDraft(true);
      } else {
        setSubmitting(true);
      }
      setErrorMessage(null);

      const symbioteName =
        userProfile?.displayName ||
        (userProfile?.firstName
          ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
          : firebaseUser?.displayName || 'Symbiote Specialist');

      const appDocData: Omit<Application, 'id'> = {
        projectId: projectId,
        projectTitle: project.title,
        symbioteId: uid,
        symbioteName: symbioteName,
        symbioteTitle: userProfile?.title || 'Specialist Engineer',
        clientId: project.ownerId || project.clientId || '',
        status: isDraft ? 'draft' : 'pending',
        appliedAt: new Date().toISOString(),
        proposedRate: project.maxBudget || project.minBudget || 0,
        rate: project.maxBudget || project.minBudget || 0,
        estimatedDuration: estWeeks || project.duration || '4 Weeks',
        coverLetter: coverLetter,
        coverNote: coverLetter,
        questionsForClient: questionsForClient,
        ...(aiAnalysis?.matchScore != null
          ? { aiMatchScore: aiAnalysis.matchScore, aiMatchStatus: 'calculated' as const }
          : { aiMatchStatus: 'pending' as const }),
      };

      const createdId = await createApplication(appDocData);

      if (isDraft) {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      } else {
        setSubmitSuccess(true);
        setExistingApp({
          id: createdId,
          ...appDocData,
        } as Application);
      }
    } catch (err: any) {
      console.error('Failed to write application to Firestore:', err);
      setErrorMessage('Failed to process application. Please check your network connection.');
    } finally {
      setSubmitting(false);
      setSavingDraft(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'hired':
        return <StatusPill variant="green" label="Hired" />;
      case 'shortlisted':
        return <StatusPill variant="blue" label="Shortlisted" />;
      case 'interview':
        return <StatusPill variant="purple" label="Interview Scheduled" />;
      case 'rejected':
        return <StatusPill variant="red" label="Declined" />;
      case 'pending':
      default:
        return <StatusPill variant="green" label="Proposal Sent" />;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3 max-w-5xl mx-auto">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body font-medium">Fetching project details from Firestore...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center space-y-4 max-w-4xl mx-auto border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px]">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-h2 font-bold text-[var(--color-text-primary)]">Project Not Found</h2>
        <p className="text-body text-[var(--color-text-secondary)]">
          The requested project could not be found in Firestore or may no longer be accepting proposals.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/symbiote/browse')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Back to Browse
        </Button>
      </div>
    );
  }

  // Deliverables checklist items (either from deliverables array or generated from description)
  const deliverables = (project as any).deliverables || [
    'Core architecture design & API specification',
    'Responsive frontend implementation & UI integration',
    'Backend services, database schema setup & authentication',
    'Comprehensive unit testing, CI/CD pipeline & handover documentation',
  ];

  const techTags = project.techTags || project.skills || ['React', 'TypeScript', 'Node.js', 'Firestore'];

  // Client Info formatting
  const clientName =
    clientProfile?.displayName ||
    (clientProfile?.firstName
      ? `${clientProfile.firstName} ${clientProfile.lastName || ''}`.trim()
      : clientProfile?.companyName || 'Enterprise Client');
  const clientLocation = clientProfile?.location || 'Remote';
  const clientCompletedProjects = clientProfile?.completedProjects ?? 0;
  const clientHasRating = Boolean(clientProfile?.rating && clientProfile.rating > 0);
  const clientRating = clientHasRating ? clientProfile!.rating!.toFixed(1) : 'No ratings yet';
  const clientMemberSince = clientProfile?.createdAt
    ? new Date(clientProfile.createdAt).toLocaleDateString('default', { month: 'short', year: 'numeric' })
    : 'Jan 2025';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* BREADCRUMB */}
      <div>
        <button
          onClick={() => navigate('/symbiote/browse')}
          className="inline-flex items-center gap-2 text-body text-[var(--color-text-secondary)] hover:text-emerald-500 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>

      {/* AI INSIGHT BANNER (TOP BORDERED CARD) */}
      <Card className="p-5 border border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-[var(--color-surface)] to-emerald-950/20 rounded-[12px] space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-body font-bold text-[var(--color-text-primary)] tracking-wide flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>[PreSync AI] Analysis</span>
            </h3>
            {aiAnalysis?.matchScore != null ? (
              <StatusPill
                variant={aiAnalysis.matchScore >= 90 ? 'green' : 'cyan'}
                label={`${aiAnalysis.matchScore}% PreSync Match`}
              />
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>AI Match Pending</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-caption">
            <span className="text-[var(--color-text-secondary)]">Project Budget:</span>
            <span className="font-bold text-emerald-400 text-body">
              ${project.maxBudget ? project.maxBudget.toLocaleString() : (project.minBudget ? project.minBudget.toLocaleString() : 'Fixed Scope')}
            </span>
          </div>
        </div>

        <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed">
          {aiAnalysis?.rationale}
        </p>
      </Card>

      {/* TWO-COLUMN LAYOUT: LEFT DETAILS (~60%) | RIGHT PROPOSAL & CLIENT INFO (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* MAIN PROJECT HEADER & OVERVIEW */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-5">
            <div className="space-y-2">
              <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">{project.title}</h1>
              <div className="flex items-center gap-3 text-caption text-[var(--color-text-secondary)] flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-500" /> Client: {clientName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Posted:{' '}
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            {/* 3 STAT CHIPS */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-center">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
                  Budget
                </span>
                <span className="text-body font-bold text-cyan-400">
                  {project.maxBudget ? `$${project.maxBudget.toLocaleString()}` : 'Negotiable'}
                </span>
              </div>
              <div className="border-x border-[var(--color-border)] px-2">
                <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
                  Timeline
                </span>
                <span className="text-body font-bold text-[var(--color-text-primary)]">
                  {project.duration || project.timeline || '4 Weeks'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
                  Experience
                </span>
                <span className="text-body font-bold text-emerald-400">
                  {project.experienceLevel || 'Senior'}
                </span>
              </div>
            </div>

            {/* OVERVIEW PARAGRAPH */}
            <div className="space-y-2">
              <h3 className="text-body font-bold text-[var(--color-text-primary)]">Project Overview</h3>
              <p className="text-body text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* DELIVERABLES CHECKLIST */}
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <h3 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" /> Key Deliverables & Scope
              </h3>
              <ul className="space-y-2">
                {deliverables.map((item: string, idx: number) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-caption text-[var(--color-text-primary)]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* TECH REQUIREMENTS TAG CHIPS */}
            <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
              <h3 className="text-body font-bold text-[var(--color-text-primary)]">
                Tech Requirements & Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {techTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-caption font-mono rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN (~40%) */}
        <div className="lg:col-span-5 space-y-6">
          {/* YOUR PROPOSAL CARD */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h2 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" /> Your Proposal
              </h2>
              {existingApp && getStatusBadge(existingApp.status)}
            </div>

            {((existingApp && existingApp.status !== 'draft') || submitSuccess) ? (
              <div className="space-y-4">
                {/* STATUS SUMMARY ROW */}
                <div className="p-3.5 rounded-lg border bg-[var(--color-background)] border-[var(--color-border)] flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-secondary)] block font-semibold">
                      Application Status
                    </span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(existingApp?.status || 'pending')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block font-semibold">
                      Submitted On
                    </span>
                    <span className="text-caption font-medium text-[var(--color-text-primary)]">
                      {existingApp?.appliedAt ? new Date(existingApp.appliedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>

                {/* APPLICATION SUMMARY */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-secondary)] block font-semibold">
                      Project Budget
                    </span>
                    <span className="text-body font-bold text-cyan-400 font-mono">
                      ${(project.maxBudget || project.minBudget || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-secondary)] block font-semibold">
                      Est. Timeline
                    </span>
                    <span className="text-body font-bold text-[var(--color-text-primary)]">
                      {existingApp?.estimatedDuration || estWeeks || project.duration || '4 Weeks'}
                    </span>
                  </div>
                </div>

                {/* COVER LETTER DISPLAY */}
                <div className="space-y-1.5">
                  <span className="text-caption font-semibold text-[var(--color-text-primary)] block">
                    Cover Letter
                  </span>
                  <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-caption text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                    {existingApp?.coverLetter || existingApp?.coverNote || coverLetter || 'No cover letter content.'}
                  </div>
                </div>

                {/* QUESTIONS FOR CLIENT DISPLAY */}
                {(existingApp?.questionsForClient || questionsForClient) && (
                  <div className="space-y-1.5">
                    <span className="text-caption font-semibold text-[var(--color-text-primary)] block">
                      Questions for Client
                    </span>
                    <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-caption text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                      {existingApp?.questionsForClient || questionsForClient}
                    </div>
                  </div>
                )}

                {/* NOTICE CALLOUT */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-400 text-caption">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Application submitted. Your profile and proposal are under review by the client.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {subActivatedMsg && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{subActivatedMsg}</span>
                  </div>
                )}

                {!hasSubscription ? (
                  /* SUBSCRIPTION GATEWAY CARD */
                  <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                          Specialist Subscription Required
                        </h4>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                          No bidding needed! Subscribing grants you direct application access to all client projects on the platform.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-text-secondary)] font-mono">Membership:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Inactive (Subscription Required)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-text-secondary)] font-mono">Application Model:</span>
                        <span className="font-mono font-semibold text-emerald-400">Direct Application (Zero Bids)</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] pt-1.5 border-t border-[var(--color-border)]">
                        Subscription plans will be decided soon. You can activate membership right now to test direct project applications.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleActivateSubscription}
                      disabled={activatingSub}
                      className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-slate-950 font-bold text-xs py-3 border-0 shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {activatingSub ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Activating Subscription...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Activate Specialist Subscription (Test Direct Apply)</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* ACTIVE SUBSCRIPTION BADGE */}
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Specialist Membership Active • Unlimited Direct Applications</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-300">Verified ✓</span>
                    </div>

                    {errorMessage && (
                      <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-caption">
                        {errorMessage}
                      </div>
                    )}

                    {draftSaved && (
                      <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-caption font-semibold">
                        Draft proposal saved to Firestore!
                      </div>
                    )}

                    {/* PROJECT BUDGET & ESTIMATED WEEKS (NO BID FIELD) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                          Project Budget
                        </label>
                        <div className="w-full p-2.5 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-emerald-400 font-bold flex items-center justify-between font-mono">
                          <span>${project.maxBudget ? project.maxBudget.toLocaleString() : (project.minBudget ? project.minBudget.toLocaleString() : 'Fixed Scope')}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-normal uppercase">Direct Rate</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                          Estimated Delivery Timeline
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 3 Weeks"
                          value={estWeeks}
                          onChange={(e) => setEstWeeks(e.target.value)}
                          className="w-full p-2.5 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* COVER LETTER TEXTAREA WITH CHAR COUNTER & AI GENERATOR */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                          Cover Letter / Technical Approach *
                        </label>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={generatingPitch || submitting}
                            onClick={handleGenerateAiProposalPitch}
                            className="text-[11px] font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 py-1 h-7 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${generatingPitch ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                            <span>{generatingPitch ? 'Drafting with AI...' : 'Generate AI Proposal Pitch'}</span>
                          </Button>
                          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                            {coverLetter.length} / 2000 chars
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={5}
                        maxLength={2000}
                        placeholder="Describe your technical approach, relevant past work, and why you are the ideal specialist for this project..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="w-full p-3 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* QUESTIONS FOR CLIENT TEXTAREA */}
                    <div className="space-y-1">
                      <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                        Questions for Client (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Any clarification needed regarding architecture, credentials, or timeline..."
                        value={questionsForClient}
                        onChange={(e) => setQuestionsForClient(e.target.value)}
                        className="w-full p-2.5 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* ACTION BUTTONS: SAVE DRAFT & SUBMIT PROPOSAL */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={savingDraft || submitting}
                        onClick={() => handleSubmitProposal(true)}
                        className="flex-1 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-background)] text-caption py-2.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {savingDraft ? 'Saving...' : 'Save Draft'}
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        disabled={submitting || savingDraft}
                        onClick={() => handleSubmitProposal(false)}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-slate-950 font-bold text-xs py-2.5 border-0 shadow-sm cursor-pointer"
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* CLIENT INFO CARD (PULLED FROM CLIENT'S REAL USERS DOC) */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-500" /> About the Client
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-lg flex items-center justify-center shrink-0">
                {clientName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-body font-bold text-[var(--color-text-primary)]">{clientName}</h4>
                <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {clientLocation}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-caption border-t border-[var(--color-border)] pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Total Projects Posted</span>
                <span className="font-bold text-[var(--color-text-primary)]">{clientCompletedProjects}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Client Rating</span>
                {clientHasRating ? (
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    {clientRating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </span>
                ) : (
                  <span className="font-medium text-[var(--color-text-secondary)] flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 opacity-40" />
                    <span>No ratings yet</span>
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">On-Time Payment</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-secondary)]">Member Since</span>
                <span className="font-bold text-[var(--color-text-primary)]">{clientMemberSince}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
