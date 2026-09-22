import React, { useState, useEffect, useMemo } from 'react';
import { Project, WorkspaceTask, WorkspaceMilestone, TimeEntry } from '@/src/types/firestore';
import { getTimeEntries } from '@/src/lib/firestore/timeEntries';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Target,
  User,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ApprovalsQueueViewProps {
  project: Project;
  tasks: WorkspaceTask[];
  milestones: WorkspaceMilestone[];
  onApproveTask: (taskId: string) => Promise<void>;
  onRequestChanges: (taskId: string, feedback: string) => Promise<void>;
  onSwitchToBoard: () => void;
  onEditTask?: (task: WorkspaceTask) => void;
  isReadOnly?: boolean;
}

export const ApprovalsQueueView: React.FC<ApprovalsQueueViewProps> = ({
  project,
  tasks,
  milestones,
  onApproveTask,
  onRequestChanges,
  onSwitchToBoard,
  onEditTask,
  isReadOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('all');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedTaskSessions, setExpandedTaskSessions] = useState<Record<string, boolean>>({});
  
  // Feedback state for Request Changes inline form
  const [revisionInputs, setRevisionInputs] = useState<Record<string, string>>({});
  const [activeRevisionTaskId, setActiveRevisionTaskId] = useState<string | null>(null);

  // Loading state per task action
  const [processingAction, setProcessingAction] = useState<Record<string, 'approve' | 'revision' | null>>({});

  const hourlyRate = Number(project.hourlyRate) || 50;

  // Filter tasks in 'review' status
  const reviewTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'review');
  }, [tasks]);

  // Filtered by search and milestone
  const filteredTasks = useMemo(() => {
    return reviewTasks.filter((task) => {
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.reviewNotes && task.reviewNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.assigneeName && task.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMilestone =
        selectedMilestoneId === 'all' ||
        task.milestoneId === selectedMilestoneId ||
        task.milestoneTitle === selectedMilestoneId;

      return matchesSearch && matchesMilestone;
    });
  }, [reviewTasks, searchQuery, selectedMilestoneId]);

  // Fetch all time entries for this project to associate with tasks
  useEffect(() => {
    let mounted = true;
    if (!project.id) return;

    setLoadingEntries(true);
    getTimeEntries({ projectId: project.id })
      .then((entries) => {
        if (mounted) {
          setTimeEntries(entries);
        }
      })
      .catch((err) => {
        console.warn('Could not load time entries for approval queue:', err);
      })
      .finally(() => {
        if (mounted) setLoadingEntries(false);
      });

    return () => {
      mounted = false;
    };
  }, [project.id]);

  // Aggregate stats
  const totalLoggedHours = useMemo(() => {
    return reviewTasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);
  }, [reviewTasks]);

  const totalValueAtReview = useMemo(() => {
    return Math.round(totalLoggedHours * hourlyRate);
  }, [totalLoggedHours, hourlyRate]);

  const toggleTaskSessions = (taskId: string) => {
    setExpandedTaskSessions((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleApprove = async (taskId: string) => {
    if (isReadOnly) return;
    setProcessingAction((prev) => ({ ...prev, [taskId]: 'approve' }));
    try {
      await onApproveTask(taskId);
    } finally {
      setProcessingAction((prev) => ({ ...prev, [taskId]: null }));
    }
  };

  const handleSendRevision = async (taskId: string) => {
    if (isReadOnly) return;
    const feedback = revisionInputs[taskId] || '';
    setProcessingAction((prev) => ({ ...prev, [taskId]: 'revision' }));
    try {
      await onRequestChanges(taskId, feedback);
      setActiveRevisionTaskId(null);
      setRevisionInputs((prev) => ({ ...prev, [taskId]: '' }));
    } finally {
      setProcessingAction((prev) => ({ ...prev, [taskId]: null }));
    }
  };

  return (
    <div className="space-y-5">
      {/* SUMMARY & STATS BANNER */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Client Review & Approvals Queue
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
              {reviewTasks.length} Pending
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Review specialist deliverables and logged work sessions. Approving a task marks it Completed and verifies time for automated milestone invoicing.
          </p>
        </div>

        {/* METRICS CHIPS */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)]">
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
              Pending Tasks
            </span>
            <span className="text-sm font-mono font-bold text-amber-400">
              {reviewTasks.length}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)]">
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
              Logged Time
            </span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {totalLoggedHours.toFixed(1)}h
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)]">
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
              Value (@${hourlyRate}/h)
            </span>
            <span className="text-sm font-mono font-bold text-[var(--color-accent-cyan)]">
              ${totalValueAtReview.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="p-3 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deliverables, tasks, or specialist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={selectedMilestoneId}
            onChange={(e) => setSelectedMilestoneId(e.target.value)}
            className="px-3 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-mono"
          >
            <option value="all">All Milestones</option>
            {milestones.map((m, idx) => (
              <option key={m.id || idx} value={m.id}>
                M{idx + 1} · {m.title || m.name || 'Milestone'}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToBoard}
            className="text-xs border-[var(--color-border)] hover:bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-mono flex items-center gap-1.5"
          >
            <span>Switch to Board</span>
          </Button>
        </div>
      </Card>

      {/* EMPTY STATE */}
      {filteredTasks.length === 0 && (
        <Card className="p-12 text-center bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
              Approvals Queue is Clear
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {reviewTasks.length === 0
                ? 'All submitted tasks have been reviewed and approved. When specialists submit new deliverables for review, they will appear here.'
                : 'No pending review tasks match your current filter.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToBoard}
            className="text-xs border-[var(--color-border)] hover:bg-[var(--color-background)] text-[var(--color-accent-cyan)] mt-2"
          >
            View Board
          </Button>
        </Card>
      )}

      {/* APPROVAL CARDS LIST */}
      {filteredTasks.length > 0 && (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const taskId = task.id || '';
            const isApproving = processingAction[taskId] === 'approve';
            const isRevisionProcessing = processingAction[taskId] === 'revision';
            const isRevisionOpen = activeRevisionTaskId === taskId;

            // Matched milestone
            const matchedMs = milestones.find(
              (m) => m.id === task.milestoneId || m.title === task.milestoneTitle
            );
            const msIndex = matchedMs ? milestones.findIndex((m) => m.id === matchedMs.id) : -1;
            const msLabel = msIndex >= 0 ? `M${msIndex + 1}` : 'M1';
            const msTitle = matchedMs?.title || matchedMs?.name || task.milestoneTitle || 'Milestone';

            // Filter time entries for this specific task
            const taskEntries = timeEntries.filter((e) => e.taskId === taskId);
            const sessionsExpanded = !!expandedTaskSessions[taskId];

            const taskLoggedHours = Number(task.actualHours || 0);
            const entryHoursSum = taskEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
            const effectiveLoggedHours = taskLoggedHours > 0 ? taskLoggedHours : entryHoursSum;
            const taskEstimatedHours = Number(task.estimatedHours || 8);
            
            // Specialist agreed rate from teamMembers or fallback to project rate
            const assignedMember = (project as any)?.teamMembers?.find((m: any) => m.uid === task.assigneeId);
            const taskRate = Number(assignedMember?.hourlyRate) || hourlyRate;
            const taskCost = Math.round(effectiveLoggedHours * taskRate);

            return (
              <Card
                key={taskId}
                className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-amber-500/40 rounded-[12px] space-y-4 transition-all"
              >
                {/* TOP HEADER ROW: TITLE, MILESTONE & PRIORITY */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 flex items-center gap-1">
                        <Target className="w-3 h-3 shrink-0" />
                        <span>{msLabel} · {msTitle}</span>
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider border ${
                          task.priority === 'urgent'
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                            : task.priority === 'high'
                            ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                            : 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)]'
                        }`}
                      >
                        {task.priority || 'medium'}
                      </span>

                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Submitted for Review</span>
                      </span>
                    </div>

                    <h4
                      onClick={() => onEditTask?.(task)}
                      className="text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] cursor-pointer transition-colors"
                    >
                      {task.title}
                    </h4>
                  </div>

                  {/* SPECIALIST ASSIGNEE */}
                  <div className="flex items-center gap-2.5 bg-[var(--color-background)] px-3 py-1.5 rounded-[8px] border border-[var(--color-border)] shrink-0">
                    <Avatar
                      name={task.assigneeName || 'Specialist'}
                      initials={task.assigneeAvatarInitials || 'SP'}
                      src={task.assigneeAvatarUrl}
                      size="sm"
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                        {task.assigneeName || 'Specialist'}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-mono block">
                        Task Specialist
                      </span>
                    </div>
                  </div>
                </div>

                {/* DELIVERABLE & SUBMISSION NOTES */}
                <div className="bg-[var(--color-background)]/80 rounded-[10px] p-3.5 border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Deliverable Notes & Submission Message</span>
                    </span>
                    {task.submittedForReviewAt && (
                      <span className="text-[var(--color-text-secondary)] text-[10px]">
                        Submitted {new Date(task.submittedForReviewAt).toLocaleDateString()} {new Date(task.submittedForReviewAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-line leading-relaxed">
                    {task.reviewNotes || 'Deliverable submitted for client verification. All acceptance criteria fulfilled.'}
                  </p>
                </div>

                {/* TIME & BUDGET METRICS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--color-surface)] p-3 rounded-[8px] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
                        Actual Logged Time
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
                        <strong className="text-emerald-400">{effectiveLoggedHours.toFixed(1)}h</strong>
                        <span className="text-[var(--color-text-secondary)] font-normal text-[10px]"> / {taskEstimatedHours.toFixed(1)}h est</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
                        Verified Cost (@${taskRate}/h)
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--color-accent-cyan)]">
                        ${taskCost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-start sm:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleTaskSessions(taskId)}
                      className="text-xs font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 p-1.5 rounded hover:bg-[var(--color-background)] transition-colors cursor-pointer"
                    >
                      <span>{sessionsExpanded ? 'Hide' : 'View'} Logged Sessions ({taskEntries.length})</span>
                      {sessionsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE LOGGED SESSIONS LIST */}
                {sessionsExpanded && (
                  <div className="p-3 bg-[var(--color-background)] rounded-[8px] border border-[var(--color-border)] space-y-2 animate-in fade-in duration-150">
                    <span className="text-[10.5px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
                      Individual Work Sessions Logged on this Task
                    </span>
                    {taskEntries.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-secondary)] italic py-1">
                        No separate session breakdown records found. Total hours tracked directly: {taskLoggedHours.toFixed(1)}h.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {taskEntries.map((entry, eIdx) => (
                          <div
                            key={entry.id || eIdx}
                            className="flex items-center justify-between p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)]/70 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-3 h-3 text-[var(--color-text-secondary)] shrink-0" />
                              <span className="font-mono text-[11px] text-[var(--color-text-secondary)] shrink-0">
                                {entry.date}
                              </span>
                              <span className="text-[var(--color-text-primary)] truncate">
                                {entry.description || 'Task work session'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                              <span className="font-bold text-emerald-400">
                                {Number(entry.hours).toFixed(2)}h
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {entry.status || 'pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* INLINE REVISION INPUT FORM */}
                {isRevisionOpen && (
                  <div className="p-3.5 rounded-[10px] bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Specify Changes Requested for Specialist:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveRevisionTaskId(null)}
                        className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={revisionInputs[taskId] || ''}
                      onChange={(e) =>
                        setRevisionInputs((prev) => ({ ...prev, [taskId]: e.target.value }))
                      }
                      placeholder="e.g. Please update the test coverage to 85% and resolve the responsiveness on mobile..."
                      className="w-full text-xs p-2.5 rounded bg-[var(--color-background)] border border-amber-500/40 text-[var(--color-text-primary)] focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveRevisionTaskId(null)}
                        className="text-xs border-[var(--color-border)] hover:bg-[var(--color-background)]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isRevisionProcessing}
                        onClick={() => handleSendRevision(taskId)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isRevisionProcessing ? 'Sending...' : 'Send Revision Request'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS ROW */}
                {!isRevisionOpen && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isApproving || isRevisionProcessing || isReadOnly}
                      onClick={() => setActiveRevisionTaskId(taskId)}
                      className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isApproving || isRevisionProcessing || isReadOnly}
                      onClick={() => handleApprove(taskId)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isApproving ? 'Approving Task...' : 'Approve Task & Settle Hours'}</span>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
