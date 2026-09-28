import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, WorkspaceTask, WorkspaceMilestone } from '@/src/types/firestore';
import {
  subscribeToWorkspaceMilestones,
  subscribeToWorkspaceTasks,
  createMilestone,
  toggleMilestone,
  updateTaskStatus,
  approveTaskByClient,
  completeEntireProjectManually,
  syncProjectCompletionAndProgress,
} from '@/src/lib/firestore/workspace';
import { triggerFileDownload } from '@/src/lib/storage/download';
import { useAuth } from '@/src/context/AuthContext';
import { TaskDrawer } from '@/src/components/project/TaskDrawer';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import {
  Target,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Folder,
  FolderOpen,
  Layers,
  Code,
  Link as LinkIcon,
  X,
  Loader2,
  Sparkles,
  ChevronRight,
  ListTodo,
  FileText,
  Send,
  CheckSquare,
  Zap,
  Download,
  ExternalLink,
  Github,
  FileCheck,
} from 'lucide-react';

interface MilestonesTabProps {
  project: Project;
  onOpenAddTeamModal?: () => void;
  isReadOnly?: boolean;
  userRole?: 'client' | 'specialist' | 'admin';
  onProjectUpdated?: () => void;
}

// Preset template definitions for milestone creation (§3)
const MILESTONE_TEMPLATES = [
  {
    id: 'scope-arch',
    title: 'Scope & Architecture',
    description: 'System blueprint, technical architecture, and project scope sign-off',
    icon: Layers,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20',
  },
  {
    id: 'core-dev',
    title: 'Core Development',
    description: 'Main feature logic, backend API routes, and database models implementation',
    icon: Code,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    id: 'integration-testing',
    title: 'Integration & Testing',
    description: 'Third-party integrations, automated test suites, and end-to-end pipelines',
    icon: LinkIcon,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
  },
  {
    id: 'qa-performance',
    title: 'QA & Performance',
    description: 'Quality assurance, bug triaging, load testing, and optimization',
    icon: CheckCircle2,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
  },
  {
    id: 'ui-ux-polish',
    title: 'UI/UX Polish',
    description: 'Design refinement, responsive web layouts, animations, and accessibility',
    icon: Sparkles,
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20',
  },
  {
    id: 'deployment-handoff',
    title: 'Deployment & Handoff',
    description: 'Production Cloud deployment, client documentation, and final sign-off',
    icon: Send,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20',
  },
];

export const MilestonesTab: React.FC<MilestonesTabProps> = ({
  project,
  isReadOnly: propIsReadOnly = false,
  userRole,
  onProjectUpdated,
}) => {
  const isReadOnly = propIsReadOnly || project.status === 'completed' || project.status === 'closed';
  const navigate = useNavigate();
  const projectId = project.id || '';
  const { firebaseUser, userProfile } = useAuth();

  // Role detection
  const currentRole =
    userRole ||
    userProfile?.role ||
    (project.assignedSymbioteId === firebaseUser?.uid ? 'specialist' : 'client');
  const isSpecialist =
    currentRole === 'specialist' ||
    (!isReadOnly && project.assignedSymbioteId === firebaseUser?.uid);
  const isClient =
    currentRole === 'client' ||
    currentRole === 'admin' ||
    project.clientId === firebaseUser?.uid ||
    project.ownerId === firebaseUser?.uid;

  // Firestore Data State
  const [milestones, setMilestones] = useState<WorkspaceMilestone[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [completingAll, setCompletingAll] = useState<boolean>(false);

  // Active milestone detail view (null = all milestones folder hierarchy)
  const [selectedMilestone, setSelectedMilestone] = useState<WorkspaceMilestone | null>(null);

  // Action feedback message
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Task Side-Drawer State
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);
  const [drawerInitialMilestoneId, setDrawerInitialMilestoneId] = useState<string>('');

  // Auto-sync selectedMilestone in real-time when Firestore milestones change
  useEffect(() => {
    if (selectedMilestone) {
      const updated = milestones.find((m) => m.id === selectedMilestone.id);
      if (updated) {
        setSelectedMilestone(updated);
      }
    }
  }, [milestones]);

  // Helper to assign short ID (M1, M2, M3...) per project in creation order (§2)
  const getMilestoneShortId = (ms: WorkspaceMilestone, allMilestones: WorkspaceMilestone[]) => {
    const idx = allMilestones.findIndex((m) => m.id === ms.id);
    return idx >= 0 ? `M${idx + 1}` : 'M1';
  };

  // Helper to resolve tasks belonging to a milestone cleanly
  const getMilestoneTasks = (ms: WorkspaceMilestone) => {
    return tasks.filter((t) => {
      if (t.milestoneId && ms.id) {
        return t.milestoneId === ms.id;
      }
      if (t.milestoneTitle) {
        const msName = ms.title || ms.name || '';
        if (msName && t.milestoneTitle.toLowerCase() === msName.toLowerCase()) {
          return true;
        }
      }
      return milestones[0]?.id === ms.id;
    });
  };

  // Create Milestone Modal State (§3)
  const [isCreateMilestoneModalOpen, setIsCreateMilestoneModalOpen] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState<string>('');
  const [isCreatingMilestone, setIsCreatingMilestone] = useState<boolean>(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  // Real-time Firestore subscriptions for milestones and tasks + auto-sync
  useEffect(() => {
    if (!projectId) return;

    setLoading(true);

    const unsubMilestones = subscribeToWorkspaceMilestones(projectId, (ms) => {
      setMilestones(ms);
      setLoading(false);
      if (!isReadOnly) {
        syncProjectCompletionAndProgress(projectId).catch(() => {});
      }
    });

    const unsubTasks = subscribeToWorkspaceTasks(projectId, (ts) => {
      setTasks(ts);
      if (!isReadOnly) {
        syncProjectCompletionAndProgress(projectId).catch(() => {});
      }
    });

    return () => {
      unsubMilestones();
      unsubTasks();
    };
  }, [projectId]);

  // Toggle single milestone completed state
  const handleToggleMilestone = async (e: React.MouseEvent, ms: WorkspaceMilestone) => {
    e.stopPropagation();
    if (!projectId || !ms.id || isReadOnly || project.status === 'completed') return;
    try {
      await toggleMilestone(projectId, ms.id, !ms.completed);
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };


  // Quick approve a single task inside milestone folder (Client only -> direct settlement)
  const handleQuickApproveTask = async (e: React.MouseEvent, task: WorkspaceTask) => {
    e.stopPropagation();
    if (!projectId || !task.id || isReadOnly || project.status === 'completed' || !isClient) return;
    try {
      await approveTaskByClient(projectId, task.id, firebaseUser?.uid);
      setActionSuccessMsg(`Task "${task.title}" approved and direct settlement invoice generated.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
  };

  // Complete all milestones and tasks in 1 click (Client only when active talent assigned)
  const handleCompleteAllDeliverables = async () => {
    if (!projectId || completingAll || isReadOnly || project.status === 'completed') return;
    const confirmed = window.confirm('Are you sure you want to mark all project milestones and tasks as 100% completed?');
    if (!confirmed) return;
    setCompletingAll(true);
    try {
      await completeEntireProjectManually(projectId);
    } catch (err) {
      console.error('Failed to complete project:', err);
    } finally {
      setCompletingAll(false);
    }
  };

  // Keep active selected milestone updated if real-time list updates
  useEffect(() => {
    if (selectedMilestone) {
      const updatedMs = milestones.find((m) => m.id === selectedMilestone.id);
      if (updatedMs) setSelectedMilestone(updatedMs);
    }
  }, [milestones]);

  // Handle template selection (§3)
  const handleSelectTemplate = (template: (typeof MILESTONE_TEMPLATES)[0]) => {
    setSelectedTemplateId(template.id);
    setNewMilestoneTitle(template.title);
    setNewMilestoneDescription(template.description);
  };

  // Handle Create Milestone Form Submit (§3)
  const handleCreateMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      setMilestoneError('Milestone Title is required.');
      return;
    }

    setIsCreatingMilestone(true);
    setMilestoneError(null);

    try {
      await createMilestone(projectId, {
        title: newMilestoneTitle.trim(),
        name: newMilestoneTitle.trim(),
        description: newMilestoneDescription.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      });

      setNewMilestoneTitle('');
      setNewMilestoneDescription('');
      setSelectedTemplateId(null);
      setIsCreateMilestoneModalOpen(false);
    } catch (err) {
      console.error('Failed to create milestone:', err);
      setMilestoneError('Failed to create milestone. Please try again.');
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  // Helper for status badge variant
  const getStatusVariant = (status: WorkspaceTask['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'indigo';
      case 'review':
        return 'amber';
      case 'todo':
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: WorkspaceTask['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'review':
        return 'Review';
      case 'todo':
      default:
        return 'To Do';
    }
  };

  // Total project metrics calculation
  const totalTasksCount = tasks.length;
  const totalCompletedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

  const isProjectFullyCompleted =
    project.status === 'completed' ||
    (totalTasksCount > 0 && totalCompletedTasks === totalTasksCount) ||
    (milestones.length > 0 && milestones.every((m) => m.completed));

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--color-text-secondary)] font-mono flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent-cyan)]" />
        <span>Loading project milestones folder hierarchy...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BAR FOR MILESTONES TAB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-4 sm:p-5 shadow-none">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Project Milestones & Task Directory
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                File-explorer style hierarchy organizing project deliverables and milestone folders
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        {!isReadOnly && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMilestoneError(null);
                setIsCreateMilestoneModalOpen(true);
              }}
              className="text-xs font-mono flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Create Milestone</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setDrawerInitialMilestoneId(selectedMilestone?.id || milestones[0]?.id || '');
                setIsTaskDrawerOpen(true);
              }}
              className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </Button>
          </div>
        )}
      </div>

      {/* 100% COMPLETION / REVIEW BANNER */}
      {isProjectFullyCompleted ? (
        <Card className="p-4 sm:p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-emerald-300">
                  Project Deliverables 100% Completed!
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Ready for Review & Payment
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                All milestone folders and task deliverables are verified and completed.
              </p>
            </div>
          </div>
          {isClient && !isSpecialist && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/client/projects/${projectId}/review?from=workspace`)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Leave Specialist Review</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        !isReadOnly &&
        project.status === 'in_progress' &&
        Boolean(
          (project.teamMembers && project.teamMembers.length > 0) ||
            project.assignedSymbioteId ||
            (project as any).specialistId ||
            (project as any).assignedTo
        ) &&
        userRole !== 'specialist' && (
          <div className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs flex-wrap gap-2">
            <span className="text-[var(--color-text-secondary)] font-mono">
              Ready to wrap up deliverables? Marking all tasks finished completes the project at 100%.
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={completingAll}
              onClick={handleCompleteAllDeliverables}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 text-xs font-mono flex items-center gap-1.5 h-8 cursor-pointer"
              title="Mark all tasks and milestones as complete to finish this project"
            >
              {completingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5" />
              )}
              <span>Complete Entire Project (100%)</span>
            </Button>
          </div>
        )
      )}

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-1">
          <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase">
            Milestone Folders
          </p>
          <p className="text-lg font-bold text-[var(--color-text-primary)] font-mono">
            {milestones.length}
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-1">
          <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase">
            Tasks Progress
          </p>
          <p className="text-lg font-bold text-[var(--color-accent-cyan)] font-mono">
            {totalCompletedTasks} / {totalTasksCount}{' '}
            <span className="text-xs font-normal text-[var(--color-text-secondary)]">
              ({totalTasksCount > 0 ? Math.round((totalCompletedTasks / totalTasksCount) * 100) : 0}%)
            </span>
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-1">
          <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase">
            Est. Total Hours
          </p>
          <p className="text-lg font-bold text-[var(--color-text-primary)] font-mono">
            {totalEstimatedHours} hrs
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-1">
          <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase">
            Actual Hours Logged
          </p>
          <p className="text-lg font-bold text-[var(--color-success-green)] font-mono">
            {totalActualHours} hrs
          </p>
        </Card>
      </div>

      {/* VIEW LEVEL 1: ALL MILESTONES FOLDER-EXPLORER DIRECTORY LISTING (§1) */}
      {!selectedMilestone ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <span>Milestones Directory Hierarchy ({milestones.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)] italic">
              Click a folder row to expand tasks inside
            </span>
          </div>

          {milestones.length === 0 ? (
            <Card className="p-10 text-center space-y-4 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] max-w-md mx-auto">
              <Folder className="w-10 h-10 text-[var(--color-accent-cyan)] mx-auto opacity-70" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No Milestones Created Yet</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Milestone folders organize your project deliverables and task files. Pick a template or create a custom milestone.
                </p>
              </div>
              {!isReadOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateMilestoneModalOpen(true)}
                  className="bg-[var(--color-accent-cyan)] text-black font-bold text-xs"
                >
                  Create First Milestone
                </Button>
              )}
            </Card>
          ) : (
            /* FILE EXPLORER ROW-BASED LISTING (§1) */
            <div className="border border-[var(--color-border)] rounded-[12px] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border)] shadow-sm">
              {milestones.map((ms) => {
                const shortId = getMilestoneShortId(ms, milestones);
                const milestoneTasks = getMilestoneTasks(ms);
                const msCompletedTasks = milestoneTasks.filter((t) => t.status === 'completed').length;
                const msTotalHours = milestoneTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                const msProgress = milestoneTasks.length > 0 ? Math.round((msCompletedTasks / milestoneTasks.length) * 100) : 0;

                return (
                  <div
                    key={ms.id}
                    onClick={() => setSelectedMilestone(ms)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--color-background)]/80 transition-all cursor-pointer group"
                  >
                    {/* FOLDER ICON, ID TAG (M1, M2...) AND TITLE */}
                    <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
                      <div className="p-2.5 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] group-hover:bg-[var(--color-accent-cyan)]/25 transition-colors shrink-0">
                        <Folder className="w-5 h-5 fill-[var(--color-accent-cyan)]/20" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* SHORT ID TAG BADGE (§2) */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 shrink-0">
                            {shortId}
                          </span>

                          <h4 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors truncate">
                            {ms.title || ms.name || 'Untitled Milestone'}
                          </h4>

                          {/* MILESTONE STATUS PILL */}
                          {ms.status === 'submitted' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Under Review</span>
                            </span>
                          )}
                          {(ms.completed || ms.status === 'approved') && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed ✓</span>
                            </span>
                          )}
                          {ms.deliverables && ms.deliverables.length > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 shrink-0 flex items-center gap-1">
                              <FileCheck className="w-3 h-3" />
                              <span>{ms.deliverables.length} files</span>
                            </span>
                          )}
                        </div>
                        {ms.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 leading-relaxed">
                            {ms.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* METRICS: TASK FILES COUNT, TOTAL HOURS, PROGRESS BAR & CHEVRON (§1) */}
                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[var(--color-border)]/50 flex-wrap">
                      {/* TASK COUNT BADGE */}
                      <span className="px-2.5 py-1 rounded-[6px] text-xs font-mono font-semibold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)] flex items-center gap-1.5 shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
                        <span>{milestoneTasks.length} {milestoneTasks.length === 1 ? 'task' : 'tasks'}</span>
                      </span>

                      {/* ESTIMATED HOURS */}
                      <span className="text-xs font-mono text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
                        <span>{msTotalHours}h</span>
                      </span>

                      {/* PROGRESS BAR */}
                      <div className="w-24 space-y-1 shrink-0 hidden sm:block">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[var(--color-text-secondary)]">{msCompletedTasks}/{milestoneTasks.length}</span>
                          <span className="text-[var(--color-accent-cyan)] font-bold">{msProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--color-background)] rounded-full overflow-hidden border border-[var(--color-border)]">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400"
                            style={{ width: `${msProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* TOGGLE MILESTONE COMPLETED */}
                      {!isReadOnly && !isSpecialist && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleMilestone(e, ms)}
                          className={`px-2.5 py-1 rounded-[6px] text-[11px] font-mono flex items-center gap-1.5 shrink-0 border transition-all cursor-pointer ${
                            ms.completed
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                          title={ms.completed ? 'Milestone Completed (Click to reopen)' : 'Click to mark milestone completed'}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${ms.completed ? 'text-emerald-400' : ''}`} />
                          <span className="hidden sm:inline">{ms.completed ? 'Done ✓' : 'Mark Done'}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1 text-xs font-mono text-[var(--color-accent-cyan)] group-hover:translate-x-1 transition-transform shrink-0">
                        <span className="hidden lg:inline text-[11px] font-semibold">Open Folder</span>
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW LEVEL 2: EXPANDED MILESTONE FOLDER CONTENTS (§1) */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BREADCRUMB DIRECTORY NAVIGATION */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2 rounded-[8px] w-fit">
            <button
              type="button"
              onClick={() => setSelectedMilestone(null)}
              className="hover:text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Milestones Directory</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
              {getMilestoneShortId(selectedMilestone, milestones)}
            </span>
            <span className="text-[var(--color-text-primary)] font-bold truncate max-w-[260px]">
              {selectedMilestone.title || selectedMilestone.name}
            </span>
          </div>

          {/* EXPANDED MILESTONE HEADER CARD */}
          <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-accent-cyan)]/40 rounded-[12px] space-y-3 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 shrink-0">
                    <FolderOpen className="w-5 h-5 fill-[var(--color-accent-cyan)]/20" />
                  </div>

                  {/* ID BADGE (M1, M2...) + TITLE (§2) */}
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/40 shrink-0">
                    {getMilestoneShortId(selectedMilestone, milestones)}
                  </span>

                  <h3 className="text-base font-bold text-[var(--color-text-primary)] truncate">
                    {selectedMilestone.title || selectedMilestone.name || 'Untitled Milestone'}
                  </h3>

                  {/* MILESTONE STATUS BADGE */}
                  {selectedMilestone.status === 'submitted' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>Under Client Review</span>
                    </span>
                  )}
                  {(selectedMilestone.completed || selectedMilestone.status === 'approved') && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Phase Completed ✓</span>
                    </span>
                  )}
                  {selectedMilestone.status !== 'submitted' && !selectedMilestone.completed && selectedMilestone.status !== 'approved' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                      In Progress
                    </span>
                  )}
                </div>

                {selectedMilestone.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pl-1">
                    {selectedMilestone.description}
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* CLIENT MARK MILESTONE DONE */}
                {!isReadOnly && !isSpecialist && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleToggleMilestone(e, selectedMilestone)}
                    className={`text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      selectedMilestone.completed
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                        : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedMilestone.completed ? 'Milestone Completed ✓' : 'Mark Milestone Done'}</span>
                  </Button>
                )}

                {/* ADD TASK FILE */}
                {!isReadOnly && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingTask(null);
                      setDrawerInitialMilestoneId(selectedMilestone.id || '');
                      setIsTaskDrawerOpen(true);
                    }}
                    className="text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task File</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* ACTION SUCCESS FEEDBACK BANNER */}
          {actionSuccessMsg && (
            <div className="p-3.5 rounded-[10px] bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccessMsg(null)}
                className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PHASE SUMMARY CARD (Repository / Attached Files) */}
          {(selectedMilestone.repositoryUrl ||
            selectedMilestone.summaryNotes ||
            (selectedMilestone.deliverables && selectedMilestone.deliverables.length > 0)) && (
            <Card className="p-5 rounded-[12px] space-y-4 border bg-emerald-500/5 border-emerald-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                      Phase Resources & Notes
                    </h4>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {selectedMilestone.completed
                      ? 'Phase completed (all tasks finished & approved)'
                      : 'Phase in progress'}
                  </p>
                </div>
              </div>

              {/* GIT REPOSITORY / STAGING LINK */}
              {selectedMilestone.repositoryUrl && (
                <div className="p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Github className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                    <span className="font-mono text-[var(--color-text-secondary)] shrink-0">
                      Repository:
                    </span>
                    <span className="font-mono text-[var(--color-text-primary)] truncate">
                      {selectedMilestone.repositoryUrl}
                    </span>
                  </div>
                  <a
                    href={selectedMilestone.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded text-xs font-mono text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 flex items-center gap-1 shrink-0"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* SUMMARY NOTES */}
              {selectedMilestone.summaryNotes && (
                <div className="p-3.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-1.5 text-xs">
                  <p className="font-mono font-bold text-[var(--color-text-secondary)] uppercase text-[10px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                    <span>Phase Notes</span>
                  </p>
                  <p className="text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {selectedMilestone.summaryNotes}
                  </p>
                </div>
              )}

              {/* ATTACHED DELIVERABLE FILES */}
              {selectedMilestone.deliverables && selectedMilestone.deliverables.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono font-bold text-[var(--color-text-secondary)] uppercase text-[10px] flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                    <span>Attached Files ({selectedMilestone.deliverables.length})</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedMilestone.deliverables.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs hover:border-[var(--color-accent-cyan)]/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--color-text-primary)] truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                              {file.size || '1.0 MB'} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Uploaded'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => triggerFileDownload(file.url, file.name)}
                          className="px-2.5 py-1 rounded text-xs font-mono text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Download deliverable file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* TASKS INSIDE MILESTONE (FOLDER CONTENTS) (§1) */}
          {(() => {
            const currentMsTasks = getMilestoneTasks(selectedMilestone);
            return (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                    <span>
                      Folder Contents ({currentMsTasks.length} {currentMsTasks.length === 1 ? 'task file' : 'task files'})
                    </span>
                  </h4>
                </div>

                {currentMsTasks.length === 0 ? (
                  <Card className="p-8 text-center space-y-3 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      No task files inside this milestone folder yet.
                    </p>
                    {!isReadOnly && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingTask(null);
                          setDrawerInitialMilestoneId(selectedMilestone.id || '');
                          setIsTaskDrawerOpen(true);
                        }}
                        className="text-xs"
                      >
                        Add First Task File
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="border border-[var(--color-border)] rounded-[12px] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden shadow-sm">
                    {currentMsTasks.map((task, idx) => {
                      const assigneesList = task.assignees || (task.assigneeId ? [{
                        uid: task.assigneeId,
                        displayName: task.assigneeName || 'Specialist',
                        avatarInitials: task.assigneeAvatarInitials || 'SP',
                        avatarUrl: task.assigneeAvatarUrl,
                      }] : []);

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            setEditingTask(task);
                            setDrawerInitialMilestoneId(task.milestoneId || '');
                            setIsTaskDrawerOpen(true);
                          }}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-background)]/80 transition-all cursor-pointer group"
                        >
                          {/* TASK FILE ICON, INDEX, TITLE & DESCRIPTION */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <FileText className="w-4 h-4 text-[var(--color-accent-cyan)] group-hover:scale-110 transition-transform shrink-0 mt-0.5 sm:mt-0" />
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] font-bold">
                                  FILE-{idx + 1}
                                </span>
                                <h5 className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                                  {task.title}
                                </h5>
                                <StatusPill variant={getStatusVariant(task.status)} label={getStatusLabel(task.status)} />
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                                  {task.priority} Priority
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* HOURS & ASSIGNEES */}
                          <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                            <div className="text-[11px] font-mono text-[var(--color-text-secondary)] text-right">
                              <span>Est: <strong className="text-[var(--color-text-primary)]">{task.estimatedHours || 0}h</strong></span>
                              <span className="mx-1">|</span>
                              <span>Actual: <strong className="text-[var(--color-success-green)]">{task.actualHours || 0}h</strong></span>
                            </div>

                            {/* ASSIGNEES AVATAR STACK */}
                            <div className="flex items-center -space-x-1.5">
                              {assigneesList.length === 0 ? (
                                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] italic">Unassigned</span>
                              ) : (
                                assigneesList.map((a, aIdx) => (
                                  <div key={a.uid || aIdx} title={a.displayName}>
                                    <Avatar
                                      name={a.displayName}
                                      initials={a.avatarInitials}
                                      src={(a as any).avatarUrl}
                                      size="sm"
                                    />
                                  </div>
                                ))
                              )}
                            </div>

                            {/* QUICK APPROVE TASK BUTTON (Client Only) */}
                            {!isReadOnly && isClient && task.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={(e) => handleQuickApproveTask(e, task)}
                                className="px-2 py-1 rounded-[6px] text-[10px] font-mono flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 border border-[var(--color-border)] hover:border-emerald-500/30 transition-all cursor-pointer shrink-0"
                                title="Approve and issue direct task invoice"
                              >
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* CREATE MILESTONE MODAL WITH TEMPLATE PRESETS (§3) */}
      {isCreateMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Create Project Milestone</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateMilestoneModalOpen(false)}
                className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestoneSubmit} className="space-y-4">
              {milestoneError && (
                <div className="p-2.5 rounded-[6px] bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-xs text-[var(--color-danger-red)] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{milestoneError}</span>
                </div>
              )}

              {/* SECTION 1: READY-MADE TEMPLATE PRESETS (1-CLICK PICK) (§3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                    <span>Quick Template Presets (1-Click Pick)</span>
                  </label>
                  <span className="text-[10px] font-mono text-[var(--color-accent-cyan)]">6 Presets Available</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {MILESTONE_TEMPLATES.map((tmpl) => {
                    const TmplIcon = tmpl.icon;
                    const isSelected = selectedTemplateId === tmpl.id;

                    return (
                      <button
                        type="button"
                        key={tmpl.id}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`p-3 rounded-[10px] border text-left transition-all cursor-pointer space-y-1.5 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[var(--color-accent-cyan)]/20 border-[var(--color-accent-cyan)] ring-1 ring-[var(--color-accent-cyan)]'
                            : 'bg-[var(--color-background)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className={`p-1.5 rounded-[6px] border ${tmpl.color}`}>
                            <TmplIcon className="w-3.5 h-3.5" />
                          </div>
                          {isSelected && (
                            <span className="text-[9.5px] font-mono font-bold bg-[var(--color-accent-cyan)] text-slate-950 px-1.5 py-0.2 rounded">
                              Selected
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                            {tmpl.title}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mt-0.5">
                            {tmpl.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: CUSTOM TITLE + DESCRIPTION (§3) */}
              <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
                    Milestone Title <span className="text-[var(--color-danger-red)]">*</span>
                  </label>
                  <Input
                    value={newMilestoneTitle}
                    onChange={(e) => {
                      setNewMilestoneTitle(e.target.value);
                      setSelectedTemplateId(null);
                    }}
                    placeholder="e.g. Scope & Architecture"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
                    Short Description
                  </label>
                  <textarea
                    value={newMilestoneDescription}
                    onChange={(e) => setNewMilestoneDescription(e.target.value)}
                    placeholder="Briefly describe what deliverables this milestone covers..."
                    rows={3}
                    className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateMilestoneModalOpen(false)}
                  disabled={isCreatingMilestone}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isCreatingMilestone}
                  className="bg-[var(--color-accent-cyan)] text-black font-bold text-xs flex items-center gap-1"
                >
                  {isCreatingMilestone ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create Milestone</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TASK SIDE-PANEL DRAWER */}
      <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => {
          setIsTaskDrawerOpen(false);
          setEditingTask(null);
        }}
        project={project}
        milestones={milestones}
        existingTasks={tasks}
        taskToEdit={editingTask}
        initialMilestoneId={drawerInitialMilestoneId}
        onOpenCreateMilestoneModal={() => setIsCreateMilestoneModalOpen(true)}
      />
    </div>
  );
};
