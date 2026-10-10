import React, { useState, useEffect } from 'react';
import { Project, WorkspaceTask, WorkspaceMilestone, TaskComment } from '@/src/types/firestore';
import {
  createTask,
  updateTask,
  updateTaskStatus,
  approveTaskByClient,
  requestTaskChanges,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from '@/src/lib/firestore/workspace';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { getCleanProjectTitle } from '@/src/lib/utils/projectBudget';
import {
  X,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  Users,
  Target,
  Link as LinkIcon,
  Layers,
  Sparkles,
  RotateCcw,
  Shield,
  MessageSquare,
  Send,
  Trash2,
  Edit3,
} from 'lucide-react';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  milestones: WorkspaceMilestone[];
  existingTasks: WorkspaceTask[];
  taskToEdit?: WorkspaceTask | null;
  initialMilestoneId?: string;
  initialStatus?: 'todo' | 'in_progress' | 'review' | 'completed';
  onTaskSaved?: () => void;
  onOpenCreateMilestoneModal?: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  project,
  milestones,
  existingTasks,
  taskToEdit,
  initialMilestoneId,
  initialStatus = 'todo',
  onTaskSaved,
  onOpenCreateMilestoneModal,
}) => {
  const projectId = project.id || '';
  const approvedTeamMembers = project.teamMembers || [];
  const { userProfile, firebaseUser } = useAuth();
  const isClientOrAdmin =
    userProfile?.role === 'client' ||
    userProfile?.role === 'admin' ||
    firebaseUser?.uid === (project.clientId || project.ownerId);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'review' | 'completed'>(initialStatus);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [estimatedHours, setEstimatedHours] = useState<number>(8);
  const [maxHours, setMaxHours] = useState<number | ''>('');
  const [actualHours, setActualHours] = useState<number>(0);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [dependencyTaskId, setDependencyTaskId] = useState<string>('');
  
  // Selected team member UIDs (multi-select)
  const [selectedAssigneeUids, setSelectedAssigneeUids] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Review & Approval Action State
  const [isReviewProcessing, setIsReviewProcessing] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const handleApproveFromDrawer = async () => {
    if (!project.id || !taskToEdit?.id) return;
    setIsReviewProcessing(true);
    try {
      await approveTaskByClient(project.id, taskToEdit.id);
      onTaskSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to approve task from drawer:', err);
      setErrorText('Failed to approve task. Please try again.');
    } finally {
      setIsReviewProcessing(false);
    }
  };

  const handleRequestChangesFromDrawer = async () => {
    if (!project.id || !taskToEdit?.id) return;
    if (!showRevisionInput) {
      setShowRevisionInput(true);
      return;
    }
    setIsReviewProcessing(true);
    try {
      await requestTaskChanges(project.id, taskToEdit.id, revisionNotes);
      onTaskSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to request changes from drawer:', err);
      setErrorText('Failed to request changes. Please try again.');
    } finally {
      setIsReviewProcessing(false);
    }
  };

  // Task Comment Handlers
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !projectId || !taskToEdit?.id) return;
    setSubmittingComment(true);
    try {
      const authorName = userProfile?.displayName || firebaseUser?.displayName || 'User';
      const authorRole = (userProfile?.role || 'client') as 'client' | 'symbiote' | 'admin';
      const authorAvatarUrl = userProfile?.avatarUrl || firebaseUser?.photoURL || undefined;
      const authorAvatarInitials = userProfile?.avatarInitials || authorName.slice(0, 2).toUpperCase();

      const newComm = await addTaskComment(projectId, taskToEdit.id, {
        authorId: firebaseUser?.uid || '',
        authorName,
        authorRole,
        authorAvatarUrl,
        authorAvatarInitials,
        content: newCommentText.trim(),
      });

      setComments((prev) => [...prev, newComm]);
      setNewCommentText('');
      onTaskSaved?.();
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      setErrorText('Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !projectId || !taskToEdit?.id) return;
    try {
      await updateTaskComment(projectId, taskToEdit.id, commentId, editingCommentText.trim());
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, content: editingCommentText.trim(), updatedAt: new Date().toISOString() } : c
        )
      );
      setEditingCommentId(null);
      setEditingCommentText('');
      onTaskSaved?.();
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!projectId || !taskToEdit?.id) return;
    try {
      await deleteTaskComment(projectId, taskToEdit.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onTaskSaved?.();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Populate form on edit or open
  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status || 'todo');
      setPriority(taskToEdit.priority || 'medium');
      setEstimatedHours(taskToEdit.estimatedHours || 8);
      setMaxHours(taskToEdit.maxHours !== undefined ? taskToEdit.maxHours : (taskToEdit.estimatedHours || 8));
      setActualHours(taskToEdit.actualHours || 0);
      setMilestoneId(taskToEdit.milestoneId || (milestones[0]?.id || ''));
      setDependencyTaskId(taskToEdit.dependencyTaskId || '');
      setComments(taskToEdit.comments || []);
      setNewCommentText('');
      setEditingCommentId(null);
      setEditingCommentText('');

      if (taskToEdit.assignees && taskToEdit.assignees.length > 0) {
        setSelectedAssigneeUids(taskToEdit.assignees.map((a) => a.uid));
      } else if (taskToEdit.assigneeId) {
        setSelectedAssigneeUids([taskToEdit.assigneeId]);
      } else {
        setSelectedAssigneeUids([]);
      }
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority('medium');
      setEstimatedHours(5);
      setMaxHours(5);
      setActualHours(0);
      setMilestoneId(initialMilestoneId || (milestones[0]?.id || ''));
      setDependencyTaskId('');
      setSelectedAssigneeUids([]);
      setComments([]);
      setNewCommentText('');
      setEditingCommentId(null);
      setEditingCommentText('');
    }
    setErrorText(null);
  }, [isOpen, taskToEdit, initialMilestoneId, initialStatus, milestones]);

  if (!isOpen) return null;

  const toggleAssignee = (uid: string) => {
    if (!isClientOrAdmin) return;
    if (selectedAssigneeUids.includes(uid)) {
      setSelectedAssigneeUids(selectedAssigneeUids.filter((id) => id !== uid));
    } else {
      setSelectedAssigneeUids([...selectedAssigneeUids, uid]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Freelancer Task Guard: Freelancers cannot edit task metadata (title, description, budget, milestones).
    // Freelancers only update task progress status (To Do, In Progress, Submit for Review).
    if (!isClientOrAdmin) {
      if (!taskToEdit) {
        onClose();
        return;
      }
      if (taskToEdit.id && status !== taskToEdit.status) {
        setIsSubmitting(true);
        setErrorText(null);
        try {
          if (status === 'review') {
            const { submitTaskForReview } = await import('@/src/lib/firestore/workspace');
            await submitTaskForReview(projectId, taskToEdit.id);
          } else {
            await updateTaskStatus(projectId, taskToEdit.id, status);
          }
          if (onTaskSaved) onTaskSaved();
          onClose();
        } catch (err: any) {
          setErrorText(err?.message || 'Failed to update task status.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        onClose();
      }
      return;
    }

    if (!title.trim()) {
      setErrorText('Task Title is required.');
      return;
    }
    if (!milestoneId) {
      setErrorText('Please select or create a Milestone for this task.');
      return;
    }

    const finalEstimated = Math.max(0.5, Number(estimatedHours) || 1);
    const finalMax = maxHours !== '' ? Math.max(finalEstimated, Number(maxHours)) : finalEstimated;
    if (maxHours !== '' && Number(maxHours) < finalEstimated) {
      setErrorText('Max Cap Limit cannot be less than Estimated Hours.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    const selectedMilestoneObj = milestones.find((m) => m.id === milestoneId);
    const selectedDependencyTaskObj = existingTasks.find((t) => t.id === dependencyTaskId);

    // Map selected team member objects from approved project.teamMembers
    const assignedObjects = approvedTeamMembers
      .filter((m) => selectedAssigneeUids.includes(m.uid))
      .map((m) => ({
        uid: m.uid,
        displayName: m.displayName,
        avatarInitials: m.avatarInitials || m.displayName.slice(0, 2).toUpperCase(),
        role: m.role,
      }));

    const primaryAssignee = assignedObjects[0];

    try {
      const taskPayload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        estimatedHours: finalEstimated,
        minHours: finalEstimated,
        maxHours: finalMax,
        actualHours: Number(actualHours) || 0,
        milestoneId,
        milestoneTitle: selectedMilestoneObj?.title || selectedMilestoneObj?.name || 'Milestone',
        assignees: assignedObjects,
        projectTitle: project.title || 'Untitled Project',
        createdAt: taskToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (dependencyTaskId && selectedDependencyTaskObj) {
        taskPayload.dependencyTaskId = dependencyTaskId;
        taskPayload.dependencyTaskTitle = selectedDependencyTaskObj.title;
      } else {
        taskPayload.dependencyTaskId = '';
        taskPayload.dependencyTaskTitle = '';
      }

      if (primaryAssignee) {
        taskPayload.assigneeId = primaryAssignee.uid;
        taskPayload.assigneeName = primaryAssignee.displayName;
        taskPayload.assigneeAvatarInitials = primaryAssignee.avatarInitials;
      } else {
        taskPayload.assigneeId = '';
        taskPayload.assigneeName = '';
        taskPayload.assigneeAvatarInitials = '';
      }

      if (taskToEdit && taskToEdit.id) {
        await updateTask(projectId, taskToEdit.id, taskPayload as any);
      } else {
        await createTask(projectId, taskPayload as any);
      }

      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save task error details:', err);
      const msg = err?.message || 'Failed to save task. Please try again.';
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Other tasks available for dependency (excluding current editing task)
  const availableDependencyTasks = existingTasks.filter((t) => t.id !== taskToEdit?.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 flex justify-end">
      <div
        className="relative w-full max-w-lg bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DRAWER HEADER */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between sticky top-0 bg-[var(--color-surface)] z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {taskToEdit ? (isClientOrAdmin ? 'Edit Workspace Task' : 'Task Details & Progress') : 'Add New Task'}
                </h2>
                {!isClientOrAdmin && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/25">
                    Specialist View
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                Project: {getCleanProjectTitle(project.title) || 'Untitled Project'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--color-background)] rounded-[6px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DRAWER FORM BODY */}
        <form onSubmit={handleSave} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {errorText && (
            <div className="p-3 rounded-[8px] bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-xs text-[var(--color-danger-red)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* CLIENT REVIEW & APPROVAL ACTIONS BANNER */}
          {taskToEdit && taskToEdit.status === 'review' && (
            <div className="p-4 rounded-[10px] bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">Awaiting Client Approval</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                  Logged: <strong className="text-emerald-400">{Number(taskToEdit.actualHours || 0).toFixed(1)}h</strong>
                </span>
              </div>

              {taskToEdit.reviewNotes && (
                <div className="text-xs bg-[var(--color-background)]/80 p-2.5 rounded border border-amber-500/20 text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-text-primary)] block mb-1">Specialist Deliverable Notes:</span>
                  <p className="whitespace-pre-line text-[11px]">{taskToEdit.reviewNotes}</p>
                </div>
              )}

              {isClientOrAdmin ? (
                <>
                  {showRevisionInput && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10.5px] font-mono text-amber-300 font-bold block">
                        Revision Feedback for Specialist:
                      </label>
                      <textarea
                        rows={2}
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        placeholder="Describe what needs to be changed or updated..."
                        className="w-full text-xs p-2 rounded bg-[var(--color-background)] border border-amber-500/40 text-[var(--color-text-primary)] focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isReviewProcessing}
                      onClick={handleApproveFromDrawer}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isReviewProcessing ? 'Processing...' : 'Approve & Mark Done'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isReviewProcessing}
                      onClick={handleRequestChangesFromDrawer}
                      className="border-amber-500/40 text-amber-400 hover:bg-amber-500/15 text-xs flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{showRevisionInput ? (isReviewProcessing ? 'Submitting...' : 'Confirm Changes') : 'Request Changes'}</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-300/90 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Submitted for Client Review. You will be notified once reviewed by the client.</span>
                </div>
              )}
            </div>
          )}

          {/* 1. TASK TITLE */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
              Task Title <span className="text-[var(--color-danger-red)]">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
              disabled={!isClientOrAdmin}
              className="text-xs disabled:opacity-80 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* 2. DESCRIPTION */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of deliverables, specs, or acceptance criteria..."
              rows={3}
              disabled={!isClientOrAdmin}
              className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none disabled:opacity-80 disabled:cursor-not-allowed"
            />
          </div>

          {/* 3. MILESTONE SELECTION */}
          <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold text-[var(--color-accent-cyan)] uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Belongs to Milestone <span className="text-[var(--color-danger-red)]">*</span></span>
              </label>

              {onOpenCreateMilestoneModal && isClientOrAdmin && (
                <button
                  type="button"
                  onClick={onOpenCreateMilestoneModal}
                  className="text-[10.5px] font-mono text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Milestone</span>
                </button>
              )}
            </div>

            {milestones.length === 0 ? (
              <div className="p-3 bg-[var(--color-warning-amber)]/10 border border-[var(--color-warning-amber)]/30 rounded-[6px] text-xs text-[var(--color-warning-amber)] flex items-center justify-between gap-2">
                <span>No milestones created yet for this project.</span>
                {onOpenCreateMilestoneModal && isClientOrAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={onOpenCreateMilestoneModal}
                    className="bg-[var(--color-warning-amber)]/20 text-[var(--color-warning-amber)] border-0 h-6 text-[10px]"
                  >
                    Create Milestone
                  </Button>
                )}
              </div>
            ) : (
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                disabled={!isClientOrAdmin}
                className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                required
              >
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.title || ms.name || 'Untitled Milestone'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. STATUS & PRIORITY */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'completed' && taskToEdit?.status !== 'completed' && !isClientOrAdmin) {
                    setErrorText('Specialists must submit tasks for Client Review before they can be marked Completed.');
                    return;
                  }
                  setErrorText(null);
                  setStatus(val as any);
                }}
                className="w-full p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[6px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Submit for Review</option>
                <option value="completed" disabled={!isClientOrAdmin && taskToEdit?.status !== 'completed'}>
                  Completed (Client Approved)
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                disabled={!isClientOrAdmin}
                className="w-full p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[6px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* 5. ESTIMATED HOURS & MAX CAP LIMIT (CLEAN & SIMPLIFIED) */}
          <div className="p-3.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase">
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Time & Effort (Hours)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Estimated Hours */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-[var(--color-text-primary)] block">
                  Estimated Hours <span className="text-[var(--color-danger-red)]">*</span>
                </label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedHours || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    const numVal = val === '' ? 0 : val;
                    setEstimatedHours(numVal);
                    if (maxHours === '' || maxHours === estimatedHours) {
                      setMaxHours(val);
                    }
                  }}
                  placeholder="e.g. 8"
                  disabled={!isClientOrAdmin}
                  className="text-xs disabled:opacity-80 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Max Cap Limit */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-[var(--color-text-primary)] block">
                  Max Cap Limit (Hours)
                </label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={maxHours}
                  onChange={(e) => setMaxHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 10"
                  disabled={!isClientOrAdmin}
                  className="text-xs disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* If editing existing task with logged hours, show summary */}
            {taskToEdit && Number(actualHours) > 0 && (
              <div className="pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> Logged Hours:
                </span>
                <span className="font-bold text-emerald-400">
                  {Number(actualHours).toFixed(1)} hrs
                </span>
              </div>
            )}
          </div>

          {/* 6. TASK DEPENDENCY */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-[var(--color-accent-cyan)]" />
              <span>Dependency (Pre-requisite Task)</span>
            </label>
            <select
              value={dependencyTaskId}
              onChange={(e) => setDependencyTaskId(e.target.value)}
              disabled={!isClientOrAdmin}
              className="w-full p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[6px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
            >
              <option value="">None (No Task Dependency)</option>
              {availableDependencyTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  Must follow: {t.title} ({t.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* 7. TEAM MEMBER ASSIGNMENT */}
          <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] space-y-2.5">
            <label className="text-[11px] font-mono font-bold text-[var(--color-text-primary)] uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                <span>Assign Team Members</span>
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)] normal-case font-mono">
                ({selectedAssigneeUids.length} selected)
              </span>
            </label>

            {approvedTeamMembers.length === 0 ? (
              <div className="p-3 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-[8px] text-[11px] text-[var(--color-text-secondary)] text-center">
                No approved team members on this project yet. Add team members in the <strong>Team</strong> tab.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {approvedTeamMembers.map((member) => {
                  const isSelected = selectedAssigneeUids.includes(member.uid);
                  return (
                    <div
                      key={member.uid}
                      onClick={() => toggleAssignee(member.uid)}
                      className={`p-2 rounded-[8px] border transition-all flex items-center justify-between ${
                        isClientOrAdmin ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isSelected
                          ? 'bg-[var(--color-accent-cyan)]/10 border-[var(--color-accent-cyan)] text-[var(--color-text-primary)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-text-secondary)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={member.displayName}
                          initials={member.avatarInitials}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {member.displayName}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-secondary)] font-mono truncate">
                            {member.role}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)] text-black'
                            : 'border-[var(--color-border)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. TASK COMMENTS & WORK LOG */}
          {taskToEdit && (
            <div className="p-3.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[var(--color-text-primary)] uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  <span>Task Comments & Notes</span>
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]">
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>

              {/* COMMENTS LIST */}
              {comments.length === 0 ? (
                <div className="p-3 bg-[var(--color-surface)]/60 border border-dashed border-[var(--color-border)] rounded-[8px] text-[11px] text-[var(--color-text-secondary)] text-center">
                  No comments on this task yet. Add notes or progress updates below.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {comments.map((comm) => {
                    const isAuthor = comm.authorId === firebaseUser?.uid || userProfile?.role === 'admin';
                    const isEditing = editingCommentId === comm.id;

                    return (
                      <div
                        key={comm.id}
                        className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={comm.authorAvatarUrl}
                              name={comm.authorName}
                              initials={comm.authorAvatarInitials || comm.authorName.slice(0, 2).toUpperCase()}
                              size="xs"
                            />
                            <span className="font-bold text-[var(--color-text-primary)] text-xs">
                              {comm.authorName}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                                comm.authorRole === 'client'
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {comm.authorRole === 'client' ? 'Client' : 'Freelancer'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                              {new Date(comm.createdAt).toLocaleDateString('default', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {isAuthor && !isEditing && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(comm.id);
                                    setEditingCommentText(comm.content);
                                  }}
                                  className="text-[var(--color-text-secondary)] hover:text-cyan-400 transition-colors p-0.5 cursor-pointer"
                                  title="Edit comment"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comm.id)}
                                  className="text-[var(--color-text-secondary)] hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-1.5 pt-1">
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full text-xs p-2 rounded bg-[var(--color-background)] border border-[var(--color-accent-cyan)]/50 text-[var(--color-text-primary)] focus:outline-none resize-none"
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                type="button"
                                size="xs"
                                variant="secondary"
                                onClick={() => setEditingCommentId(null)}
                                className="h-6 text-[10px] px-2 cursor-pointer"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="primary"
                                onClick={() => handleSaveEditComment(comm.id)}
                                className="h-6 text-[10px] px-2 bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[var(--color-text-secondary)] whitespace-pre-line text-xs leading-relaxed">
                            {comm.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ADD COMMENT INPUT */}
              <div className="pt-2 border-t border-[var(--color-border)] flex items-start gap-2">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment or progress note..."
                  className="flex-1 p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={submittingComment || !newCommentText.trim()}
                  onClick={handleAddComment}
                  className="h-9 px-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-xs font-bold rounded-[8px] flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {submittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post</span>
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* DRAWER FOOTER */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between sticky bottom-0 z-10">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isClientOrAdmin ? (taskToEdit ? 'Update Task' : 'Save Task') : 'Update Status'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
