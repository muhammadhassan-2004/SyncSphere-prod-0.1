import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { WorkspaceTask, Project } from '@/src/types/firestore';
import {
  subscribeToWorkspaceTasks,
  updateTaskStatus,
  createTask,
  updateTask,
  deleteTask,
  approveTaskByClient,
  requestTaskChanges,
  syncProjectCompletionAndProgress,
} from '@/src/lib/firestore/workspace';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { SymbioteProfile } from '@/src/data/symbiotes';
import {
  Layout,
  Plus,
  Filter,
  Search,
  MoreVertical,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit2,
  Folder,
  Layers,
  Tag,
  Check,
  X,
  GripVertical,
} from 'lucide-react';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  colorClass: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: 'todo', title: 'To Do', colorClass: 'text-slate-300', badgeBg: 'bg-slate-800 text-slate-300' },
  { id: 'in_progress', title: 'In Progress', colorClass: 'text-[var(--color-accent-cyan)]', badgeBg: 'bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30' },
  { id: 'review', title: 'Review', colorClass: 'text-amber-400', badgeBg: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  { id: 'completed', title: 'Completed', colorClass: 'text-[var(--color-success-green)]', badgeBg: 'bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border-[var(--color-success-green)]/30' },
];

export const WorkspaceKanbanPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || userProfile?.uid || '';

  const navigate = useNavigate();
  const routeParams = useParams<{ projectId?: string }>();
  const [searchParams] = useSearchParams();

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    routeParams.projectId || searchParams.get('projectId') || 'all'
  );

  // Tasks state
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drag & drop state
  const [activeTask, setActiveTask] = useState<WorkspaceTask | null>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<TaskStatus>('todo');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Quick Add / Full Modal Add state
  const [quickAddColumn, setQuickAddColumn] = useState<TaskStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New task form fields
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Frontend');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newEstimatedHours, setNewEstimatedHours] = useState<number>(8);
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [addingTask, setAddingTask] = useState<boolean>(false);
  const [availableSymbiotes, setAvailableSymbiotes] = useState<SymbioteProfile[]>([]);

  // Subscribe to real Symbiotes from Firestore
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((users) => {
      const mapped: SymbioteProfile[] = users.map((u) => ({
        uid: u.uid,
        displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Specialist',
        title: u.title || u.jobTitle || 'AI Specialist',
        avatarInitials: u.avatarInitials || u.displayName?.slice(0, 2).toUpperCase() || 'SP',
        rating: u.rating ?? 0,
        reviewsCount: u.reviewsCount || 0,
        hourlyRate: u.hourlyRate || 150,
        skills: u.skills || [],
        experience: (u.experience as any) || 'Senior',
        availability: (u.availability as any) || 'Immediate',
        location: u.location || 'Remote',
        bio: u.bio || '',
        email: u.email || '',
        completedProjects: u.completedProjects || 0,
      }));
      setAvailableSymbiotes(mapped);
      if (mapped.length > 0) {
        setNewAssigneeId((prev) => prev || mapped[0].uid);
      }
    });
    return () => unsub();
  }, []);

  // Edit task modal / inline state
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);

  // Sensor configuration for dnd-kit (prevents button click conflict)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 1. Subscribe to Client Projects
  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList);
    });
    return () => unsub();
  }, [clientId]);

  // Handle URL route changes
  useEffect(() => {
    if (routeParams.projectId) {
      setSelectedProjectId(routeParams.projectId);
    }
  }, [routeParams.projectId]);

  const currentProject = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const currentProjectId = useMemo(() => {
    if (selectedProjectId !== 'all' && selectedProjectId) return selectedProjectId;
    return projects[0]?.id || '';
  }, [selectedProjectId, projects]);

  const isCurrentProjectCompleted = Boolean(
    currentProject && (currentProject.status === 'completed' || currentProject.status === 'closed')
  );

  // 2. Subscribe to Real-Time Tasks (Single Project vs All Projects)
  useEffect(() => {
    setLoading(true);

    if (selectedProjectId === 'all') {
      const pIds = projects.length > 0 ? projects.map((p) => p.id!).filter(Boolean) : [];
      const tasksMap = new Map<string, WorkspaceTask[]>();
      const unsubs: (() => void)[] = [];

      pIds.forEach((pId) => {
        const unsub = subscribeToWorkspaceTasks(pId, (taskList) => {
          tasksMap.set(pId, taskList || []);
          const combined = Array.from(tasksMap.values()).flat();
          setTasks(combined);
          setLoading(false);
        });
        unsubs.push(unsub);
      });

      if (pIds.length === 0) {
        setTasks([]);
        setLoading(false);
      }

      return () => unsubs.forEach((fn) => fn());
    } else {
      const targetId = selectedProjectId || projects[0]?.id;
      if (!targetId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      const unsub = subscribeToWorkspaceTasks(targetId, (taskList) => {
        setTasks(taskList || []);
        setLoading(false);
        if (targetId && !targetId.startsWith('proj-demo-')) {
          syncProjectCompletionAndProgress(targetId).catch(() => {});
        }
      });

      const handleTaskStatusEvent = (e: any) => {
        const { taskId, status } = e?.detail || {};
        if (taskId && status) {
          setTasks((prev) =>
            prev.map((item) => (item.id === taskId ? { ...item, status } : item))
          );
        }
      };
      window.addEventListener('syncsphere:task-status-changed', handleTaskStatusEvent);

      return () => {
        unsub();
        window.removeEventListener('syncsphere:task-status-changed', handleTaskStatusEvent);
      };
    }
  }, [selectedProjectId, projects]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.assigneeName?.toLowerCase().includes(q);

      const matchesPriority = selectedPriority === 'all' || t.priority === selectedPriority;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;

      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [tasks, searchQuery, selectedPriority, selectedCategory]);

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category));
    return Array.from(set).filter(Boolean);
  }, [tasks]);

  // DRAG & DROP HANDLERS (§18)
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const taskProj = projects.find((p) => p.id === (draggedTask.projectId || currentProjectId));
    if (taskProj && (taskProj.status === 'completed' || taskProj.status === 'closed')) {
      setErrorMsg('This project is completed. Tasks are archived and cannot be moved.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    // Determine target column ID
    let targetStatus: TaskStatus | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const targetTask = tasks.find((t) => t.id === overId);
      if (targetTask) {
        targetStatus = targetTask.status;
      }
    }

    if (!targetStatus || draggedTask.status === targetStatus) return;

    // OPTIMISTIC UI UPDATE
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t))
    );

    // WRITE STATUS FIELD TO FIRESTORE
    try {
      setErrorMsg(null);
      const targetProjId = draggedTask.projectId || currentProjectId;

      if (targetStatus === 'completed') {
        await approveTaskByClient(targetProjId, activeId, firebaseUser?.uid);
      } else if (targetStatus === 'in_progress' && draggedTask.status === 'review') {
        await requestTaskChanges(targetProjId, activeId, 'Client moved task back to In Progress.');
      } else {
        await updateTaskStatus(targetProjId, activeId, targetStatus);
      }
    } catch (err) {
      console.error('Failed to update task status in Firestore:', err);
      // REVERT OPTIMISTIC MOVE ON FAILURE
      setTasks(previousTasks);
      setErrorMsg('Failed to sync task status to server. Reverted move.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // ADD TASK HANDLER
  const handleCreateTask = async (status: TaskStatus) => {
    if (!newTitle.trim() || !currentProjectId || addingTask) return;

    if (isCurrentProjectCompleted) {
      setErrorMsg('Cannot add tasks to a completed or closed project.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setAddingTask(true);
    const assignedSymbiote = availableSymbiotes.find((s) => s.uid === newAssigneeId);

    const taskData: Omit<WorkspaceTask, 'id' | 'projectId'> = {
      title: newTitle.trim(),
      status,
      priority: newPriority,
      category: newCategory || 'General',
      estimatedHours: Number(newEstimatedHours) || 8,
      actualHours: 0,
      assigneeId: newAssigneeId,
      assigneeName: assignedSymbiote?.displayName || 'Assignee',
      assigneeAvatarInitials: assignedSymbiote?.avatarInitials || 'AI',
      assigneeAvatarUrl: assignedSymbiote?.avatarUrl || (assignedSymbiote as any)?.photoURL || '',
      createdAt: new Date().toISOString(),
    };

    try {
      await createTask(currentProjectId, taskData);
      setNewTitle('');
      setNewEstimatedHours(8);
      setQuickAddColumn(null);
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creating task:', err);
      setErrorMsg('Error creating task.');
    } finally {
      setAddingTask(false);
    }
  };

  // DELETE TASK HANDLER
  const handleDeleteTask = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const targetProjId = targetTask?.projectId || currentProjectId;
    if (!targetProjId) return;

    try {
      await deleteTask(targetProjId, taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // UPDATE TASK HANDLER
  const handleSaveEditTask = async () => {
    if (!editingTask || !editingTask.id) return;
    const targetProjId = editingTask.projectId || currentProjectId;
    if (!targetProjId) return;

    try {
      const assignedSymbiote = availableSymbiotes.find((s) => s.uid === editingTask.assigneeId);
      await updateTask(targetProjId, editingTask.id, {
        title: editingTask.title,
        priority: editingTask.priority,
        category: editingTask.category,
        estimatedHours: Number(editingTask.estimatedHours) || 0,
        assigneeId: editingTask.assigneeId,
        assigneeName: editingTask.assigneeName,
        assigneeAvatarInitials: editingTask.assigneeAvatarInitials,
        assigneeAvatarUrl: assignedSymbiote?.avatarUrl || (assignedSymbiote as any)?.photoURL || editingTask.assigneeAvatarUrl || '',
      });
      setEditingTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                Project Workspace
              </h1>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                <Folder className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {selectedProjectId === 'all' ? 'All Projects' : (currentProject?.title || 'Selected Brief')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex items-center gap-3">
          {/* PROJECT BRIEF SELECTOR DROPDOWN */}
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
            }}
            className="h-10 px-3 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
          >
            <option value="all" className="bg-slate-900 text-white">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.title}
              </option>
            ))}
          </select>

          {/* + ADD TASK BUTTON */}
          {!isCurrentProjectCompleted ? (
            <Button
              onClick={() => setShowAddModal(true)}
              className="h-10 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-white font-mono text-xs font-bold rounded-[8px] px-4 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </Button>
          ) : (
            <span className="h-10 px-3.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Project Archived</span>
            </span>
          )}
        </div>
      </div>

      {/* COMPLETED ARCHIVE BANNER */}
      {isCurrentProjectCompleted && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>This project has been marked as completed. The board is in read-only archive mode.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 shrink-0">
            Read Only
          </span>
        </div>
      )}

      {/* ERROR / FEEDBACK NOTIFICATION */}
      {errorMsg && (
        <div className="p-3 rounded-[8px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. SEARCH & FILTER BAR */}
      <Card className="p-3.5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter tasks by title, category, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
            />
          </div>

          {/* PRIORITY FILTER */}
          <div className="w-full md:w-44">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Priorities</option>
              <option value="urgent" className="bg-slate-900 text-white">Urgent</option>
              <option value="high" className="bg-slate-900 text-white">High</option>
              <option value="medium" className="bg-slate-900 text-white">Medium</option>
              <option value="low" className="bg-slate-900 text-white">Low</option>
            </select>
          </div>

          {/* CATEGORY FILTER */}
          <div className="w-full md:w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 3. 4-COLUMN KANBAN BOARD WITH DND-KIT (§11.13 & §18) */}
      {/* MOBILE COLUMN TAB SELECTOR (MAX-WIDTH: 768px) */}
      <div className="flex md:hidden items-center p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] overflow-x-auto gap-1">
        {COLUMNS.map((col) => {
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isQuickAdding = quickAddColumn === col.id;

            return (
              <div
                key={col.id}
                className={mobileActiveColumn === col.id ? 'block' : 'hidden md:block'}
              >
                <KanbanColumnContainer
                  column={col}
                  tasks={colTasks}
                  projects={projects}
                  isQuickAdding={isQuickAdding}
                  setQuickAddColumn={setQuickAddColumn}
                  newTitle={newTitle}
                  setNewTitle={setNewTitle}
                  newCategory={newCategory}
                  setNewCategory={setNewCategory}
                  newPriority={newPriority}
                  setNewPriority={setNewPriority}
                  newAssigneeId={newAssigneeId}
                  setNewAssigneeId={setNewAssigneeId}
                  handleCreateTask={handleCreateTask}
                  addingTask={addingTask}
                  onEditTask={setEditingTask}
                  onDeleteTask={handleDeleteTask}
                  isReadOnly={isCurrentProjectCompleted}
                />
              </div>
            );
          })}
        </div>

        {/* DRAG OVERLAY FOR SMOOTH VISUAL DRAGGING */}
        <DragOverlay>
          {activeTask ? (
            <div className="p-4 rounded-[12px] bg-[var(--color-surface)] border-2 border-[var(--color-accent-cyan)] shadow-2xl opacity-95 pointer-events-none w-72">
              <h4 className="font-bold text-xs text-[var(--color-text-primary)] mb-2">
                {activeTask.title}
              </h4>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
                  {activeTask.category}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  {activeTask.priority}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* FULL ADD TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <span>Create New Workspace Task</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implement Webhook Handler for Stripe"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  >
                    <option value="Frontend" className="bg-slate-900 text-white">Frontend</option>
                    <option value="Backend" className="bg-slate-900 text-white">Backend</option>
                    <option value="AI Swarm" className="bg-slate-900 text-white">AI Swarm</option>
                    <option value="DevOps" className="bg-slate-900 text-white">DevOps</option>
                    <option value="Design" className="bg-slate-900 text-white">Design</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  >
                    <option value="low" className="bg-slate-900 text-white">Low</option>
                    <option value="medium" className="bg-slate-900 text-white">Medium</option>
                    <option value="high" className="bg-slate-900 text-white">High</option>
                    <option value="urgent" className="bg-slate-900 text-white">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Estimated Hours *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 12"
                    value={newEstimatedHours}
                    onChange={(e) => setNewEstimatedHours(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Actual Hours
                  </label>
                  <div className="h-9 px-2.5 flex items-center justify-between rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-mono">
                    <span>0.0 hrs</span>
                    <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Auto-Logged
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Assignee
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                >
                  {availableSymbiotes.map((s) => (
                    <option key={s.uid} value={s.uid} className="bg-slate-900 text-white">
                      {s.displayName} ({s.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setShowAddModal(false)}
                variant="outline"
                className="h-9 border-[var(--color-border)] text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleCreateTask('todo')}
                disabled={!newTitle.trim() || addingTask}
                className="h-9 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold px-4"
              >
                {addingTask ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <span>Edit Task Details</span>
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-[var(--color-text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingTask.category}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, category: e.target.value })
                    }
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  >
                    <option value="low" className="bg-slate-900 text-white">Low</option>
                    <option value="medium" className="bg-slate-900 text-white">Medium</option>
                    <option value="high" className="bg-slate-900 text-white">High</option>
                    <option value="urgent" className="bg-slate-900 text-white">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingTask.estimatedHours ?? 8}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        estimatedHours: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[var(--color-text-secondary)] mb-1">
                    Actual Logged Hours
                  </label>
                  <div className="h-9 px-2.5 flex items-center justify-between rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] font-mono font-semibold text-emerald-400">
                    <span>{Number(editingTask.actualHours || 0).toFixed(1)} hrs</span>
                    <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-normal">
                      Auto-Logged
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Reassign Task
                </label>
                <select
                  value={editingTask.assigneeId || ''}
                  onChange={(e) => {
                    const s = availableSymbiotes.find((m) => m.uid === e.target.value);
                    setEditingTask({
                      ...editingTask,
                      assigneeId: e.target.value,
                      assigneeName: s?.displayName || 'Assignee',
                      assigneeAvatarInitials: s?.avatarInitials || 'AI',
                    });
                  }}
                  className="w-full h-9 px-2.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                >
                  {availableSymbiotes.map((s) => (
                    <option key={s.uid} value={s.uid} className="bg-slate-900 text-white">
                      {s.displayName} ({s.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                onClick={() => {
                  if (editingTask.id) handleDeleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                variant="outline"
                className="h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-mono"
              >
                Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  variant="outline"
                  className="h-9 border-[var(--color-border)] text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEditTask}
                  className="h-9 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold px-4"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// KANBAN COLUMN CONTAINER COMPONENT
// ----------------------------------------------------------------------
interface ColumnProps {
  column: ColumnConfig;
  tasks: WorkspaceTask[];
  projects: Project[];
  isQuickAdding: boolean;
  setQuickAddColumn: (col: TaskStatus | null) => void;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  newPriority: TaskPriority;
  setNewPriority: (val: TaskPriority) => void;
  newAssigneeId: string;
  setNewAssigneeId: (val: string) => void;
  handleCreateTask: (status: TaskStatus) => void;
  addingTask: boolean;
  onEditTask: (task: WorkspaceTask) => void;
  onDeleteTask: (id: string) => void;
  isReadOnly?: boolean;
}

const KanbanColumnContainer: React.FC<ColumnProps> = ({
  column,
  tasks,
  projects,
  isQuickAdding,
  setQuickAddColumn,
  newTitle,
  setNewTitle,
  newCategory,
  setNewCategory,
  newPriority,
  setNewPriority,
  newAssigneeId,
  setNewAssigneeId,
  handleCreateTask,
  addingTask,
  onEditTask,
  onDeleteTask,
  isReadOnly = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id || ''), [tasks]);

  return (
    <Card
      ref={setNodeRef}
      className="p-3 bg-[var(--color-surface)] border-[var(--color-border)] min-h-[500px] flex flex-col gap-3 rounded-[12px]"
    >
      {/* COLUMN HEADER (§11.13) */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)] px-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${column.colorClass}`}>
            {column.title}
          </h3>

          {/* COUNT BADGE */}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${column.badgeBg}`}
          >
            {tasks.length}
          </span>
        </div>

        {/* "+" QUICK ADD ICON */}
        {!isReadOnly && (
          <button
            onClick={() => setQuickAddColumn(isQuickAdding ? null : column.id)}
            title={`Quick add task to ${column.title}`}
            className="p-1 rounded hover:bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* INLINE QUICK ADD FORM */}
      {isQuickAdding && (
        <div className="p-3 bg-[var(--color-background)] border border-[var(--color-accent-cyan)]/50 rounded-[10px] space-y-2.5 animate-fadeIn">
          <input
            type="text"
            placeholder="Quick task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full h-8 px-2.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-sans"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="h-7 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-primary)]"
            >
              <option value="low" className="bg-slate-900 text-white">Low</option>
              <option value="medium" className="bg-slate-900 text-white">Medium</option>
              <option value="high" className="bg-slate-900 text-white">High</option>
              <option value="urgent" className="bg-slate-900 text-white">Urgent</option>
            </select>

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-7 px-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-primary)] flex-1"
            >
              <option value="Frontend" className="bg-slate-900 text-white">Frontend</option>
              <option value="Backend" className="bg-slate-900 text-white">Backend</option>
              <option value="AI Swarm" className="bg-slate-900 text-white">AI Swarm</option>
              <option value="DevOps" className="bg-slate-900 text-white">DevOps</option>
              <option value="Design" className="bg-slate-900 text-white">Design</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setQuickAddColumn(null)}
              className="px-2 py-1 text-[10px] font-mono text-[var(--color-text-secondary)] hover:text-white"
            >
              Cancel
            </button>
            <Button
              onClick={() => handleCreateTask(column.id)}
              disabled={!newTitle.trim() || addingTask}
              size="sm"
              className="h-7 text-[10px] font-mono bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-bold px-3"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* TASK CARDS LIST */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5">
          {tasks.map((task) => (
            <KanbanTaskCardItem
              key={task.id}
              task={task}
              projectTitle={projects.find((p) => p.id === task.projectId)?.title}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}

          {tasks.length === 0 && !isQuickAdding && (
            <div className="py-8 text-center text-[11px] font-mono text-[var(--color-text-secondary)] opacity-60 border border-dashed border-[var(--color-border)] rounded-[10px]">
              Drop task here
            </div>
          )}
        </div>
      </SortableContext>
    </Card>
  );
};

// ----------------------------------------------------------------------
// KANBAN TASK CARD ITEM COMPONENT (§11.13)
// ----------------------------------------------------------------------
interface CardItemProps {
  task: WorkspaceTask;
  projectTitle?: string;
  onEdit: (task: WorkspaceTask) => void;
  onDelete: (id: string) => void;
}

const KanbanTaskCardItem: React.FC<CardItemProps> = ({ task, projectTitle, onEdit, onDelete }) => {
  const { userProfile } = useAuth();
  const isClient = userProfile?.role === 'client' || userProfile?.role === 'admin';
  const [showMenu, setShowMenu] = useState<boolean>(false);

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
      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
      : task.priority === 'high'
      ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
      : task.priority === 'medium'
      ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)]'
      : 'bg-slate-800 border-slate-700 text-slate-400';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/60 rounded-[10px] p-3.5 space-y-3 transition-all shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      {/* CARD TOP ROW (TITLE + DRAG HANDLE) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          <h4 className="text-xs font-bold text-[var(--color-text-primary)] leading-snug break-words">
            {task.title}
          </h4>
        </div>
      </div>

      {/* TAG PILLS: PROJECT + CATEGORY + PRIORITY (§11.13) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {projectTitle && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center gap-1 truncate max-w-[150px]">
            <Folder className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{projectTitle}</span>
          </span>
        )}

        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] flex items-center gap-1">
          <Tag className="w-2.5 h-2.5 text-[var(--color-accent-cyan)]" />
          {task.category || 'General'}
        </span>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${priorityBadgeClass}`}
        >
          {task.priority}
        </span>
      </div>

      {/* HOURS BUDGET & LIVE STOPWATCH ACCUMULATION BAR */}
      <div className="bg-[var(--color-surface)]/60 rounded-[6px] p-2 border border-[var(--color-border)]/50 space-y-1.5 font-mono text-[10px]">
        <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--color-accent-cyan)]" />
            <span>Time Logged</span>
          </span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            <span className="text-emerald-400">{Number(task.actualHours || task.actualTotalHours || 0).toFixed(1)}h</span>
            <span className="text-[var(--color-text-secondary)] font-normal"> / {Number(task.estimatedHours ?? 8).toFixed(1)}h est</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              (Number(task.actualHours || task.actualTotalHours || 0) / (Number(task.estimatedHours) || 8)) > 1
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.round(
                  ((Number(task.actualHours || task.actualTotalHours) || 0) / (Number(task.estimatedHours) || 8)) * 100
                )
              )}%`,
            }}
          />
        </div>
      </div>

      {/* CARD FOOTER: ASSIGNEE AVATAR BOTTOM-LEFT, OVERFLOW MENU (⋮) BOTTOM-RIGHT (§11.13) */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/60">
        {/* ASSIGNEE AVATAR BOTTOM-LEFT */}
        <div className="flex items-center gap-1.5">
          <Avatar
            name={task.assigneeName || 'Specialist'}
            initials={task.assigneeAvatarInitials || 'AI'}
            src={task.assigneeAvatarUrl}
            size="xs"
            className="ring-1 ring-[var(--color-accent-cyan)]/40 shrink-0"
          />
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate max-w-[110px]">
            {task.assigneeName || 'Unassigned'}
          </span>
        </div>

        {/* REVIEW APPROVAL / ACTION BUTTONS (RESTRICTED TO CLIENT / ADMIN) */}
        {task.status === 'review' && (
          isClient ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!task.id) return;
                  try {
                    const { approveTaskByClient } = await import('@/src/lib/firestore/workspace');
                    await approveTaskByClient(task.projectId, task.id);
                  } catch (err) {
                    console.error('Failed to approve task:', err);
                  }
                }}
                title="Approve Task & Mark Complete"
                className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approve</span>
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!task.id) return;
                  const reason = window.prompt('Enter feedback / reason for requested changes:');
                  if (reason === null) return;
                  try {
                    const { requestTaskChanges } = await import('@/src/lib/firestore/workspace');
                    await requestTaskChanges(task.projectId, task.id, reason);
                  } catch (err) {
                    console.error('Failed to request changes:', err);
                  }
                }}
                title="Request Changes on Task"
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>↺ Changes</span>
              </button>
            </div>
          ) : (
            <div
              title="Deliverable is under review by project client"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px]"
            >
              <Clock className="w-3 h-3 animate-pulse" />
              <span>Awaiting Client Review</span>
            </div>
          )
        )}

        {/* OVERFLOW MENU (⋮) BOTTOM-RIGHT */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-7 w-36 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl z-20 py-1 font-mono text-[11px] text-[var(--color-text-primary)]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onEdit(task);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-background)] flex items-center gap-2"
              >
                <Edit2 className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                <span>Edit Task</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onEdit(task);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-background)] flex items-center gap-2"
              >
                <User className="w-3 h-3 text-indigo-400" />
                <span>Reassign</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (task.id) onDelete(task.id);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--color-background)] flex items-center gap-2 text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
