import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { Project } from '@/src/types/firestore';
import { getUserStatusDot } from '@/src/lib/utils/presence';
import {
  subscribeToProjectsByOwner,
  getProjectById,
} from '@/src/lib/firestore/projects';
import {
  saveProjectMatches,
  subscribeToProjectMatches,
  computeDeterministicMatchScore,
  ProjectMatch,
} from '@/src/lib/firestore/matches';
import { createInvitation, getInvitationsByClient } from '@/src/lib/firestore/invitations';
import { createNotification } from '@/src/lib/firestore/notifications';
import { getAllSymbiotesFromFirestore, subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { getPlatformOperationsSettings } from '@/src/lib/firestore/adminSettings';
import { SymbioteProfile } from '@/src/data/symbiotes';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  FolderKanban,
  Star,
  DollarSign,
  Clock,
  ArrowRight,
  Send,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShieldCheck,
  Award,
  X,
} from 'lucide-react';

export const AIMatchingPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || userProfile?.uid || '';
  const userName = userProfile?.displayName || firebaseUser?.displayName || 'Client';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ projectId?: string }>();

  // Determine active project ID from route param or search query param
  const queryProjectId = searchParams.get('projectId');
  const routeProjectId = routeParams.projectId;
  const activeProjectIdFromUrl = routeProjectId || queryProjectId || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectIdFromUrl);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(70);
  const [sortBy, setSortBy] = useState<'fit' | 'rate_asc' | 'rate_desc' | 'name'>('fit');
  const [realSymbiotes, setRealSymbiotes] = useState<SymbioteProfile[]>([]);
  const [invitedSymbioteIds, setInvitedSymbioteIds] = useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [matchNotification, setMatchNotification] = useState<string | null>(null);

  // Load min score threshold from Admin Platform Operations Settings
  useEffect(() => {
    async function loadOpsSettings() {
      try {
        const ops = await getPlatformOperationsSettings();
        if (ops && typeof ops.aiMatchingMinScore === 'number' && !isNaN(ops.aiMatchingMinScore)) {
          const clamped = Math.max(10, Math.min(100, Math.round(ops.aiMatchingMinScore)));
          setMinScoreThreshold(clamped);
        }
      } catch (err) {
        console.warn('Error loading platform ops settings for AI matching threshold:', err);
      }
    }
    loadOpsSettings();
  }, []);

  // Subscribe to real symbiotes from Firestore for accurate profile linking & live presence
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((users) => {
      setRealSymbiotes(users);
    });
    return () => unsub();
  }, []);

  // 1. Subscribe to Client Projects
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToProjectsByOwner(userId, (pList) => {
      setProjects(pList);

      // If no project selected yet, default to first project or match query
      if (!selectedProjectId && pList.length > 0) {
        const defaultProj = pList[0];
        if (defaultProj.id) {
          setSelectedProjectId(defaultProj.id);
        }
      }
    });

    return () => unsub();
  }, [userId, selectedProjectId]);

  // 2. Fetch or subscribe to selected project details
  useEffect(() => {
    let isMounted = true;
    async function loadProject() {
      if (!selectedProjectId) {
        setSelectedProject(null);
        return;
      }

      // Check if project is in loaded list first
      const foundInList = projects.find((p) => p.id === selectedProjectId);
      if (foundInList) {
        setSelectedProject(foundInList);
      } else {
        // Fetch from Firestore directly
        const fetched = await getProjectById(selectedProjectId);
        if (isMounted && fetched) {
          setSelectedProject(fetched);
        }
      }
    }

    loadProject();
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId, projects]);

  // 3. Load existing invitations for client to populate "Invited" button state
  useEffect(() => {
    if (!userId) return;
    async function loadExistingInvitations() {
      if (!userId) return;
      const invs = await getInvitationsByClient(userId);
      const projInvs = invs.filter((i) => i.projectId === selectedProjectId);
      const invitedSet = new Set(projInvs.map((i) => i.symbioteId));
      setInvitedSymbioteIds(invitedSet);
    }
    if (selectedProjectId) {
      loadExistingInvitations();
    }
  }, [userId, selectedProjectId]);

  // 4. Subscribe to matches in Firestore for selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setMatches([]);
      return;
    }

    setLoadingMatches(true);
    const unsubMatches = subscribeToProjectMatches(selectedProjectId, async (storedMatches) => {
      if (storedMatches && storedMatches.length > 0) {
        setMatches(storedMatches);
        setLoadingMatches(false);
      } else if (selectedProject) {
        // No matches in subcollection yet -> trigger initial AI generation!
        await runAIMatchGeneration(selectedProject);
      } else {
        setLoadingMatches(false);
      }
    });

    return () => unsubMatches();
  }, [selectedProjectId, selectedProject?.id]);

  // 5. Run AI Candidate Matching via Gemini API (/api/generate-matches)
  const runAIMatchGeneration = async (proj: Project) => {
    if (!proj || !proj.id) return;
    setLoadingMatches(true);
    setMatchNotification(null);

    try {
      const dbUsers = await getAllSymbiotesFromFirestore();
      const realCandidates: SymbioteProfile[] = dbUsers.map((u) => ({
        uid: u.uid,
        email: u.email || 'specialist@syncsphere.io',
        displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Symbiote Specialist',
        title: u.title || u.jobTitle || 'AI Specialist',
        avatarInitials: u.avatarInitials || u.displayName?.slice(0, 2).toUpperCase() || 'SP',
        avatarUrl: u.avatarUrl || (u as any).photoURL || '',
        rating: u.rating ?? 0,
        reviewsCount: u.reviewsCount || 0,
        completedProjects: u.completedProjects || 0,
        hourlyRate: u.hourlyRate || 150,
        experience: (u.experience as any) || 'Senior',
        availability: (u.availability as any) || 'Immediate',
        location: u.location || 'Remote',
        bio: u.bio || '',
        skills: u.skills || [],
      }));

      if (realCandidates.length === 0) {
        setMatches([]);
        setLoadingMatches(false);
        setMatchNotification('No registered Symbiote profiles found in Firestore to match against.');
        return;
      }

      const response = await fetch('/api/generate-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            id: proj.id,
            title: proj.title,
            category: proj.category || 'AI Engineering',
            skills: proj.skills || proj.techTags || ['Python', 'React', 'LangChain'],
            description: proj.description,
            budgetType: proj.budgetType,
            minBudget: proj.minBudget,
            maxBudget: proj.maxBudget,
          },
          candidates: realCandidates,
        }),
      });

      const data = await response.json();
      if (data.success && data.matches && data.matches.length > 0) {
        // Enriched matches with candidate profiles
        const enrichedMatches: ProjectMatch[] = data.matches.map((m: any) => {
          const candidate = realCandidates.find((s) => s.uid === m.symbioteId) || realCandidates[0];
          const score = typeof m.matchScore === 'number' ? m.matchScore : 50;
          return {
            projectId: proj.id!,
            symbioteId: candidate.uid,
            symbioteName: candidate.displayName,
            symbioteTitle: candidate.title,
            symbioteAvatarInitials: candidate.avatarInitials,
            symbioteAvatarUrl: candidate.avatarUrl || '',
            symbioteHourlyRate: candidate.hourlyRate,
            matchScore: score,
            subMetrics: {
              skillsMatch: typeof m.subMetrics?.skillsMatch === 'number' ? m.subMetrics.skillsMatch : score,
              experienceFit: typeof m.subMetrics?.experienceFit === 'number' ? m.subMetrics.experienceFit : Math.max(10, score - 2),
              availabilityFit: typeof m.subMetrics?.availabilityFit === 'number' ? m.subMetrics.availabilityFit : 85,
            },
            explanation: m.explanation || `${candidate.displayName} is recommended based on verified technical alignment.`,
            generatedAt: new Date().toISOString(),
          };
        });

        // Save generated matches to Firestore subcollection `projects/{projectId}/matches`
        await saveProjectMatches(proj.id, enrichedMatches);
        setMatches(enrichedMatches);
        setMatchNotification('AI Matching successfully recalculated via Gemini LLM!');
      } else {
        throw new Error('No matches returned from API');
      }
    } catch (err) {
      console.error('Error generating AI matches:', err);
      // Fetch real registered symbiotes from Firestore
      const dbUsers = await getAllSymbiotesFromFirestore();
      const rawProjSkills: any[] = [
        ...(Array.isArray(proj?.skills) ? proj.skills : []),
        ...(Array.isArray(proj?.techTags) ? proj.techTags : []),
      ];

      const scoredCandidates = dbUsers.map((cand) => {
        const computed = computeDeterministicMatchScore(cand, proj);
        return {
          cand,
          score: computed.matchScore,
          subMetrics: computed.subMetrics,
          explanation: computed.explanation,
        };
      });

      // Sort descending by score
      scoredCandidates.sort((a, b) => b.score - a.score);

      const fallbackMatches: ProjectMatch[] = scoredCandidates.slice(0, 4).map(({ cand, score, subMetrics, explanation }) => ({
        projectId: proj.id!,
        symbioteId: cand.uid,
        symbioteName: cand.displayName || `${cand.firstName || ''} ${cand.lastName || ''}`.trim() || 'AI Specialist',
        symbioteTitle: cand.title || cand.jobTitle || 'AI Specialist',
        symbioteAvatarInitials: cand.avatarInitials || cand.displayName?.slice(0, 2).toUpperCase() || 'SP',
        symbioteAvatarUrl: cand.avatarUrl || (cand as any).photoURL || '',
        symbioteHourlyRate: cand.hourlyRate || 150,
        matchScore: score,
        subMetrics,
        explanation,
        generatedAt: new Date().toISOString(),
      }));

      await saveProjectMatches(proj.id, fallbackMatches);
      setMatches(fallbackMatches);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Handle Project Selector Change
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    setSearchParams({ projectId: projId });
  };

  // Handle Invitation Click (Pre-scoped to current project)
  const handleInviteToProject = async (symbioteId: string, symbioteName: string) => {
    if (!userId || !selectedProject || !selectedProject.id) return;
    setInvitingId(symbioteId);

    try {
      await createInvitation({
        projectId: selectedProject.id,
        projectTitle: selectedProject.title || 'Project Invitation',
        clientName: userProfile?.companyName || userProfile?.displayName || 'Client',
        symbioteId,
        symbioteName: symbioteName || 'Specialist',
        clientId: userId,
        status: 'pending',
        budgetRange: (() => {
          if (selectedProject.minBudget && selectedProject.maxBudget) {
            return `$${Number(selectedProject.minBudget).toLocaleString()} - $${Number(selectedProject.maxBudget).toLocaleString()}`;
          }
          if (typeof selectedProject.budget === 'number' && selectedProject.budget > 0) {
            return `$${selectedProject.budget.toLocaleString()}`;
          }
          if (typeof selectedProject.budget === 'object' && selectedProject.budget) {
            const val = selectedProject.budget.total ?? selectedProject.budget.max ?? selectedProject.budget.min;
            if (val && Number(val) > 0) return `$${Number(val).toLocaleString()}`;
          }
          if (selectedProject.budgetType === 'hourly') {
            return 'Hourly Rate';
          }
          return 'Dynamic Per-Task';
        })(),
        timeline: selectedProject.duration || '3 months',
        techTags: selectedProject.skills || ['AI', 'Python'],
        createdAt: new Date().toISOString(),
      });

      // Send in-app notification to the specialist
      await createNotification({
        userId: symbioteId,
        type: 'invitation',
        title: `Project Invitation: ${selectedProject.title}`,
        description: `You received an invitation to join "${selectedProject.title}" from ${userName || 'a client'}.`,
        read: false,
        relatedItemId: selectedProject.id,
        createdAt: new Date().toISOString(),
      });

      setInvitedSymbioteIds((prev) => new Set([...prev, symbioteId]));
    } catch (err) {
      console.error('Error inviting specialist:', err);
    } finally {
      setInvitingId(null);
    }
  };

  // Filter and sort candidates meeting or exceeding platform matching threshold
  const qualifiedMatches = useMemo(() => {
    return matches
      .filter((m) => (m.matchScore || 0) >= minScoreThreshold)
      .sort((a, b) => {
        if (sortBy === 'rate_asc') {
          return (a.symbioteHourlyRate || 0) - (b.symbioteHourlyRate || 0);
        }
        if (sortBy === 'rate_desc') {
          return (b.symbioteHourlyRate || 0) - (a.symbioteHourlyRate || 0);
        }
        if (sortBy === 'name') {
          return (a.symbioteName || '').localeCompare(b.symbioteName || '');
        }
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [matches, minScoreThreshold, sortBy]);

  // Real tech stack tags without synthetic fallback
  const projectTechStack = useMemo(() => {
    if (!selectedProject) return [];
    const raw = [
      ...(Array.isArray(selectedProject.skills) ? selectedProject.skills : []),
      ...(Array.isArray(selectedProject.techTags) ? selectedProject.techTags : []),
      ...(Array.isArray(selectedProject.aiBrief?.recommendedSkills) ? selectedProject.aiBrief.recommendedSkills : []),
    ];
    return Array.from(
      new Set(raw.filter((s): s is string => typeof s === 'string' && s.trim().length > 0))
    );
  }, [selectedProject]);

  // Formatted budget without synthetic $5,000 fallback
  const formattedBudget = useMemo(() => {
    if (!selectedProject) return 'Not specified';
    if (selectedProject.minBudget && selectedProject.maxBudget) {
      return `$${Number(selectedProject.minBudget).toLocaleString()} - $${Number(selectedProject.maxBudget).toLocaleString()}`;
    }
    if (typeof selectedProject.budget === 'number' && selectedProject.budget > 0) {
      return `$${selectedProject.budget.toLocaleString()}`;
    }
    if (typeof selectedProject.budget === 'object' && selectedProject.budget) {
      const val = selectedProject.budget.total ?? selectedProject.budget.max ?? selectedProject.budget.min;
      if (val && Number(val) > 0) return `$${Number(val).toLocaleString()}`;
    }
    return 'Flexible / Open';
  }, [selectedProject]);

  // Formatted timeline without hardcoded 3 Months
  const formattedTimeline = useMemo(() => {
    if (!selectedProject) return 'Flexible';
    return selectedProject.duration || selectedProject.timeline || 'Flexible';
  }, [selectedProject]);

  // Relative evaluated time formatter
  const formatEvaluatedTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Just now';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER (§4) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                PreSync AI Matching Engine
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] font-mono">
                Neural scoring & match explainability powered by PreSync AI for top specialists based on project requirements.
              </p>
            </div>
          </div>
        </div>

        {/* TOP RIGHT CONTEXT BADGE */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            PreSync AI • Explainability Enabled
          </span>
        </div>
      </div>

      {/* NOTIFICATION TOAST FEEDBACK */}
      {matchNotification && (
        <div className="p-4 rounded-[12px] bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/40 text-xs font-mono text-[var(--color-accent-cyan)] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{matchNotification}</span>
          </div>
          <button
            onClick={() => setMatchNotification(null)}
            className="text-[var(--color-text-secondary)] hover:text-white text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MATCHING CONTEXT BAR (§4) */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[var(--color-border)] pb-6">
          {/* PROJECT SELECTOR DROPDOWN */}
          <div className="space-y-1.5 flex-1 max-w-xl">
            <label className="text-[11px] font-mono uppercase tracking-wider font-bold text-[var(--color-accent-cyan)] flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" />
              Target Project Context
            </label>

            {projects.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full h-11 px-4 pr-10 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] appearance-none cursor-pointer transition-colors"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.title} ({p.category || 'AI Project'} • {p.status.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            ) : (
              <div className="p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] flex items-center justify-between">
                <span>No custom project brief found. Using sample project context.</span>
                <Button
                  onClick={() => navigate('/client/projects/new')}
                  size="sm"
                  className="bg-[var(--color-accent-cyan)] text-white font-bold text-[10px] h-7 px-2.5 rounded"
                >
                  Create Project
                </Button>
              </div>
            )}
          </div>

          {/* RE-RUN AI BUTTON (USER INITIATED PER PRD AI RULE 4) */}
          <div className="flex items-center gap-3 shrink-0">
            {matches.length > 0 && matches[0].generatedAt && (
              <div className="text-right hidden sm:block">
                <span className="block text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                  Last Evaluated
                </span>
                <span className="text-xs font-mono font-medium text-[var(--color-text-primary)]">
                  {formatEvaluatedTime(matches[0].generatedAt)}
                </span>
              </div>
            )}

            <Button
              onClick={() => selectedProject && runAIMatchGeneration(selectedProject)}
              disabled={loadingMatches || !selectedProject}
              className="bg-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/90 text-slate-950 font-bold font-mono text-xs h-11 px-5 rounded-[10px] flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMatches ? 'animate-spin' : ''}`} />
              <span>{loadingMatches ? 'Evaluating via PreSync AI...' : 'Re-run PreSync AI Matching'}</span>
            </Button>
          </div>
        </div>

        {/* PARSED TAGS & METRICS SUMMARY */}
        {selectedProject ? (
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-bold">Required Tech Stack:</span>
              {projectTechStack.length > 0 ? (
                projectTechStack.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-accent-cyan)] font-semibold"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-[var(--color-text-secondary)] font-mono">
                  General AI / Flexible
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-[var(--color-text-secondary)] flex-wrap">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                Budget:{' '}
                <strong className="text-[var(--color-text-primary)] font-mono">
                  {formattedBudget}
                </strong>
              </span>

              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                Timeline:{' '}
                <strong className="text-[var(--color-text-primary)] font-mono">
                  {formattedTimeline}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--color-text-secondary)] font-mono italic">
            Select an active project above to view AI matched specialists.
          </div>
        )}
      </Card>

      {/* 3. 2x2 CANDIDATE CARD GRID (§4 + §11) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[var(--color-text-primary)]">
              Top PreSync AI Recommended Candidates ({qualifiedMatches.length})
            </h2>
          </div>

          {/* INTERACTIVE THRESHOLD & SORT CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* THRESHOLD FILTER DROPDOWN */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
              <label htmlFor="ai-threshold-select" className="text-[11px] text-[var(--color-text-secondary)]">Threshold Filter: ≥</label>
              <select
                id="ai-threshold-select"
                value={minScoreThreshold}
                onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
                className="bg-transparent text-[var(--color-accent-cyan)] font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-slate-900 text-white">50% Match (All)</option>
                <option value={60} className="bg-slate-900 text-white">60% Match</option>
                <option value={70} className="bg-slate-900 text-white">70% Match (Standard)</option>
                <option value={80} className="bg-slate-900 text-white">80% Match (High)</option>
                <option value={90} className="bg-slate-900 text-white">90% Match (Elite)</option>
              </select>
            </div>

            {/* SORT BY DROPDOWN */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono">
              <span className="text-[11px] text-[var(--color-text-secondary)]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[var(--color-text-primary)] font-medium text-xs focus:outline-none cursor-pointer"
              >
                <option value="fit" className="bg-slate-900 text-white">PreSync Fit Index (High → Low)</option>
                <option value="rate_asc" className="bg-slate-900 text-white">Hourly Rate: Low to High</option>
                <option value="rate_desc" className="bg-slate-900 text-white">Hourly Rate: High to Low</option>
                <option value="name" className="bg-slate-900 text-white">Specialist Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* LOADING STATE / SKELETON */}
        {loadingMatches ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-border)]" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-[var(--color-border)] rounded" />
                      <div className="h-3 w-48 bg-[var(--color-border)] rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-24 bg-[var(--color-border)] rounded-full" />
                </div>
                <div className="h-16 w-full bg-[var(--color-background)] rounded-[10px]" />
                <div className="h-20 w-full bg-[var(--color-background)] rounded-[10px]" />
              </Card>
            ))}
          </div>
        ) : qualifiedMatches.length > 0 ? (
          /* 2x2 GRID OF MATCHED CANDIDATES */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {qualifiedMatches.map((matchItem) => {
              const matchedSymbiote = realSymbiotes.find(
                (s) => s.uid === matchItem.symbioteId || s.displayName === matchItem.symbioteName
              );
              const candidateUid = matchedSymbiote?.uid || matchItem.symbioteId || matchItem.id || 'specialist';

              // Construct candidate profile directly from matchItem or matchedSymbiote
              const candidate: SymbioteProfile = {
                uid: candidateUid,
                displayName: matchedSymbiote?.displayName || matchItem.symbioteName || 'AI Specialist',
                title: matchedSymbiote?.title || matchItem.symbioteTitle || 'Machine Learning Engineer',
                avatarInitials: matchedSymbiote?.avatarInitials || matchItem.symbioteAvatarInitials || 'AI',
                avatarUrl: matchedSymbiote?.avatarUrl || (matchedSymbiote as any)?.photoURL || (matchItem as any)?.symbioteAvatarUrl || '',
                rating: matchedSymbiote?.rating ?? 0,
                reviewsCount: matchedSymbiote?.reviewsCount ?? 0,
                hourlyRate: matchedSymbiote?.hourlyRate || matchItem.symbioteHourlyRate || 110,
                skills: matchedSymbiote?.skills || ['Python', 'PyTorch', 'LangChain'],
                experience: matchedSymbiote?.experience || 'Senior',
                availability: matchedSymbiote?.availability || 'Immediate',
                location: matchedSymbiote?.location || 'Remote',
                bio: matchItem.explanation,
                email: matchedSymbiote?.email || '',
                completedProjects: matchedSymbiote?.completedProjects || 0,
                isOnline: matchedSymbiote?.isOnline,
                lastActiveAt: matchedSymbiote?.lastActiveAt,
                lastSeen: matchedSymbiote?.lastSeen,
              };

              const isInvited = invitedSymbioteIds.has(candidate.uid);
              const isInviting = invitingId === candidate.uid;

              return (
                <Card
                  key={candidate.uid}
                  className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all space-y-5 shadow-sm group flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* CARD HEADER ROW: CANDIDATE INFO + MATCH % BADGE */}
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* AVATAR WITH CYAN RING */}
                        <div className="relative shrink-0">
                          <Avatar
                            name={candidate.displayName}
                            initials={candidate.avatarInitials}
                            src={candidate.avatarUrl}
                            size="md"
                            statusDot={getUserStatusDot(matchedSymbiote || candidate)}
                            className="ring-2 ring-[var(--color-accent-cyan)]/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors truncate">
                              {candidate.displayName}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                              ${candidate.hourlyRate}/hr
                            </span>
                          </div>

                          <p className="text-xs font-mono text-[var(--color-text-secondary)] truncate">
                            {candidate.title}
                          </p>
                        </div>
                      </div>

                      {/* MATCH % BADGE (§4 & §11) */}
                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] font-mono font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{matchItem.matchScore}% MATCH</span>
                        </div>
                      </div>
                    </div>

                    {/* 3 SUB-METRIC PROGRESS BARS */}
                    <div className="p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-2.5">
                      <span className="block text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--color-text-secondary)]">
                        Neural Score Breakdown
                      </span>

                      <div className="grid grid-cols-3 gap-3">
                        {/* 1. SKILLS MATCH */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[var(--color-text-secondary)]">Skills Match</span>
                            <span className="font-bold text-[var(--color-accent-cyan)]">
                              {matchItem.subMetrics.skillsMatch}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]">
                            <div
                              className="h-full bg-[var(--color-accent-cyan)] rounded-full"
                              style={{ width: `${matchItem.subMetrics.skillsMatch}%` }}
                            />
                          </div>
                        </div>

                        {/* 2. EXPERIENCE FIT */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[var(--color-text-secondary)]">Exp Fit</span>
                            <span className="font-bold text-indigo-400">
                              {matchItem.subMetrics.experienceFit}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${matchItem.subMetrics.experienceFit}%` }}
                            />
                          </div>
                        </div>

                        {/* 3. AVAILABILITY FIT */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[var(--color-text-secondary)]">Avail Fit</span>
                            <span className="font-bold text-emerald-400">
                              {matchItem.subMetrics.availabilityFit}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${matchItem.subMetrics.availabilityFit}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* "WHY AI RECOMMENDS" EXPLANATION BOX (PRD RULE 2 EXPLAINABILITY) */}
                    <div className="p-4 rounded-[10px] bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--color-accent-cyan)] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Why PreSync AI Recommends This Specialist</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-primary)] font-sans leading-relaxed">
                        {matchItem.explanation}
                      </p>
                    </div>

                    {/* QUICK STATS & SKILL CHIPS */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[var(--color-text-secondary)]">
                        {candidate.reviewsCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <strong className="text-[var(--color-text-primary)]">{candidate.rating.toFixed(2)}</strong> ({candidate.reviewsCount} review{candidate.reviewsCount === 1 ? '' : 's'})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                            <Star className="w-3.5 h-3.5 opacity-40" />
                            <span>No ratings yet</span>
                          </span>
                        )}
                        <span>{candidate.completedProjects} Projects Completed</span>
                        <span>Availability: <strong className="text-[var(--color-success-green)]">{candidate.availability}</strong></span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {candidate.skills.slice(0, 5).map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ACTION ROW: INVITE TO PROJECT + VIEW PROFILE */}
                  <div className="pt-4 border-t border-[var(--color-border)] flex items-center gap-3">
                    <Button
                      onClick={() => handleInviteToProject(candidate.uid, candidate.displayName)}
                      disabled={isInvited || isInviting || !selectedProject}
                      className={`flex-1 h-10 font-mono text-xs font-bold rounded-[8px] flex items-center justify-center gap-2 transition-all ${
                        isInvited
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 cursor-default'
                          : 'bg-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/90 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      }`}
                    >
                      {isInvited ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Invited</span>
                        </>
                      ) : isInviting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Invite to Project</span>
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() =>
                        navigate(
                          `/client/professionals/${candidate.uid}?from=ai-matching${
                            selectedProjectId ? `&projectId=${selectedProjectId}` : ''
                          }`
                        )
                      }
                      variant="outline"
                      className="h-10 px-4 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs font-semibold rounded-[8px] flex items-center gap-1.5"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : matches.length > 0 ? (
          <Card className="p-12 text-center bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
            <Info className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              No Candidates Met Match Threshold ({minScoreThreshold}%)
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] font-mono max-w-lg mx-auto">
              PreSync AI evaluated registered candidates against this brief, but none met the platform's minimum compatibility threshold of {minScoreThreshold}%. Non-matching skill profiles are strictly filtered out.
            </p>
            {selectedProject && (
              <Button
                onClick={() => runAIMatchGeneration(selectedProject)}
                className="bg-[var(--color-accent-cyan)] text-slate-950 font-bold font-mono text-xs px-5 h-10 rounded-[8px]"
              >
                Re-evaluate Matches
              </Button>
            )}
          </Card>
        ) : (
          <Card className="p-12 text-center bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
            <Info className="w-8 h-8 text-[var(--color-accent-cyan)] mx-auto" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              No Matches Calculated Yet
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] font-mono max-w-md mx-auto">
              Click the button below to initiate Gemini AI matching for your selected project.
            </p>
            {selectedProject && (
              <Button
                onClick={() => runAIMatchGeneration(selectedProject)}
                className="bg-[var(--color-accent-cyan)] text-slate-950 font-bold font-mono text-xs px-5 h-10 rounded-[8px]"
              >
                Generate AI Matches Now
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
