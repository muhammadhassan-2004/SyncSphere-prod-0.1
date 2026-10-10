import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { ProjectHeader, ProjectTabType } from '@/src/components/project/ProjectHeader';
import { OverviewTab } from '@/src/components/project/OverviewTab';
import { MilestonesTab } from '@/src/components/project/MilestonesTab';
import { WorkspaceTab } from '@/src/components/project/WorkspaceTab';
import { ProjectTeamTab } from '@/src/components/project/ProjectTeamTab';
import { ProjectFilesTab } from '@/src/components/project/ProjectFilesTab';
import { ProjectProgressTab } from '@/src/components/project/ProjectProgressTab';
import { ProjectActivityTab } from '@/src/components/project/ProjectActivityTab';
import { AddTeamMemberModal } from '@/src/components/project/AddTeamMemberModal';
import { subscribeToProject } from '@/src/lib/firestore/projects';
import {
  subscribeToWorkspaceTasks,
  subscribeToWorkspaceMilestones,
  syncProjectCompletionAndProgress,
} from '@/src/lib/firestore/workspace';
import { Project, WorkspaceTask, WorkspaceMilestone } from '@/src/types/firestore';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';
import {
  TrendingUp,
  Clock,
  ArrowLeft,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId, subTab } = useParams<{ projectId: string; subTab?: string }>();
  const { firebaseUser, currentRole, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab: ProjectTabType =
    (subTab as ProjectTabType) || (searchParams.get('tab') as ProjectTabType) || 'overview';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [milestones, setMilestones] = useState<WorkspaceMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [approvedTeamCount, setApprovedTeamCount] = useState<number>(0);
  const [filesCount, setFilesCount] = useState<number>(0);

  // Real-time Firestore subscription to project document, tasks, and milestones
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubTasks: (() => void) | null = null;
    let unsubMilestones: (() => void) | null = null;

    const unsubProject = subscribeToProject(projectId, (updatedProject) => {
      setProject(updatedProject);
      setLoading(false);

      if (updatedProject) {
        const uid = firebaseUser?.uid;
        const isAdmin = currentRole === 'admin' || userProfile?.role === 'admin';
        const isOwner =
          updatedProject.clientId === uid ||
          updatedProject.ownerId === uid ||
          (updatedProject as any).clientUid === uid ||
          isAdmin;

        if (isOwner) {
          if (!unsubTasks) {
            unsubTasks = subscribeToWorkspaceTasks(projectId, (taskList) => {
              setTasks(taskList);
            });
          }
          if (!unsubMilestones) {
            unsubMilestones = subscribeToWorkspaceMilestones(projectId, (msList) => {
              setMilestones(msList);
            });
          }
        } else {
          setTasks([]);
          setMilestones([]);
          if (unsubTasks) { unsubTasks(); unsubTasks = null; }
          if (unsubMilestones) { unsubMilestones(); unsubMilestones = null; }
        }
      }
    });

    return () => {
      unsubProject();
      if (unsubTasks) unsubTasks();
      if (unsubMilestones) unsubMilestones();
    };
  }, [projectId, firebaseUser?.uid, currentRole, userProfile?.role]);

  const handleTabChange = (newTab: ProjectTabType) => {
    if (newTab === 'overview') {
      navigate(`/client/projects/${projectId}`);
    } else if (newTab === 'workspace') {
      navigate(`/client/projects/${projectId}/workspace`);
    } else {
      navigate(`/client/projects/${projectId}/${newTab}`);
    }
  };

  const handleMemberAdded = () => {
    setToastMessage('Symbiote specialist added to project team successfully!');
  };

  const handleCompleteProject = async () => {
    if (!projectId) return;
    try {
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, {
        status: 'completed',
        progressPct: 100,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await logProjectActivity(projectId, {
        title: 'Project 100% Completed',
        description: 'Client approved deliverables and marked project 100% complete.',
        type: 'milestone',
      });
      setToastMessage('Project marked as 100% completed! You can now leave a 5-star review and settle invoices.');
    } catch (err: any) {
      console.error('Error completing project:', err);
    }
  };

  const handleReopenProject = async () => {
    if (!projectId) return;
    try {
      const { reopenProject } = await import('@/src/lib/firestore/workspace');
      await reopenProject(projectId);
      setToastMessage('Project reopened back to In Progress mode.');
    } catch (err: any) {
      console.error('Error reopening project:', err);
    }
  };

  const pendingReviewsCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'review').length;
  }, [tasks]);

  const allTasksCompleted = useMemo(() => {
    return tasks.length > 0 && tasks.every((t) => t.status === 'completed') && pendingReviewsCount === 0;
  }, [tasks, pendingReviewsCount]);

  const dynamicProgressPct = useMemo(() => {
    if (project?.status === 'completed') return 100;
    if (tasks.length === 0 && milestones.length === 0) {
      return typeof project?.progressPct === 'number' ? project.progressPct : 0;
    }
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    if (tasks.length > 0 && completedTasks === tasks.length) return 100;

    const taskPct = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    const completedMs = milestones.filter((m) => m.completed).length;
    const msPct = milestones.length > 0 ? (completedMs / milestones.length) * 100 : 0;

    if (tasks.length > 0 && milestones.length > 0) {
      return Math.round(taskPct * 0.7 + msPct * 0.3);
    }
    return Math.round(taskPct || msPct || 0);
  }, [tasks, milestones, project]);

  useEffect(() => {
    if (!projectId) return;
    syncProjectCompletionAndProgress(projectId).catch(() => {});
  }, [projectId, tasks.length, milestones.length, pendingReviewsCount]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">
          Connecting to real-time project stream...
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <Card className="p-8 space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-[var(--color-warning-amber)] mx-auto" />
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Project Not Found</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            The requested project could not be located or has been archived.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/client/projects')}>
            Return to My Projects
          </Button>
        </Card>
      </div>
    );
  }

  const currentUserId = firebaseUser?.uid;
  const isAdmin = currentRole === 'admin' || userProfile?.role === 'admin';
  const isOwner =
    project.clientId === currentUserId ||
    project.ownerId === currentUserId ||
    (project as any).clientUid === currentUserId ||
    isAdmin;

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <Card className="p-8 space-y-4 max-w-md mx-auto border-red-500/30 bg-red-950/10">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Access Denied (403)</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            You do not have permission to view or manage this project. This project belongs to another client account.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/client/projects')}>
            Return to My Projects
          </Button>
        </Card>
      </div>
    );
  }

  const existingTeamUids = (project.teamMembers || []).map((m) => m.uid);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* BREADCRUMB / EXIT HEADER */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          id="project-details-back-btn"
          onClick={() => navigate('/client/projects')}
          className="text-xs font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Projects</span>
        </button>
      </div>

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="p-3.5 rounded-[10px] bg-[var(--color-success-green)]/10 border border-[var(--color-success-green)]/30 text-[var(--color-success-green)] text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SHARED PROJECT HEADER COMPONENT (DOES NOT FLICKER ON TAB SWITCH) */}
      <ProjectHeader
        project={project}
        activeTab={currentTab}
        onTabChange={handleTabChange}
        onOpenAddTeamModal={() => setIsAddTeamModalOpen(true)}
        onEditProject={() => navigate(`/client/projects/new/step-1?draftId=${projectId}`)}
        onCompleteProject={handleCompleteProject}
        onReopenProject={handleReopenProject}
        approvedTeamCount={approvedTeamCount}
        filesCount={filesCount}
        pendingReviewsCount={pendingReviewsCount}
        dynamicProgressPct={dynamicProgressPct}
        allTasksCompleted={allTasksCompleted}
      />

      {/* TAB BODY REGION */}
      <div>
        {currentTab === 'overview' && (
          <OverviewTab project={project} onOpenAddTeamModal={() => setIsAddTeamModalOpen(true)} />
        )}

        {currentTab === 'milestones' && (
          <MilestonesTab
            project={project}
            userRole="client"
            isReadOnly={project.status === 'completed'}
            onOpenAddTeamModal={() => setIsAddTeamModalOpen(true)}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspaceTab
            project={project}
            isReadOnly={project.status === 'completed'}
            onCompleteProject={handleCompleteProject}
          />
        )}

        {currentTab === 'team' && (
          <ProjectTeamTab
            project={project}
            onOpenAddTeamModal={() => setIsAddTeamModalOpen(true)}
            onApprovedCountChange={setApprovedTeamCount}
          />
        )}

        {currentTab === 'files' && (
          <ProjectFilesTab
            project={project}
            onFilesCountChange={setFilesCount}
          />
        )}

        {currentTab === 'progress' && (
          <ProjectProgressTab
            projectId={projectId || ''}
            project={project}
            tasks={tasks}
            milestones={milestones}
          />
        )}

        {currentTab === 'activity' && (
          <ProjectActivityTab projectId={projectId || ''} />
        )}
      </div>

      {/* ADD TEAM MEMBER MODAL */}
      <AddTeamMemberModal
        isOpen={isAddTeamModalOpen && project.status !== 'completed' && project.status !== 'closed'}
        projectId={project.id || projectId}
        projectTitle={project.title}
        projectStatus={project.status}
        existingTeamUids={existingTeamUids}
        onClose={() => setIsAddTeamModalOpen(false)}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
};
