import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/src/types/firestore';
import { StatusPill } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { formatProjectBudget, getCleanProjectTitle, isAiBriefProject } from '@/src/lib/utils/projectBudget';
import {
  DollarSign,
  Activity,
  UserPlus,
  Edit,
  Folder,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  Star,
  Target,
} from 'lucide-react';

export type ProjectTabType = 'overview' | 'milestones' | 'workspace' | 'team' | 'files' | 'progress' | 'activity';

interface ProjectHeaderProps {
  project: Project;
  activeTab: ProjectTabType;
  onTabChange: (tab: ProjectTabType) => void;
  onOpenAddTeamModal: () => void;
  onEditProject?: () => void;
  onCompleteProject?: () => void;
  onReopenProject?: () => void;
  approvedTeamCount?: number;
  filesCount?: number;
  pendingReviewsCount?: number;
  dynamicProgressPct?: number;
  allTasksCompleted?: boolean;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  activeTab,
  onTabChange,
  onOpenAddTeamModal,
  onEditProject,
  onCompleteProject,
  onReopenProject,
  approvedTeamCount,
  filesCount,
  pendingReviewsCount,
  dynamicProgressPct,
  allTasksCompleted,
}) => {
  // Map project status to StatusPill variant
  const getStatusVariant = (status: Project['status']) => {
    switch (status) {
      case 'open':
        return 'green';
      case 'in_progress':
        return 'indigo';
      case 'completed':
        return 'purple';
      case 'draft':
      default:
        return 'amber';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'open':
        return 'Active / Open';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'draft':
      default:
        return 'Draft';
    }
  };

  // Formatted date string
  const formattedDate = project.publishedAt
    ? new Date(project.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const healthStatus = project.healthStatus || 'On Track';
  const progressPercent = typeof dynamicProgressPct === 'number'
    ? dynamicProgressPct
    : (typeof project.progressPct === 'number'
        ? project.progressPct
        : (project.progressPercent ?? (project.status === 'completed' ? 100 : 0)));
  const navigate = useNavigate();

  const canCompleteProject = Boolean(
    onCompleteProject &&
    project.status !== 'completed' &&
    project.status !== 'closed' &&
    project.status !== 'draft' &&
    (!pendingReviewsCount || pendingReviewsCount === 0) &&
    (allTasksCompleted || progressPercent >= 100)
  );

  const tabs: Array<{ id: ProjectTabType; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'milestones', label: 'Milestones', icon: <Target className="w-3.5 h-3.5" /> },
    {
      id: 'workspace',
      label: 'Workspace',
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: pendingReviewsCount !== undefined && pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="w-3.5 h-3.5" />,
      badge: approvedTeamCount !== undefined ? approvedTeamCount : (project.teamMembers?.length || 0),
    },
    {
      id: 'files',
      label: 'Files & Resources',
      icon: <Folder className="w-3.5 h-3.5" />,
      badge: filesCount !== undefined ? filesCount : undefined,
    },
    { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'activity', label: 'Activity', icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5 sm:p-6 space-y-6 shadow-none">
      {/* HEADER TOP ROW */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* LEFT: TITLE & META */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              {getCleanProjectTitle(project.title)}
            </h1>
            {isAiBriefProject(project) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
                <Sparkles className="w-3 h-3" /> PreSync AI Brief
              </span>
            )}
            <StatusPill variant={getStatusVariant(project.status)} label={getStatusLabel(project.status)} />
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
            <span>Created {formattedDate}</span>
            <span className="text-slate-600">•</span>
            <span className="text-[var(--color-accent-cyan)] font-medium">
              {project.category || 'AI Engineering'}
            </span>
            {project.visibility && (
              <>
                <span className="text-slate-600">•</span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 capitalize">
                  {project.visibility}
                </span>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: METRICS & ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* BUDGET & HEALTH STATS */}
          <div className="hidden sm:flex items-center gap-4 px-3.5 py-2 rounded-[10px] bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10.5px] text-slate-400 block font-medium">Budget</span>
                <span className="font-semibold text-slate-100 text-xs font-mono">
                  {formatProjectBudget(project)}
                </span>
              </div>
            </div>



            <div className="w-[1px] h-6 bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10.5px] text-slate-400 block font-medium">Health</span>
                <span className="font-semibold text-emerald-400 text-xs">
                  {progressPercent >= 100 ? 'Completed' : healthStatus} ({progressPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">
            {project.status === 'completed' || project.status === 'closed' ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/client/projects/${project.id}/review?from=workspace`)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)] transition-all cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Leave Review</span>
                </Button>

                {onReopenProject && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReopenProject}
                    className="text-xs border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    title="Reopen project to In Progress mode"
                  >
                    <span>Reopen Project</span>
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* COMPLETE PROJECT BUTTON: Only visible when all deliverables/tasks are finished or 100% complete */}
                {canCompleteProject && (
                  <Button
                    size="sm"
                    onClick={onCompleteProject}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse cursor-pointer"
                    title="Complete Project"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Complete Project</span>
                  </Button>
                )}

                {/* FIND TALENT / MATCHING BUTTON: Helpful when project is open and needs talent */}
                {project.status === 'open' &&
                  !(project.teamMembers && project.teamMembers.length > 0) &&
                  !project.assignedSymbioteId && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/client/ai-matching?project=${project.id}`)}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30 hover:bg-[var(--color-accent-cyan)]/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Find Talent</span>
                    </Button>
                  )}

                {onEditProject && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onEditProject}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit Project</span>
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenAddTeamModal}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Team Member</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TAB ROW */}
      <div className="border-t border-[var(--color-border)] pt-4 -mb-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-[8px] text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-[var(--color-accent-cyan)] text-slate-950'
                      : 'bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
