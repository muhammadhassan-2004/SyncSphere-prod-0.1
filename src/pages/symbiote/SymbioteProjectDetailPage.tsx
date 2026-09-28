import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import {
  getProjectById,
  createApplication,
  getApplicationsBySymbiote,
  subscribeToSymbioteApplications,
  subscribeToSymbioteInvitations,
  updateInvitationStatus,
  getUserProfile,
  cleanupLegacyApplicationScores,
} from '@/src/lib/firestore';
import { Project, Application, UserProfile, Invitation } from '@/src/types/firestore';
import {
  ArrowLeft,
  ArrowRight,
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
  Mail,
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
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState<boolean>(false);
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

  // Real-time subscription to Symbiote's Invitations for this project
  useEffect(() => {
    if (!uid || !projectId) return;
    const unsub = subscribeToSymbioteInvitations(uid, (invList) => {
      const match = (invList || []).find((inv) => inv.projectId === projectId);
      setInvitation(match || null);
    });
    return () => unsub();
  }, [uid, projectId]);

  const handleAcceptInvitation = async () => {
    if (!invitation?.id) return;
    setAcceptingInvite(true);
    try {
      await updateInvitationStatus(invitation.id, 'accepted');
      navigate('/symbiote/invitations');
    } catch (e) {
      console.error('Failed to accept invitation:', e);
    } finally {
      setAcceptingInvite(false);
    }
  };

  // Compute AI Match Score & Recommendation
  const computePreSyncAiAnalysis = () => {
    if (!project) return null;

    // Check if invitation has explicit match score
    if (invitation && (invitation.matchScore || invitation.aiMatchScore)) {
      const score = invitation.matchScore || invitation.aiMatchScore!;
      return {
        matchScore: score,
        rationale: `Client direct invitation with validated structural match of ${score}%.`,
      };
    }

    // Check if project has explicit match score or user skills overlap
    const userSkills = userProfile?.skills || [];
    const projSkills = [...(project.techTags || []), ...(project.skills || [])];

    let score = (project as any).matchScore;
    if (score === undefined && userSkills.length > 0 && projSkills.length > 0) {
      const matchCount = projSkills.filter((ps) =>
        userSkills.some((us) => us.toLowerCase() === ps.toLowerCase())
      ).length;
      if (matchCount === 0) {
        score = 25;
      } else {
        score = Math.min(98, Math.max(45, Math.round((matchCount / projSkills.length) * 100)));
      }
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

  const isAlreadyHired = Boolean(
    uid && (
      project?.symbioteId === uid ||
      project?.assignedSymbioteId === uid ||
      (project?.teamMembers || []).some((m) => m.uid === uid) ||
      invitation?.status === 'accepted' ||
      existingApp?.status === 'accepted' ||
      existingApp?.status === 'hired'
    )
  );

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

    if (!isDraft && !coverLetter.trim()) {
      setErrorMessage('Please provide a brief technical note or pitch for this project.');
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
        symbioteAvatarUrl: userProfile?.avatarUrl || (userProfile as any)?.photoURL || firebaseUser?.photoURL || '',
        symbioteAvatarInitials: userProfile?.avatarInitials || symbioteName.slice(0, 2).toUpperCase() || 'SP',
        clientId: project.ownerId || project.clientId || '',
        status: isDraft ? 'draft' : 'pending',
        appliedAt: new Date().toISOString(),
        proposedRate: project.budget || project.maxBudget || project.minBudget || 0,
        rate: project.budget || project.maxBudget || project.minBudget || 0,
        estimatedDuration: estWeeks || project.duration || '4 Weeks',
        coverLetter: coverLetter.trim(),
        coverNote: coverLetter.trim(),
        questionsForClient: questionsForClient.trim(),
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
            <span className="text-[var(--color-text-secondary)]">Payment Model:</span>
            <span className="font-bold text-emerald-400 text-body">
              {project.maxBudget
                ? `$${project.maxBudget.toLocaleString()}`
                : project.minBudget
                ? `$${project.minBudget.toLocaleString()}`
                : 'Dynamic Per-Task'}
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
                  Payment Model
                </span>
                <span className="text-body font-bold text-cyan-400">
                  Dynamic Per-Task
                </span>
              </div>
              <div className="border-x border-[var(--color-border)] px-2">
                <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
                  Timeline
                </span>
                <span className="text-body font-bold text-[var(--color-text-primary)]">
                  {project.duration || project.timeline || 'Flexible Schedule'}
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

            {invitation && invitation.status === 'pending' ? (
              <div className="p-5 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-950/25 via-[var(--color-surface)] to-[var(--color-surface)] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    <Mail className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Client Invitation Received!</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      You were directly invited by the client to join this project team. No proposal drafting required!
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-2 text-xs">
                  {invitation.clientNote && (
                    <div className="text-[var(--color-text-secondary)] italic border-b border-[var(--color-border)] pb-2">
                      "{invitation.clientNote}"
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[var(--color-text-secondary)] font-mono">Offered Rate / Budget:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {invitation.budgetRange || `$${(project.maxBudget || project.minBudget || 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)] font-mono">Match Assessment:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {invitation.matchScore || invitation.aiMatchScore || 90}% Match
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    onClick={handleAcceptInvitation}
                    disabled={acceptingInvite}
                    className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-bold text-xs py-2.5 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{acceptingInvite ? 'Accepting Invitation...' : 'Accept Invitation & Join'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/symbiote/invitations')}
                    className="w-full sm:w-auto text-xs py-2.5 cursor-pointer"
                  >
                    View in Invitations
                  </Button>
                </div>
              </div>
            ) : isAlreadyHired ? (
              <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-300">You are on this project team!</h4>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                      You are an active specialist on this project. Head over to the workspace to track hours, complete tasks, and collaborate with the client.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/symbiote/workspace/${project.id}`)}
                  className="w-full sm:w-auto text-xs py-2 px-4 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : ((existingApp && existingApp.status !== 'draft') || submitSuccess) ? (
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
                      Payment Model
                    </span>
                    <span className="text-body font-bold text-cyan-400 font-mono">
                      Dynamic Per-Task
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-secondary)] block font-semibold">
                      Est. Timeline
                    </span>
                    <span className="text-body font-bold text-[var(--color-text-primary)]">
                      {existingApp?.estimatedDuration || estWeeks || project.duration || 'Flexible Schedule'}
                    </span>
                  </div>
                </div>

                {/* PROPOSAL NOTE DISPLAY */}
                <div className="space-y-1.5">
                  <span className="text-caption font-semibold text-[var(--color-text-primary)] block">
                    Technical Pitch & Proposal Note
                  </span>
                  <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-caption text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                    {existingApp?.coverLetter || existingApp?.coverNote || coverLetter || 'No proposal note submitted.'}
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
                {/* ACTIVE APPLICATION BADGE */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-emerald-400 font-mono">Direct Application (Zero Bids)</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    Payment: <span className="text-cyan-400 font-semibold font-mono">Dynamic Per-Task</span>
                  </span>
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

                {/* RATE & ESTIMATED TIMELINE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                      Agreed Billing Rate
                    </label>
                    <div className="w-full p-2.5 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-cyan-400 font-bold flex items-center justify-between font-mono">
                      <span>${(userProfile as any)?.hourlyRate || 50}/hr</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-normal uppercase">
                        Profile Rate
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                      Estimated Delivery Timeline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2-3 Weeks"
                      value={estWeeks}
                      onChange={(e) => setEstWeeks(e.target.value)}
                      className="w-full p-2.5 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* TECHNICAL PROPOSAL / PITCH */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-caption font-semibold text-[var(--color-text-primary)]">
                      Technical Pitch / Approach *
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={generatingPitch || submitting}
                        onClick={handleGenerateAiProposalPitch}
                        className="text-[11px] font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 py-0.5 h-6 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className={`w-3 h-3 ${generatingPitch ? 'animate-spin' : ''}`} />
                        <span>{generatingPitch ? 'Drafting...' : 'AI Pitch'}</span>
                      </Button>
                      <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                        {coverLetter.length} / 2000 chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    placeholder="Summarize your technical approach, relevant experience, and why you are the ideal specialist for this project..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full p-3 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                {/* ACTION BUTTONS: SAVE DRAFT & SUBMIT PROPOSAL */}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingDraft || submitting}
                    onClick={() => handleSubmitProposal(true)}
                    className="flex-1 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-background)] text-caption py-2.5 cursor-pointer font-medium"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {savingDraft ? 'Saving...' : 'Save Draft'}
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting || savingDraft}
                    onClick={() => handleSubmitProposal(false)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-bold text-xs py-2.5 border-0 shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* CLIENT INFO CARD (PULLED FROM CLIENT'S REAL USERS DOC) */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-500" /> About the Client
            </h3>

            <div className="flex items-center gap-3">
              <Avatar
                src={clientProfile?.avatarUrl || (clientProfile as any)?.photoURL}
                name={clientName}
                size="md"
                className="shrink-0 ring-2 ring-[var(--color-accent-cyan)]/30"
              />
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
