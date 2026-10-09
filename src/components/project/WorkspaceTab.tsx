import React, { useState, useEffect, useMemo } from 'react';
import { Project, WorkspaceTask, WorkspaceMilestone } from '@/src/types/firestore';
import { useAuth } from '@/src/context/AuthContext';
import {
  subscribeToWorkspaceTasks,
  subscribeToWorkspaceMilestones,
  updateTaskStatus,
  deleteTask,
  approveTaskByClient,
  requestTaskChanges,
} from '@/src/lib/firestore/workspace';
import { TaskDrawer } from '@/src/components/project/TaskDrawer';
import { ApprovalsQueueView } from '@/src/components/project/ApprovalsQueueView';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Layers,
  Plus,
  Target,
  Search,
  Filter,
  Clock,
  Link as LinkIcon,
  GripVertical,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LayoutGrid,
  RotateCcw,
} from 'lucide-react';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  colorClass: string;
  badgeBg: string;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'To Do', colorClass: 'text-slate-300', badgeBg: 'bg-slate-800 text-slate-300 border-slate-700' },
  { id: 'in_progress', title: 'In Progress', colorClass: 'text-[var(--color-accent-cyan)]', badgeBg: 'bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30' },
  { id: 'review', title: 'Review', colorClass: 'text-amber-400', badgeBg: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  { id: 'completed', title: 'Completed', colorClass: 'text-[var(--color-success-green)]', badgeBg: 'bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border-[var(--color-success-green)]/30' },
];

interface WorkspaceTabProps {
  project: Project;
  onOpenCreateMilestoneModal?: () => void;
  isReadOnly?: boolean;
  onCompleteProject?: () => void;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({
  project,
  onOpenCreateMilestoneModal,
  isReadOnly,
  onCompleteProject,
}) => {
  const projectId = project.id || '';
  const isProjectCompleted = project.status === 'completed' || isReadOnly;
  const { userProfile, firebaseUser } = useAuth();
  const currentUid = firebaseUser?.uid;
  const isClientOrAdmin = userProfile?.role === 'client' || userProfile?.role === 'admin' || currentUid === (project.clientId || project.ownerId);

  // View Switcher state: 'board' (Kanban) or 'approvals' (List)
  const [viewMode, setViewMode] = useState<'board' | 'approvals'>('board');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time Firestore Tasks & Milestones
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [milestones, setMilestones] = useState<WorkspaceMilestone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');

  // Task Drawer state
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);
  const [drawerInitialStatus, setDrawerInitialStatus] = useState<TaskStatus>('todo');

  // Drag Overlay state
  const [activeTask, setActiveTask] = useState<WorkspaceTask | null>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<TaskStatus>('todo');

  const reviewTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'review').length;
  }, [tasks]);

  const allTasksCompleted = useMemo(() => {
    return tasks.length > 0 && tasks.every((t) => t.status === 'completed') && reviewTasksCount === 0;
  }, [tasks, reviewTasksCount]);

  const handleApproveTask = async (taskId: string) => {
    if (!projectId) return;
    try {
      await approveTaskByClient(projectId, taskId);
      setToastMessage('Task approved successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
  };

  const handleRequestChanges = async (taskId: string, feedback: string) => {
    if (!projectId) return;
    try {
      await requestTaskChanges(projectId, taskId, feedback);
      setToastMessage('Revision request sent to specialist. Task moved back to In Progress.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to request changes:', err);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Subscribe to tasks & milestones
  useEffect(() => {
    if (!projectId) return;

    setLoading(true);

    const unsubTasks = subscribeToWorkspaceTasks(projectId, (ts) => {
      setTasks(ts);
      setLoading(false);
    });

    const unsubMilestones = subscribeToWorkspaceMilestones(projectId, (ms) => {
      setMilestones(ms);
    });

    return () => {
      unsubTasks();
      unsubMilestones();
    };
  }, [projectId]);

  // Filter tasks based on search & dropdowns (Freelancers only see their assigned tasks)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Freelancer visibility: show only tasks assigned to the current freelancer
      if (!isClientOrAdmin && currentUid) {
        const isAssigned =
          task.assigneeId === currentUid ||
          (task.assignees && task.assignees.some((a) => a.uid === currentUid));
        if (!isAssigned) return false;
      }

      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMilestone =
        selectedMilestoneFilter === 'all' || task.milestoneId === selectedMilestoneFilter;

      const matchesPriority =
        selectedPriorityFilter === 'all' || task.priority === selectedPriorityFilter;

      return matchesSearch && matchesMilestone && matchesPriority;
    });
  }, [tasks, searchQuery, selectedMilestoneFilter, selectedPriorityFilter, isClientOrAdmin, currentUid]);

  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = tasks.find((t) => t.id === active.id);
    if (found) setActiveTask(found);
  };

  // Handle Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    if (isProjectCompleted) return;
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetColumnId: TaskStatus | null = null;

    if (['todo', 'in_progress', 'review', 'completed'].includes(overId)) {
      targetColumnId = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) targetColumnId = overTask.status;
    }

    const draggedTask = tasks.find((t) => t.id === activeId);

    if (draggedTask && targetColumnId && draggedTask.status !== targetColumnId) {
      // Disallow direct movement to 'completed' without client approval
      if (targetColumnId === 'completed') {
        if (isClientOrAdmin) {
          await handleApproveTask(activeId);
          return;
        } else {
          setToastMessage('Specialists cannot mark tasks as completed directly. Please submit for Client Review.');
          setTimeout(() => setToastMessage(null), 4500);
          return;
        }
      }

      // Optimistic UI update
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetColumnId as TaskStatus } : t))
      );

      try {
        if (targetColumnId === 'review') {
          const { submitTaskForReview } = await import('@/src/lib/firestore/workspace');
          await submitTaskForReview(projectId, activeId);
        } else {
          await updateTaskStatus(projectId, activeId, targetColumnId);
        }
      } catch (err) {
        console.error('Failed to update task status on drag:', err);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isProjectCompleted) return;
    try {
      await deleteTask(projectId, taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[var(--color-text-secondary)] font-mono flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent-cyan)]" />
        <span>Syncing workspace board...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* COMPLETED / ARCHIVE BANNER */}
      {isProjectCompleted && (
        <div className="p-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 font-mono">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-emerald-200">Project Completed & Archived</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              All tasks and milestones are locked in read-only verification mode. New tasks or status changes are disabled.
            </p>
          </div>
        </div>
      )}

      {/* ALL TASKS COMPLETED CALLOUT BANNER */}
      {!isProjectCompleted && allTasksCompleted && isClientOrAdmin && (
        <div className="p-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-200">All Workspace Tasks Completed!</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                Every task deliverable has been approved. You can now officially mark this project as completed.
              </p>
            </div>
          </div>
          {onCompleteProject && (
            <Button
              size="sm"
              onClick={onCompleteProject}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Complete Project</span>
            </Button>
          )}
        </div>
      )}

      {/* TOAST MESSAGE BANNER */}
      {toastMessage && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER BAR & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-4 sm:p-5 shadow-none">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Workspace
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Live task execution board grouped by status and tagged by milestone
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: VIEW MODE SWITCHER & ADD TASK BUTTON */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* VIEW SWITCHER: BOARD VS APPROVALS */}
          <div className="flex items-center p-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px]">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            {isClientOrAdmin && (
              <button
                type="button"
                onClick={() => setViewMode('approvals')}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'approvals'
                    ? 'bg-[var(--color-surface)] text-amber-400 shadow-xs border border-[var(--color-border)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approvals Queue</span>
                {reviewTasksCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {reviewTasksCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {!isProjectCompleted && allTasksCompleted && isClientOrAdmin && onCompleteProject && (
            <Button
              size="sm"
              onClick={onCompleteProject}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Complete Project</span>
            </Button>
          )}

          {!isProjectCompleted && isClientOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setDrawerInitialStatus('todo');
                setIsTaskDrawerOpen(true);
              }}
              className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* VIEW CONDITIONAL RENDERING */}
      {viewMode === 'approvals' ? (
        <ApprovalsQueueView
          project={project}
          tasks={tasks}
          milestones={milestones}
          onApproveTask={handleApproveTask}
          onRequestChanges={handleRequestChanges}
          onSwitchToBoard={() => setViewMode('board')}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskDrawerOpen(true);
          }}
          isReadOnly={isProjectCompleted}
        />
      ) : (
        <>
          {/* FILTER BAR */}
          <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-3">
            {/* SEARCH INPUT */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>

            {/* DROPDOWN FILTERS */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {/* MILESTONE FILTER */}
              <select
                value={selectedMilestoneFilter}
                onChange={(e) => setSelectedMilestoneFilter(e.target.value)}
                className="h-8 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
              >
                <option value="all">All Milestones ({milestones.length})</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.title || ms.name}
                  </option>
                ))}
              </select>

              {/* PRIORITY FILTER */}
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="h-8 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </Card>

          {/* 4-COLUMN KANBAN BOARD */}
          {/* MOBILE COLUMN TAB SELECTOR (MAX-WIDTH: 768px) */}
          <div className="flex md:hidden items-center p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] overflow-x-auto gap-1">
            {KANBAN_COLUMNS.map((col) => {
              const count = filteredTasks.filter((t) => t.status === col.id).length;
              const isActive = mobileActiveColumn === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileActiveColumn(col.id)}
                  className={`flex-1 min-w-[70px] py-2 px-2 rounded-[7px] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/40 shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span>{col.title}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-[var(--color-accent-cyan)] text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);

                return (
                  <div
                    key={col.id}
                    className={mobileActiveColumn === col.id ? 'block' : 'hidden md:block'}
                  >
                    <KanbanColumn
                      column={col}
                      tasks={colTasks}
                      milestones={milestones}
                      isClientOrAdmin={isClientOrAdmin}
                      isProjectCompleted={isProjectCompleted}
                      onOpenReviewQueue={() => setViewMode('approvals')}
                      onAddTask={() => {
                        setEditingTask(null);
                        setDrawerInitialStatus(col.id);
                        setIsTaskDrawerOpen(true);
                      }}
                      onEditTask={(task) => {
                        setEditingTask(task);
                        setIsTaskDrawerOpen(true);
                      }}
                      onDeleteTask={handleDeleteTask}
                    />
                  </div>
                );
              })}
            </div>

            {/* DRAG OVERLAY */}
            <DragOverlay>
              {activeTask ? (
                <Card className="p-3.5 bg-[var(--color-surface)] border-2 border-[var(--color-accent-cyan)] shadow-2xl opacity-95 pointer-events-none w-72 space-y-2">
                  <h4 className="font-bold text-xs text-[var(--color-text-primary)]">
                    {activeTask.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 flex items-center gap-1 w-fit">
                    <Target className="w-3 h-3" />
                    {activeTask.milestoneTitle || 'Milestone'}
                  </span>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {/* TASK SLIDE-IN SIDE PANEL */}
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
        initialStatus={drawerInitialStatus}
        onOpenCreateMilestoneModal={onOpenCreateMilestoneModal}
      />
    </div>
  );
};

// ----------------------------------------------------------------------
// KANBAN COLUMN COMPONENT
// ----------------------------------------------------------------------
interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: WorkspaceTask[];
  milestones?: WorkspaceMilestone[];
  isClientOrAdmin?: boolean;
  isProjectCompleted?: boolean;
  onOpenReviewQueue?: () => void;
  onAddTask: () => void;
  onEditTask: (task: WorkspaceTask) => void;
  onDeleteTask: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  milestones = [],
  isClientOrAdmin = true,
  isProjectCompleted = false,
  onOpenReviewQueue,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id || ''), [tasks]);

  return (
    <Card
      ref={setNodeRef}
      className="p-3 bg-[var(--color-surface)] border-[var(--color-border)] min-h-[520px] flex flex-col gap-3 rounded-[12px]"
    >
      {/* COLUMN HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] px-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${column.colorClass}`}>
            {column.title}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${column.badgeBg}`}>
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isClientOrAdmin && column.id === 'review' && tasks.length > 0 && onOpenReviewQueue && (
            <button
              type="button"
              onClick={onOpenReviewQueue}
              className="text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
            >
              Queue View →
            </button>
          )}

          {isClientOrAdmin && !isProjectCompleted && (
            <button
              type="button"
              onClick={onAddTask}
              title={`Add task to ${column.title}`}
              className="p-1 rounded hover:bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SORTABLE TASKS LIST */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5">
          {tasks.map((task) => (
            <KanbanCardItem
              key={task.id}
              task={task}
              milestones={milestones}
              isClientOrAdmin={isClientOrAdmin}
              onOpenReviewQueue={onOpenReviewQueue}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}

          {tasks.length === 0 && (
            <div className="py-12 text-center text-[11px] font-mono text-[var(--color-text-secondary)] opacity-60 border border-dashed border-[var(--color-border)] rounded-[10px] flex flex-col items-center gap-1">
              <span>No tasks in {column.title}</span>
              {isClientOrAdmin && !isProjectCompleted && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="text-[var(--color-accent-cyan)] hover:underline font-semibold text-[10.5px] cursor-pointer mt-1"
                >
                  Add Task
                </button>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </Card>
  );
};

// ----------------------------------------------------------------------
// KANBAN TASK CARD ITEM COMPONENT
// ----------------------------------------------------------------------
interface KanbanCardItemProps {
  task: WorkspaceTask;
  milestones?: WorkspaceMilestone[];
  isClientOrAdmin?: boolean;
  onOpenReviewQueue?: () => void;
  onEdit: (task: WorkspaceTask) => void;
  onDelete: (id: string) => void;
}

const KanbanCardItem: React.FC<KanbanCardItemProps> = ({
  task,
  milestones = [],
  isClientOrAdmin = true,
  onOpenReviewQueue,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const matchedMs = milestones.find(
    (m) => m.id === task.milestoneId || (m.title && m.title === task.milestoneTitle)
  );
  const msIndex = matchedMs ? milestones.findIndex((m) => m.id === matchedMs.id) : -1;
  const shortId = msIndex >= 0 ? `M${msIndex + 1}` : 'M1';
  const resolvedMilestoneTitle =
    task.milestoneTitle || matchedMs?.title || matchedMs?.name || milestones[0]?.title || milestones[0]?.name || 'Milestone';

  const fullMilestoneTag = `${shortId} · ${resolvedMilestoneTitle}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityBadgeClass =
    task.priority === 'urgent'
      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
      : task.priority === 'high'
      ? 'bg-amber-400/10 text-amber-300 border-amber-400/20'
      : task.priority === 'medium'
      ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
      : 'bg-slate-800 text-slate-400 border-slate-700/50';

  const assigneesList = task.assignees || (task.assigneeId ? [{
    uid: task.assigneeId,
    displayName: task.assigneeName || 'Specialist',
    avatarInitials: task.assigneeAvatarInitials || 'SP',
    avatarUrl: task.assigneeAvatarUrl,
  }] : []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(task)}
      className="group relative bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 rounded-[10px] p-3.5 space-y-3 transition-all shadow-xs hover:shadow-md cursor-pointer"
    >
      {/* TITLE & GRIP HANDLE */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 cursor-grab" />
          <h4 className="text-xs font-semibold text-slate-100 group-hover:text-[var(--color-accent-cyan)] transition-colors leading-snug break-words">
            {task.title}
          </h4>
        </div>
      </div>

      {/* MILESTONE TAG & PRIORITY (CLEAN PILLS) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
          <Target className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
          <span className="truncate max-w-[190px]">{fullMilestoneTag}</span>
        </span>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${priorityBadgeClass}`}
        >
          {task.priority}
        </span>
      </div>

      {/* DEPENDENCY TAG IF PRESENT */}
      {task.dependencyTaskTitle && (
        <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 truncate">
          <LinkIcon className="w-2.5 h-2.5 shrink-0 text-amber-400" />
          <span className="truncate">Follows: {task.dependencyTaskTitle}</span>
        </div>
      )}

      {/* TIME TRACKED PROGRESS (CLEAN, BORDERLESS) */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1 font-sans">
            <Clock className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
            <span>Logged Time:</span>
            <span className="text-slate-200 font-medium">{Number(task.actualHours || task.actualTotalHours || 0).toFixed(1)}h</span>
          </span>
          <span className="text-slate-400 text-[10.5px]">
            of {Number(task.maxHours || task.estimatedHours || 8).toFixed(1)}h {task.maxHours ? 'cap' : 'est'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              (Number(task.actualHours || task.actualTotalHours || 0) / (Number(task.maxHours || task.estimatedHours) || 8)) > 1
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.round(
                  ((Number(task.actualHours || task.actualTotalHours) || 0) / (Number(task.maxHours || task.estimatedHours) || 8)) * 100
                )
              )}%`,
            }}
          />
        </div>
      </div>

      {/* CARD FOOTER: ACTIONS & ASSIGNEES */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50 text-[11px]">
        <div className="flex items-center gap-2">
          {task.status === 'in_progress' ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (!task.id) return;
                const notes = window.prompt('Add any completion notes or PR link for the client (optional):') || '';
                try {
                  const { submitTaskForReview } = await import('@/src/lib/firestore/workspace');
                  await submitTaskForReview(task.projectId, task.id, notes);
                } catch (err) {
                  console.error('Failed to submit task for review:', err);
                }
              }}
              title="Submit for Client Review & Approval"
              className="px-2.5 py-1 rounded-[6px] bg-[var(--color-accent-cyan)]/15 hover:bg-[var(--color-accent-cyan)]/25 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 font-medium text-[10.5px] transition-colors cursor-pointer"
            >
              Submit for Review →
            </button>
          ) : task.status === 'review' ? (
            isClientOrAdmin ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenReviewQueue) {
                    onOpenReviewQueue();
                  } else {
                    onEdit(task);
                  }
                }}
                title="Open Approvals Queue to review deliverables & approve"
                className="px-2.5 py-1 rounded-[6px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium text-[10.5px] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Review & Approve →</span>
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded-[6px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[10.5px] flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Awaiting Review</span>
              </span>
            )
          ) : task.status === 'completed' ? (
            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Ready to Start</span>
          )}
        </div>

        {/* ASSIGNEES AVATAR STACK */}
        <div className="flex items-center -space-x-1.5">
          {assigneesList.length === 0 ? (
            <span className="text-[11px] text-slate-400">Unassigned</span>
          ) : (
            assigneesList.map((a, idx) => (
              <div key={a.uid || idx} title={a.displayName}>
                <Avatar
                  name={a.displayName}
                  initials={a.avatarInitials}
                  src={(a as any).avatarUrl}
                  size="xs"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
