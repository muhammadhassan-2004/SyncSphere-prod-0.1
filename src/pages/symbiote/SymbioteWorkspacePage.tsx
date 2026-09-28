import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import {
  subscribeToProjectById,
  subscribeToProjectsBySymbiote,
  subscribeToWorkspaceMilestones,
  subscribeToWorkspaceTasks,
  subscribeToTimeEntriesForProject,
  toggleMilestone,
  createMilestone,
  createTask,
  updateTaskStatus,
  deleteTask,
  subscribeToProjectFilesForProject,
  createProjectFile,
  deleteProjectFile,
  subscribeToWorkspaceUpdates,
  createWorkspaceUpdate,
  getUserProfile,
} from '@/src/lib/firestore';
import { uploadFileToCloudinary } from '@/src/lib/storage/cloudinary';
import { triggerFileDownload } from '@/src/lib/storage/download';
import { Project, WorkspaceMilestone, WorkspaceTask, TimeEntry, ProjectFile, WorkspaceUpdate } from '@/src/types/firestore';
import { MilestonesTab } from '@/src/components/project/MilestonesTab';
import { WorkspaceTab } from '@/src/components/project/WorkspaceTab';
import { SymbioteOverviewTab } from '@/src/components/project/SymbioteOverviewTab';
import { ProjectProgressTab } from '@/src/components/project/ProjectProgressTab';
import { ProjectActivityTab } from '@/src/components/project/ProjectActivityTab';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle2,
  Circle,
  Calendar,
  Building,
  CheckSquare,
  ListTodo,
  TrendingUp,
  FileText,
  Activity as ActivityIcon,
  Bell,
  Check,
  Plus,
  Trash2,
  ShieldAlert,
  X,
  Filter,
  Upload,
  Download,
  FileCode,
  Image as ImageIcon,
  Send,
  User,
  Paperclip,
  Target,
  Layers,
  Eye,
} from 'lucide-react';

type SubTab = 'overview' | 'milestones' | 'workspace' | 'files' | 'progress' | 'updates' | 'activity';

export const SymbioteWorkspacePage: React.FC = () => {
  const { projectId: paramProjectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firebaseUser, userProfile, currentRole } = useAuth();
  const uid = firebaseUser?.uid || '';

  const [activeProjectId, setActiveProjectId] = useState<string>(paramProjectId || '');
  const [project, setProject] = useState<Project | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<WorkspaceMilestone[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  // Verify whether current symbiote is assigned to active project
  const currentUserId = firebaseUser?.uid || uid;
  const isAdmin = currentRole === 'admin' || userProfile?.role === 'admin';
  const isAssigned = useMemo(() => {
    if (!project) return false;
    if (isAdmin) return true;
    return (
      project.assignedSymbioteId === currentUserId ||
      (project as any).symbioteId === currentUserId ||
      project.teamMemberUids?.includes(currentUserId) ||
      project.teamMembers?.some((m: any) => m.uid === currentUserId)
    );
  }, [project, currentUserId, isAdmin]);

  // Load all assigned projects to pick fallback if no paramProjectId
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToProjectsBySymbiote(uid, (projList) => {
      setAllProjects(projList);
      if (!paramProjectId && projList.length > 0) {
        setActiveProjectId(projList[0].id!);
      }
    });
    return () => unsub();
  }, [uid, paramProjectId]);

  // Sync activeProjectId with URL param
  useEffect(() => {
    if (paramProjectId) {
      setActiveProjectId(paramProjectId);
    }
  }, [paramProjectId]);

  // Subscribe to real-time Project document
  useEffect(() => {
    if (!activeProjectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubProj = subscribeToProjectById(activeProjectId, (projData) => {
      setProject(projData);
      setLoading(false);
    });

    return () => unsubProj();
  }, [activeProjectId]);

  // Fetch client profile for header client label
  useEffect(() => {
    if (!project || !isAssigned) {
      setClientProfile(null);
      return;
    }
    const cId = project.ownerId || project.clientId;
    if (cId) {
      getUserProfile(cId).then(setClientProfile).catch(() => {});
    }
  }, [project, isAssigned]);

  // Subscribe to Workspace Milestones (Assigned symbiotes only)
  useEffect(() => {
    if (!activeProjectId || !isAssigned) {
      setMilestones([]);
      return;
    }

    const unsubMs = subscribeToWorkspaceMilestones(activeProjectId, (msList) => {
      setMilestones(msList || []);
    });

    return () => unsubMs();
  }, [activeProjectId, isAssigned]);

  // Subscribe to Workspace Tasks (Assigned symbiotes only)
  useEffect(() => {
    if (!activeProjectId || !isAssigned) {
      setTasks([]);
      return;
    }

    const unsubTasks = subscribeToWorkspaceTasks(activeProjectId, (taskList) => {
      setTasks(taskList || []);
    });

    return () => unsubTasks();
  }, [activeProjectId, isAssigned]);

  // Subscribe to Time Entries for this project (Assigned symbiotes only)
  useEffect(() => {
    if (!activeProjectId || !isAssigned) {
      setTimeEntries([]);
      return;
    }

    const unsubTime = subscribeToTimeEntriesForProject(activeProjectId, (entries) => {
      setTimeEntries(entries || []);
    });
    return () => unsubTime();
  }, [activeProjectId, isAssigned]);

  // Files & Updates State
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [workspaceUpdates, setWorkspaceUpdates] = useState<WorkspaceUpdate[]>([]);
  const [newUpdateContent, setNewUpdateContent] = useState<string>('');
  const [postingUpdate, setPostingUpdate] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Subscribe to Project Files (Assigned symbiotes only)
  useEffect(() => {
    if (!activeProjectId || !isAssigned) {
      setProjectFiles([]);
      return;
    }

    const unsubFiles = subscribeToProjectFilesForProject(activeProjectId, (filesList) => {
      setProjectFiles(filesList || []);
    });

    return () => unsubFiles();
  }, [activeProjectId, isAssigned]);

  // Subscribe to Workspace Updates (Assigned symbiotes only)
  useEffect(() => {
    if (!activeProjectId || !isAssigned) {
      setWorkspaceUpdates([]);
      return;
    }

    const unsubUpdates = subscribeToWorkspaceUpdates(activeProjectId, (updatesList) => {
      setWorkspaceUpdates(updatesList || []);
    });

    return () => unsubUpdates();
  }, [activeProjectId, isAssigned]);

  // File Upload & Delete Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    try {
      // Upload directly to Cloudinary storage
      const uploadRes = await uploadFileToCloudinary(file, {
        projectId: activeProjectId,
        folder: `syncsphere/projects/${activeProjectId}`,
        fileName: file.name,
      });

      await createProjectFile({
        projectId: activeProjectId,
        clientId: project?.clientId || project?.ownerId || '',
        name: file.name,
        size: formatSize(uploadRes.bytes || file.size),
        sizeBytes: uploadRes.bytes || file.size,
        type: file.type || 'application/octet-stream',
        category: 'deliverables',
        downloadUrl: uploadRes.url,
        uploadedBy: uid,
        uploadedByName: userProfile?.displayName || 'Specialist',
        uploadedAt: new Date().toISOString(),
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to upload file to Cloudinary:', err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteProjectFile(fileId);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Post Update Handler
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !newUpdateContent.trim()) return;

    setPostingUpdate(true);
    try {
      const authorDisplayName = userProfile?.displayName || firebaseUser?.displayName || project?.assignedSymbioteName || 'Specialist';
      await createWorkspaceUpdate(activeProjectId, {
        content: newUpdateContent.trim(),
        authorUid: uid,
        authorName: authorDisplayName,
        authorRole: 'Lead Specialist',
        createdAt: new Date().toISOString(),
      });
      setNewUpdateContent('');
    } catch (err) {
      console.error('Failed to post update:', err);
    } finally {
      setPostingUpdate(false);
    }
  };

  // Milestone Toggle Handler
  const handleToggleMilestone = async (milestoneId: string, currentCompleted: boolean) => {
    if (!activeProjectId) return;
    try {
      await toggleMilestone(activeProjectId, milestoneId, !currentCompleted);
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  // Activity Feed Filter & Aggregation
  const [activityFilter, setActivityFilter] = useState<'all' | 'milestone' | 'task' | 'file' | 'update' | 'time'>('all');

  const aggregatedActivities = useMemo(() => {
    const events: Array<{
      id: string;
      actorName: string;
      actorAvatar: string;
      actionVerb: string;
      objectDescription: string;
      timestamp: string;
      category: 'milestone' | 'task' | 'file' | 'update' | 'time';
    }> = [];

    const currentUserName = userProfile?.displayName || firebaseUser?.displayName || project?.assignedSymbioteName || 'Specialist';
    const currentUserInitials = currentUserName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'SP';
    const clientName = (project as any)?.clientCompany || project?.clientName || 'Client';
    const clientInitials = clientName.slice(0, 2).toUpperCase() || 'CL';

    // Milestones
    milestones.forEach((ms) => {
      if (ms.completed) {
        events.push({
          id: `ms-comp-${ms.id}`,
          actorName: currentUserName,
          actorAvatar: currentUserInitials,
          actionVerb: 'completed milestone',
          objectDescription: ms.name,
          timestamp: ms.dueDate || project?.createdAt || new Date().toISOString(),
          category: 'milestone',
        });
      } else {
        events.push({
          id: `ms-plan-${ms.id}`,
          actorName: clientName,
          actorAvatar: clientInitials,
          actionVerb: 'scheduled milestone deadline',
          objectDescription: ms.name,
          timestamp: ms.dueDate || new Date().toISOString(),
          category: 'milestone',
        });
      }
    });

    // Tasks
    tasks.forEach((t) => {
      if (t.status === 'completed') {
        events.push({
          id: `task-closed-${t.id}`,
          actorName: currentUserName,
          actorAvatar: currentUserInitials,
          actionVerb: 'closed task',
          objectDescription: t.title,
          timestamp: t.createdAt || new Date().toISOString(),
          category: 'task',
        });
      } else {
        events.push({
          id: `task-created-${t.id}`,
          actorName: currentUserName,
          actorAvatar: currentUserInitials,
          actionVerb: 'added task',
          objectDescription: t.title,
          timestamp: t.createdAt || new Date().toISOString(),
          category: 'task',
        });
      }
    });

    // Files
    projectFiles.forEach((f) => {
      events.push({
        id: `file-${f.id}`,
        actorName: f.uploadedByName || currentUserName,
        actorAvatar: f.uploadedByName ? f.uploadedByName.slice(0, 2).toUpperCase() : currentUserInitials,
        actionVerb: 'uploaded file',
        objectDescription: `${f.name} (${f.size})`,
        timestamp: f.uploadedAt || new Date().toISOString(),
        category: 'file',
      });
    });

    // Updates
    workspaceUpdates.forEach((u) => {
      events.push({
        id: `update-${u.id}`,
        actorName: u.authorName || currentUserName,
        actorAvatar: u.authorName ? u.authorName.slice(0, 2).toUpperCase() : currentUserInitials,
        actionVerb: 'posted update',
        objectDescription: u.content.length > 90 ? `${u.content.slice(0, 90)}...` : u.content,
        timestamp: u.createdAt || new Date().toISOString(),
        category: 'update',
      });
    });

    // Time Entries
    const projectEntries = timeEntries.filter((t) => t.projectId === activeProjectId);
    projectEntries.forEach((te) => {
      events.push({
        id: `time-${te.id}`,
        actorName: currentUserName,
        actorAvatar: currentUserInitials,
        actionVerb: 'logged time',
        objectDescription: `${te.hours} hrs (${te.description || 'Project development'})`,
        timestamp: te.date || te.createdAt || new Date().toISOString(),
        category: 'time',
      });
    });

    // Reverse-chronological (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [milestones, tasks, projectFiles, workspaceUpdates, timeEntries, activeProjectId, project, userProfile, firebaseUser]);

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'Recently';
    const now = Date.now();
    const diffSec = Math.floor((now - time) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateStr).toLocaleDateString('default', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Task State & Handlers
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');

  const handleToggleTask = async (task: WorkspaceTask) => {
    if (!activeProjectId || !task.id) return;
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTaskStatus(activeProjectId, task.id, newStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !newTaskTitle.trim()) return;

    try {
      await createTask(activeProjectId, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        category: newTaskCategory.trim() || 'Development',
        status: 'todo',
        createdAt: new Date().toISOString(),
      });
      setNewTaskTitle('');
      setNewTaskCategory('');
      setNewTaskPriority('medium');
      setIsAddingTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeProjectId) return;
    try {
      await deleteTask(activeProjectId, taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3 max-w-6xl mx-auto">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body font-medium">Loading project workspace from Firestore...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <EmptyStateBlock
          icon={<CheckSquare className="w-6 h-6 text-emerald-400" />}
          title="Project Workspace Not Found"
          description="The requested project workspace could not be located or you do not have permission to view it."
          action={
            <Button
              variant="primary"
              onClick={() => navigate('/symbiote/projects')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
            >
              Back to My Projects
            </Button>
          }
        />
      </div>
    );
  }

  if (!isAssigned) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="p-8 space-y-4 max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-950/10 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Access Denied (403)</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            You are not assigned to this project workspace. Workspaces are restricted to hired specialists and team members.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/symbiote/browse')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium mx-auto cursor-pointer"
          >
            Browse Available Projects
          </Button>
        </div>
      </div>
    );
  }

  // Real Computed Stats
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const totalMilestones = milestones.length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const closedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;

  const projectTimeEntries = timeEntries.filter((t) => t.projectId === activeProjectId);
  const hoursLogged = projectTimeEntries.reduce((acc, curr) => acc + (curr.hours || 0), 0);

  // Days left calculation
  const getDaysLeft = (deadlineStr?: string) => {
    if (!deadlineStr) return 30;
    const due = new Date(deadlineStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((due - now) / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
  const daysLeft = getDaysLeft(project.deadline);

  const clientName =
    clientProfile?.companyName && clientProfile?.displayName && clientProfile.companyName !== clientProfile.displayName
      ? `${clientProfile.displayName} (${clientProfile.companyName})`
      : clientProfile?.displayName ||
        clientProfile?.companyName ||
        (project as any)?.clientName ||
        (project as any)?.companyName ||
        'Client';
  const formattedDeadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString('default', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Oct 15, 2026';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* SHARED WORKSPACE HEADER */}
      <div className="space-y-4 border-b border-[var(--color-border)] pb-5">
        {/* BREADCRUMB */}
        <div>
          <button
            onClick={() => navigate('/symbiote/projects')}
            className="inline-flex items-center gap-1.5 text-caption font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> My Projects
          </button>
        </div>

        {/* TITLE & META + TOP-RIGHT ACTIONS ROW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-h1 font-bold text-[var(--color-text-primary)] leading-tight">
              {project.title}
            </h1>
            <p className="text-body text-[var(--color-text-secondary)] flex flex-wrap items-center gap-3 font-medium">
              <span className="flex items-center gap-1 text-[var(--color-text-primary)] font-semibold">
                <Building className="w-4 h-4 text-cyan-400" /> {clientName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-amber-400" /> Due {formattedDeadline}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold font-mono">
                {milestoneProgress}% Complete
              </span>
            </p>
          </div>

          {/* TOP-RIGHT ACTIONS */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/symbiote/messages?client=${project.clientId || project.ownerId}`)}
              className="border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-cyan-500/40 hover:text-cyan-400 text-caption font-semibold py-2 px-3.5 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>Message Client</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => navigate(`/symbiote/time-tracking?project=${activeProjectId}`)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-caption py-2 px-3.5 border-0 shadow-sm flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              <span>Log Time</span>
            </Button>
          </div>
        </div>

        {/* SUB-NAV TABS (UNDERLINE STYLE) */}
        <div className="flex items-center gap-8 border-b border-[var(--color-border)] pt-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: CheckSquare },
            { id: 'milestones', label: 'Milestones', icon: Target },
            { id: 'workspace', label: 'Workspace', icon: Layers },
            { id: 'files', label: 'Files & Resources', icon: FileText },
            { id: 'progress', label: 'Progress', icon: TrendingUp },
            { id: 'updates', label: 'Updates', icon: Bell },
            { id: 'activity', label: 'Activity', icon: ActivityIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SubTab)}
                className={`py-3 text-caption font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-[var(--color-text-secondary)]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW TAB BODY */}
      {activeTab === 'overview' && project && (
        <SymbioteOverviewTab
          project={project}
          clientProfile={clientProfile}
          hoursLogged={hoursLogged}
          completedMilestones={completedMilestones}
          totalMilestones={totalMilestones}
          closedTasks={closedTasks}
          totalTasks={totalTasks}
          daysLeft={daysLeft}
        />
      )}

      {/* MILESTONES TAB BODY (SPECIALIST DELIVERABLES SUBMISSION & FOLDER EXPLORER) */}
      {activeTab === 'milestones' && project && (
        <MilestonesTab
          project={project}
          isReadOnly={true}
          userRole="specialist"
        />
      )}

      {/* WORKSPACE TAB BODY (FULL KANBAN BOARD) */}
      {activeTab === 'workspace' && project && (
        <WorkspaceTab project={project} />
      )}

      {/* FILES TAB BODY */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-6 shadow-sm">
            {/* HIDDEN FILE INPUT */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* CARD HEADER WITH "↑ UPLOAD" BUTTON */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-h3 font-bold text-[var(--color-text-primary)]">
                  Shared Files
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {projectFiles.length} {projectFiles.length === 1 ? 'File' : 'Files'}
                </span>
              </div>

              {/* UPLOAD BUTTON */}
              <Button
                type="button"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-caption py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>↑ Upload</span>
              </Button>
            </div>

            {/* 2x2 GRID OF FILE CARDS */}
            {projectFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectFiles.map((file) => {
                  const isPdf = file.name.endsWith('.pdf') || file.type.includes('pdf');
                  const isImage = file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.type.includes('image');
                  const isCode = file.name.endsWith('.json') || file.name.endsWith('.ts') || file.name.endsWith('.js') || file.name.endsWith('.swagger');

                  const renderFileIcon = () => {
                    if (isPdf) {
                      return <FileText className="w-6 h-6 text-red-400 shrink-0" />;
                    }
                    if (isImage) {
                      return <ImageIcon className="w-6 h-6 text-cyan-400 shrink-0" />;
                    }
                    if (isCode) {
                      return <FileCode className="w-6 h-6 text-amber-400 shrink-0" />;
                    }
                    return <FileText className="w-6 h-6 text-emerald-400 shrink-0" />;
                  };

                  const formattedDate = file.uploadedAt
                    ? new Date(file.uploadedAt).toLocaleDateString('default', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recently';

                  return (
                    <div
                      key={file.id}
                      className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] hover:border-cyan-500/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {isImage && file.downloadUrl && file.downloadUrl !== '#' && !file.downloadUrl.startsWith('blob:') ? (
                          <div
                            onClick={() => setPreviewFile(file)}
                            className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--color-border)] bg-slate-950 shrink-0 flex items-center justify-center cursor-pointer group/thumb relative shadow-xs"
                            title="Click to preview image"
                          >
                            <img
                              src={file.downloadUrl}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] group-hover:border-emerald-500/30 transition-colors">
                            {renderFileIcon()}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <h4
                            onClick={() => isImage && file.downloadUrl && setPreviewFile(file)}
                            className={`text-body font-bold text-[var(--color-text-primary)] truncate transition-colors ${isImage && file.downloadUrl ? 'cursor-pointer hover:text-cyan-400' : ''}`}
                            title={file.name}
                          >
                            {file.name}
                          </h4>
                          <p className="text-caption text-[var(--color-text-secondary)] font-medium flex items-center gap-2">
                            <span className="font-mono text-[11px]">{file.size}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                          </p>
                          {file.uploadedByName && (
                            <p className="text-[11px] text-[var(--color-text-secondary)]">
                              By {file.uploadedByName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS: PREVIEW + DOWNLOAD ICON + DELETE */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isImage && file.downloadUrl && file.downloadUrl !== '#' && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="p-2 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-cyan-500 hover:text-cyan-400 transition-all cursor-pointer"
                            title="Preview Image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {file.downloadUrl && file.downloadUrl !== '#' ? (
                          <button
                            type="button"
                            onClick={() => triggerFileDownload(file.downloadUrl, file.name)}
                            className="p-2 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-emerald-500 hover:text-emerald-400 transition-all cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const textContent = `SyncSphere Document: ${file.name}\nProject ID: ${file.projectId}\nCategory: ${file.category}\nUploaded By: ${file.uploadedByName || 'User'}\nDate: ${file.uploadedAt}`;
                              const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                              triggerFileDownload(URL.createObjectURL(blob), file.name);
                            }}
                            className="p-2 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-emerald-500 hover:text-emerald-400 transition-all cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id!)}
                          className="p-2 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-red-500/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyStateBlock
                icon={<FileText className="w-6 h-6 text-emerald-400" />}
                title="No Shared Files Yet"
                description="Upload technical specs, agreements, or deliverable assets to share with the client."
                action={
                  <Button
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-caption"
                  >
                    ↑ Upload First File
                  </Button>
                }
              />
            )}
          </Card>
        </div>
      )}

      {/* UPDATES TAB BODY */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          {/* POST UPDATE COMPOSER CARD */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
              <Bell className="w-5 h-5 text-emerald-400" />
              <h2 className="text-h3 font-bold text-[var(--color-text-primary)]">
                Post Project Update
              </h2>
            </div>

            <form onSubmit={handlePostUpdate} className="space-y-3">
              <textarea
                required
                rows={3}
                value={newUpdateContent}
                onChange={(e) => setNewUpdateContent(e.target.value)}
                placeholder="Share a milestone progress report, deployment notes, or blocker update with the project team..."
                className="w-full p-3.5 text-body bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors"
              />

              <div className="flex items-center justify-between">
                <span className="text-caption text-[var(--color-text-secondary)] font-medium">
                  Updates are broadcasted in real-time to the project feed.
                </span>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={postingUpdate || !newUpdateContent.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-caption py-2 px-4 flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{postingUpdate ? 'Posting...' : 'Post Update'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* CHRONOLOGICAL UPDATE FEED */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] space-y-4 shadow-sm">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
              Update History Feed ({workspaceUpdates.length})
            </h3>

            {workspaceUpdates.length > 0 ? (
              <div className="space-y-4">
                {workspaceUpdates.map((update) => {
                  const formattedTime = update.createdAt
                    ? new Date(update.createdAt).toLocaleString('default', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now';

                  const isSymbioteAuthor = update.authorUid === uid || update.authorRole === 'Lead Specialist';

                  return (
                    <div
                      key={update.id}
                      className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] space-y-2.5 transition-all hover:border-cyan-500/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSymbioteAuthor ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {update.authorName ? update.authorName.slice(0, 2).toUpperCase() : 'SP'}
                          </div>

                          <div>
                            <span className="text-body font-bold text-[var(--color-text-primary)] mr-2">
                              {update.authorName || 'Specialist'}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                              isSymbioteAuthor ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {update.authorRole || 'Lead Specialist'}
                            </span>
                          </div>
                        </div>

                        <span className="text-caption font-mono text-[var(--color-text-secondary)]">
                          {formattedTime}
                        </span>
                      </div>

                      <p className="text-body text-[var(--color-text-primary)] leading-relaxed pl-10 whitespace-pre-wrap">
                        {update.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyStateBlock
                icon={<Bell className="w-6 h-6 text-emerald-400" />}
                title="No Updates Posted Yet"
                description="Use the composer above to share project status updates with the client."
              />
            )}
          </Card>
        </div>
      )}

      {/* PROGRESS TAB BODY */}
      {activeTab === 'progress' && (
        <ProjectProgressTab
          projectId={activeProjectId}
          project={project}
          tasks={tasks}
          milestones={milestones}
        />
      )}

      {/* ACTIVITY TAB BODY */}
      {activeTab === 'activity' && (
        <ProjectActivityTab projectId={activeProjectId} />
      )}

      {/* INTERACTIVE FILE PREVIEW MODAL */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-[var(--color-text-primary)] truncate block max-w-md">
                    {previewFile.name}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                    {previewFile.size} · {previewFile.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewFile.downloadUrl && previewFile.downloadUrl !== '#' && (
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(previewFile.downloadUrl, previewFile.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--color-background)] hover:bg-emerald-500/20 text-[var(--color-text-secondary)] hover:text-emerald-400 border border-[var(--color-border)] text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1 min-h-[300px] flex items-center justify-center bg-black/40 p-4">
              {previewFile.downloadUrl && (previewFile.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFile.name)) ? (
                <img
                  src={previewFile.downloadUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg border border-[var(--color-border)]/40"
                />
              ) : previewFile.downloadUrl && (previewFile.type?.includes('pdf') || /\.pdf$/i.test(previewFile.name)) ? (
                <iframe
                  src={previewFile.downloadUrl}
                  className="w-full h-[70vh] rounded-lg border border-[var(--color-border)] bg-white"
                  title={previewFile.name}
                />
              ) : (
                <div className="text-center space-y-3 py-10">
                  <FileText className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs text-[var(--color-text-secondary)] font-mono max-w-sm mx-auto">
                    Direct in-browser preview is not supported for this file format. You can download the file directly to view it locally.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => triggerFileDownload(previewFile.downloadUrl, previewFile.name)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
