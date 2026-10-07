import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { WorkspaceTask, WorkspaceMilestone, WorkspaceUpdate, MilestoneDeliverableItem, TaskComment } from '@/src/types/firestore';
export type { WorkspaceTask, WorkspaceMilestone, WorkspaceUpdate, MilestoneDeliverableItem, TaskComment };
import { createNotification } from '@/src/lib/firestore/notifications';
import { logProjectActivity } from '@/src/lib/firestore/projectActivity';
import { createProjectFile } from '@/src/lib/firestore/projectFiles';

export function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizePayload(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

export async function getWorkspaceTasks(projectId: string): Promise<WorkspaceTask[]> {
  try {
    const colRef = collection(db, 'workspaces', projectId, 'tasks');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, projectId, ...d.data() } as WorkspaceTask));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/tasks`);
    return [];
  }
}

/**
 * Centrally and reactively recalculates and persists project progress and completion status in Firestore.
 * Automatically marks milestones complete when all milestone tasks are done.
 * Automatically marks project status as 'completed' (progressPct: 100) when all tasks & deliverables are finished.
 */
export async function syncProjectCompletionAndProgress(projectId: string): Promise<{
  progressPct: number;
  status: 'draft' | 'open' | 'in_progress' | 'completed';
  isCompleted: boolean;
}> {
  try {
    if (!projectId || !auth.currentUser) return { progressPct: 0, status: 'open', isCompleted: false };

    // 1. Fetch all tasks for project
    const tasksCol = collection(db, 'workspaces', projectId, 'tasks');
    const tasksSnap = await getDocs(tasksCol);
    const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceTask));

    // 2. Fetch all milestones for project
    const msCol = collection(db, 'workspaces', projectId, 'milestones');
    const msSnap = await getDocs(msCol);
    const allMilestones = msSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceMilestone));

    // 3. Auto-update milestones whose tasks are all completed
    for (const ms of allMilestones) {
      const msTasks = allTasks.filter(t => t.milestoneId === ms.id);
      if (msTasks.length > 0) {
        const allDone = msTasks.every(t => t.status === 'completed');
        if (allDone && !ms.completed) {
          ms.completed = true;
          try {
            await updateDoc(doc(db, 'workspaces', projectId, 'milestones', ms.id), {
              completed: true,
              updatedAt: new Date().toISOString(),
            });
          } catch (mErr) {
            console.debug(`[workspace] Milestone auto-update skipped:`, mErr);
          }
        }
      }
    }

    // 4. Calculate progress percentages
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const totalMilestones = allMilestones.length;
    const completedMilestones = allMilestones.filter(m => m.completed).length;

    let calculatedProgress = 0;
    let isCompleted = false;

    if (totalTasks > 0 && totalMilestones > 0) {
      const taskPct = (completedTasks / totalTasks) * 100;
      const msPct = (completedMilestones / totalMilestones) * 100;
      if (taskPct === 100 && msPct === 100) {
        calculatedProgress = 100;
        isCompleted = true;
      } else {
        calculatedProgress = Math.round(taskPct * 0.7 + msPct * 0.3);
      }
    } else if (totalTasks > 0) {
      calculatedProgress = Math.round((completedTasks / totalTasks) * 100);
      if (completedTasks === totalTasks) {
        isCompleted = true;
        calculatedProgress = 100;
      }
    } else if (totalMilestones > 0) {
      calculatedProgress = Math.round((completedMilestones / totalMilestones) * 100);
      if (completedMilestones === totalMilestones) {
        isCompleted = true;
        calculatedProgress = 100;
      }
    }

    // 5. Fetch project document to update
    const projRef = doc(db, 'projects', projectId);
    const projSnap = await getDoc(projRef);

    if (projSnap.exists()) {
      const projData = projSnap.data();
      let targetStatus = projData.status || 'in_progress';

      // Completing a project is an explicit client action triggered via "Complete Project" button.
      // Do NOT automatically force project status to 'completed' here.
      if (projData.status === 'completed' && calculatedProgress < 100 && (totalTasks > 0 || totalMilestones > 0)) {
        targetStatus = 'in_progress';
      } else if (projData.status === 'open' && (calculatedProgress > 0 || totalTasks > 0)) {
        targetStatus = 'in_progress';
      }

      // If project has no tasks or milestones yet but was manually marked completed
      if (totalTasks === 0 && totalMilestones === 0 && projData.status === 'completed') {
        calculatedProgress = 100;
        isCompleted = true;
        targetStatus = 'completed';
      }

      const updates: any = {
        progressPct: calculatedProgress,
        progressPercent: calculatedProgress,
        updatedAt: new Date().toISOString(),
      };

      // Backfill and maintain accurate totalSpent from completed tasks or milestones
      const completedTasksList = allTasks.filter(t => t.status === 'completed');
      let calculatedTasksSpend = 0;
      const projTeam = projData.teamMembers || [];

      for (const t of completedTasksList) {
        if (t.settledAmount && Number(t.settledAmount) > 0) {
          calculatedTasksSpend += Number(t.settledAmount);
        } else {
          const assigneeUid = t.assigneeId || (t.assignees && t.assignees[0]?.uid) || projData.assignedSymbioteId || projData.symbioteId;
          const member = projTeam.find((m: any) => m.uid === assigneeUid);
          const rate = Number(member?.hourlyRate) || Number(t.settledRate) || Number(projData.hourlyRate) || 75;
          const hours = Number(t.actualHours || t.actualTotalHours || t.estimatedHours || 1);
          calculatedTasksSpend += Math.max(25, Math.round(hours * rate));
        }
      }

      // Check completed milestones with explicit amounts if no task spend
      if (calculatedTasksSpend === 0 && allMilestones.length > 0) {
        const completedMilestonesList = allMilestones.filter(m => m.completed);
        for (const m of completedMilestonesList) {
          const mAmount = Number((m as any).amount || 0);
          if (mAmount > 0) {
            calculatedTasksSpend += mAmount;
          }
        }
      }

      const existingSpent = Number(projData.totalSpent || 0);
      if (calculatedTasksSpend > 0 && (existingSpent === 0 || existingSpent < calculatedTasksSpend)) {
        updates.totalSpent = calculatedTasksSpend;
        updates.totalSettledTasks = completedTasksList.length || allMilestones.filter(m => m.completed).length;
      } else if (projData.status === 'completed' && existingSpent === 0 && calculatedTasksSpend === 0) {
        // Fallback for completed legacy projects: check project invoices or agreed deliverable budget
        try {
          const invQuery = query(collection(db, 'invoices'), where('projectId', '==', projectId));
          const invSnap = await getDocs(invQuery);
          let invSpend = 0;
          invSnap.docs.forEach(d => {
            const inv = d.data();
            invSpend += Number(inv.amount || 0);
          });
          if (invSpend > 0) {
            updates.totalSpent = invSpend;
            updates.totalSettledTasks = invSnap.size;
          } else if (projData.budget && typeof projData.budget === 'number' && projData.budget > 0) {
            updates.totalSpent = projData.budget;
          }
        } catch (invErr) {
          console.debug('[workspace] Could not fetch project invoices during sync:', invErr);
        }
      }

      if (targetStatus !== projData.status) {
        updates.status = targetStatus;
        if (targetStatus === 'completed') {
          updates.completedAt = new Date().toISOString();
        }
      }

      try {
        await updateDoc(projRef, updates);
      } catch (updateErr: any) {
        if (updateErr?.code === 'permission-denied' || updateErr?.message?.includes('permission')) {
          console.debug(`[workspace] Progress sync write skipped for ${projectId} (insufficient permissions).`);
        } else {
          console.warn(`[workspace] Could not update project ${projectId}:`, updateErr);
        }
      }

      // If newly transitioned to completed, notify parties and log
      if (targetStatus === 'completed' && projData.status !== 'completed') {
        try {
          await logProjectActivity(projectId, {
            title: 'Project 100% Completed',
            description: 'All workspace tasks and milestone deliverables are 100% verified and complete.',
            type: 'milestone',
          });

          const targets = Array.from(
            new Set([projData.ownerId || projData.clientId, projData.assignedSymbioteId || projData.symbioteId].filter(Boolean))
          ) as string[];

          for (const tid of targets) {
            const isClient = tid === (projData.ownerId || projData.clientId);
            await createNotification({
              userId: tid,
              type: 'milestone',
              title: 'Project 100% Completed! 🎉',
              description: isClient
                ? `Project "${projData.title}" is officially 100% complete. You can now leave a specialist review and settle invoices.`
                : `Project "${projData.title}" has reached 100% completion! Deliverables verified.`,
              read: false,
              relatedItemId: projectId,
              relatedItemLink: isClient ? `/client/projects/${projectId}/review` : `/symbiote/projects`,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (notifErr) {
          console.debug(`[workspace] Notification logging skipped:`, notifErr);
        }
      }

      return {
        progressPct: calculatedProgress,
        status: targetStatus,
        isCompleted: targetStatus === 'completed',
      };
    }

    return {
      progressPct: calculatedProgress,
      status: isCompleted ? 'completed' : 'in_progress',
      isCompleted,
    };
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      console.debug(`[workspace] Sync skipped for ${projectId} (no workspace permissions).`);
    } else {
      console.warn(`[workspace] Failed to sync project progress for ${projectId}:`, error);
    }
    return { progressPct: 0, status: 'in_progress', isCompleted: false };
  }
}

/**
 * Manually marks all tasks and milestones in a project as completed, setting progress to 100%.
 */
export async function completeEntireProjectManually(projectId: string): Promise<void> {
  try {
    const tasksCol = collection(db, 'workspaces', projectId, 'tasks');
    const tasksSnap = await getDocs(tasksCol);
    for (const tDoc of tasksSnap.docs) {
      if (tDoc.data().status !== 'completed') {
        await updateDoc(tDoc.ref, {
          status: 'completed',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const msCol = collection(db, 'workspaces', projectId, 'milestones');
    const msSnap = await getDocs(msCol);
    for (const mDoc of msSnap.docs) {
      if (!mDoc.data().completed) {
        await updateDoc(mDoc.ref, {
          completed: true,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await syncProjectCompletionAndProgress(projectId);

    await logProjectActivity(projectId, {
      title: 'Project Marked as Completed',
      description: 'The project and all associated tasks/milestones were marked completed by the client.',
      type: 'milestone',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}

export async function createTask(projectId: string, task: Omit<WorkspaceTask, 'id' | 'projectId'>): Promise<string> {
  try {
    const colRef = collection(db, 'workspaces', projectId, 'tasks');
    const cleanData = sanitizePayload({
      ...task,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const docRef = await addDoc(colRef, cleanData);

    await logProjectActivity(projectId, {
      title: 'Task Created',
      description: `Created task "${task.title}"`,
      type: 'task',
      actorName: task.assigneeName || 'Team Member',
      actorId: task.assigneeId,
    });

    if (task.assigneeId) {
      await createNotification({
        userId: task.assigneeId,
        type: 'milestone',
        title: 'New Task Assigned',
        description: `You were assigned to task "${task.title}" in workspace.`,
        read: false,
        relatedItemId: docRef.id,
        relatedItemLink: `/symbiote/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    await syncProjectCompletionAndProgress(projectId);

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `workspaces/${projectId}/tasks`);
    return '';
  }
}

export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: WorkspaceTask['status']
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const taskSnap = await getDoc(docRef);
    const taskTitle = taskSnap.exists() ? (taskSnap.data() as WorkspaceTask).title : 'Task';
    
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });

    await logProjectActivity(projectId, {
      title: 'Task Status Updated',
      description: `Task "${taskTitle}" status changed to ${status.replace('_', ' ')}`,
      type: 'task',
    });

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export async function submitTaskForReview(
  projectId: string,
  taskId: string,
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const taskSnap = await getDoc(docRef);
    const taskData = taskSnap.exists() ? (taskSnap.data() as WorkspaceTask) : null;
    const taskTitle = taskData ? taskData.title : 'Task';

    await updateDoc(docRef, {
      status: 'review',
      submittedForReviewAt: new Date().toISOString(),
      reviewNotes: notes || '',
      updatedAt: new Date().toISOString(),
    });

    if (taskData?.assigneeId) {
      await createNotification({
        userId: taskData.assigneeId,
        type: 'milestone',
        title: 'Task Submitted for Review',
        description: `Task "${taskTitle}" was submitted for client review.`,
        read: false,
        relatedItemId: taskId,
        relatedItemLink: `/client/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export const TASK_STATUS_STORAGE_KEY = 'syncsphere_workspace_task_status_overrides';

export function getPersistedTaskStatusOverrides(): Record<string, { status: WorkspaceTask['status']; updatedAt: string }> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(TASK_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistTaskStatusOverride(taskId: string, status: WorkspaceTask['status']): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !taskId) return;
    const overrides = getPersistedTaskStatusOverrides();
    overrides[taskId] = { status, updatedAt: new Date().toISOString() };
    localStorage.setItem(TASK_STATUS_STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('syncsphere:task-status-changed', {
      detail: { taskId, status },
    }));
  } catch (err) {
    console.warn('Failed to persist task status override to localStorage:', err);
  }
}

export async function approveTaskByClient(
  projectId: string,
  taskId: string,
  clientUid?: string
): Promise<void> {
  // 1. Immediately persist locally across navigation and offline/demo modes
  persistTaskStatusOverride(taskId, 'completed');

  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const taskSnap = await getDoc(docRef);
    const taskData = taskSnap.exists() ? (taskSnap.data() as WorkspaceTask) : null;
    const taskTitle = taskData ? taskData.title : 'Task';

    await setDoc(docRef, {
      status: 'completed',
      approvedAt: new Date().toISOString(),
      approvedBy: clientUid || 'Client',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await logProjectActivity(projectId, {
      title: 'Task Approved by Client',
      description: `Task "${taskTitle}" was approved as Done.`,
      type: 'task',
    });

    if (taskData?.assigneeId) {
      await createNotification({
        userId: taskData.assigneeId,
        type: 'milestone',
        title: 'Task Approved ✓',
        description: `Client approved task "${taskTitle}". It is now marked as Completed.`,
        read: false,
        relatedItemId: taskId,
        relatedItemLink: `/symbiote/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-approve any time entries logged against this task
    try {
      const timeColRef = collection(db, 'time_entries');
      const timeQuery = query(timeColRef, where('taskId', '==', taskId));
      const timeSnap = await getDocs(timeQuery);
      for (const tDoc of timeSnap.docs) {
        const entryData = tDoc.data() as Record<string, any>;
        if (entryData?.status !== 'approved') {
          await updateDoc(tDoc.ref, {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (timeErr) {
      console.warn('Could not auto-approve time entries for task:', timeErr);
    }

    // MILESTONE PHASE AUTO-COMPLETION (Milestones as pure phases)
    if (taskData?.milestoneId) {
      try {
        const milestoneId = taskData.milestoneId;
        const tasksCol = collection(db, 'workspaces', projectId, 'tasks');
        const allTasksSnap = await getDocs(tasksCol);
        const milestoneTasks = allTasksSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as WorkspaceTask))
          .filter(t => t.milestoneId === milestoneId);

        const allMilestoneTasksCompleted = milestoneTasks.length > 0 && milestoneTasks.every(t => (t.id === taskId ? true : t.status === 'completed'));

        if (allMilestoneTasksCompleted) {
          const msRef = doc(db, 'workspaces', projectId, 'milestones', milestoneId);
          await updateDoc(msRef, {
            completed: true,
            updatedAt: new Date().toISOString(),
          });

          await logProjectActivity(projectId, {
            title: 'Milestone Phase Completed',
            description: `All tasks under milestone phase "${taskData.milestoneTitle || 'Milestone'}" have been completed and approved.`,
            type: 'milestone',
          });
        }
      } catch (msErr) {
        console.warn('Could not sync milestone phase completion:', msErr);
      }
    }

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export async function requestTaskChanges(
  projectId: string,
  taskId: string,
  feedbackNotes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const taskSnap = await getDoc(docRef);
    const taskData = taskSnap.exists() ? (taskSnap.data() as WorkspaceTask) : null;
    const taskTitle = taskData ? taskData.title : 'Task';

    await updateDoc(docRef, {
      status: 'in_progress',
      reviewNotes: feedbackNotes ? `Client feedback: ${feedbackNotes}` : 'Client requested changes.',
      updatedAt: new Date().toISOString(),
    });

    await logProjectActivity(projectId, {
      title: 'Changes Requested on Task',
      description: `Client requested changes on task "${taskTitle}". Moved back to In Progress.`,
      type: 'task',
    });

    if (taskData?.assigneeId) {
      await createNotification({
        userId: taskData.assigneeId,
        type: 'milestone',
        title: 'Changes Requested on Task',
        description: `Client requested changes on "${taskTitle}": ${feedbackNotes || 'Please review requirements'}`,
        read: false,
        relatedItemId: taskId,
        relatedItemLink: `/symbiote/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export async function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<WorkspaceTask>
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const cleanUpdates = sanitizePayload({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, cleanUpdates);
    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(docRef);
    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workspaces/${projectId}/tasks/${taskId}`);
  }
}

export async function addTaskComment(
  projectId: string,
  taskId: string,
  commentData: Omit<TaskComment, 'id' | 'createdAt'>
): Promise<TaskComment> {
  const newComment: TaskComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...commentData,
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const taskData = snap.data() as WorkspaceTask;
      const existingComments = taskData.comments || [];
      const updatedComments = [...existingComments, newComment];

      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });

      await logProjectActivity(projectId, {
        title: 'Task Comment Added',
        description: `${commentData.authorName} commented on "${taskData.title}": "${commentData.content.slice(0, 60)}${commentData.content.length > 60 ? '...' : ''}"`,
        type: 'task',
        actorName: commentData.authorName,
        actorId: commentData.authorId,
        actorAvatarUrl: commentData.authorAvatarUrl,
        actorAvatarInitials: commentData.authorAvatarInitials,
        actorRole: commentData.authorRole,
      });
    }
    return newComment;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}/comments`);
    return newComment;
  }
}

export async function updateTaskComment(
  projectId: string,
  taskId: string,
  commentId: string,
  newContent: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const taskData = snap.data() as WorkspaceTask;
      const existingComments = taskData.comments || [];
      const updatedComments = existingComments.map((c) =>
        c.id === commentId ? { ...c, content: newContent.trim(), updatedAt: new Date().toISOString() } : c
      );

      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}/comments/${commentId}`);
  }
}

export async function deleteTaskComment(
  projectId: string,
  taskId: string,
  commentId: string
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'tasks', taskId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const taskData = snap.data() as WorkspaceTask;
      const existingComments = taskData.comments || [];
      const updatedComments = existingComments.filter((c) => c.id !== commentId);

      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/tasks/${taskId}/comments/${commentId}`);
  }
}

export function subscribeToWorkspaceTasks(
  projectId: string,
  callback: (tasks: WorkspaceTask[]) => void
): () => void {
  const colRef = collection(db, 'workspaces', projectId, 'tasks');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const overrides = getPersistedTaskStatusOverrides();
      const tasks = snapshot.docs.map(d => {
        const t = { id: d.id, projectId, ...d.data() } as WorkspaceTask;
        if (t.id && overrides[t.id]) {
          return { ...t, status: overrides[t.id].status };
        }
        return t;
      });
      callback(tasks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/tasks`);
    }
  );
}

export async function getWorkspaceMilestones(projectId: string): Promise<WorkspaceMilestone[]> {
  try {
    const colRef = collection(db, 'workspaces', projectId, 'milestones');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, projectId, ...d.data() } as WorkspaceMilestone));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/milestones`);
    return [];
  }
}

export async function createMilestone(
  projectId: string,
  milestone: Omit<WorkspaceMilestone, 'id' | 'projectId'>
): Promise<string> {
  try {
    const colRef = collection(db, 'workspaces', projectId, 'milestones');
    const docRef = await addDoc(colRef, milestone);

    await logProjectActivity(projectId, {
      title: 'Milestone Created',
      description: `Created milestone "${milestone.title || (milestone as any).name || 'Milestone'}"`,
      type: 'milestone',
    });

    await syncProjectCompletionAndProgress(projectId);

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `workspaces/${projectId}/milestones`);
    return '';
  }
}

export async function toggleMilestone(
  projectId: string,
  milestoneId: string,
  completed: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'workspaces', projectId, 'milestones', milestoneId);
    const msSnap = await getDoc(docRef);
    await updateDoc(docRef, { completed });

    if (msSnap.exists()) {
      const msData = msSnap.data() as WorkspaceMilestone;
      const milestoneTitle = msData.title || (msData as any).name || 'Milestone';

      await logProjectActivity(projectId, {
        title: completed ? 'Milestone Completed' : 'Milestone Reopened',
        description: `Marked milestone "${milestoneTitle}" as ${completed ? 'completed' : 'in progress'}`,
        type: 'milestone',
      });

      const projSnap = await getDoc(doc(db, 'projects', projectId));
      if (projSnap.exists()) {
        const pd = projSnap.data();
        const targets = Array.from(new Set([pd.clientId || pd.ownerId, pd.assignedSymbioteId || pd.symbioteId].filter(Boolean))) as string[];
        for (const tid of targets) {
          const isClient = tid === (pd.clientId || pd.ownerId);
          await createNotification({
            userId: tid,
            type: 'milestone',
            title: completed ? 'Milestone Completed' : 'Milestone Updated',
            description: `Milestone "${msData.title || 'Milestone'}" was marked ${completed ? 'complete' : 'incomplete'}.`,
            read: false,
            relatedItemId: milestoneId,
            relatedItemLink: `${isClient ? '/client' : '/symbiote'}/workspace?projectId=${projectId}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/milestones/${milestoneId}`);
  }
}

export async function submitMilestoneForReview(
  projectId: string,
  milestoneId: string,
  payload: {
    deliverables: MilestoneDeliverableItem[];
    repositoryUrl?: string;
    summaryNotes?: string;
    specialistId: string;
    specialistName: string;
  }
): Promise<void> {
  try {
    const msRef = doc(db, 'workspaces', projectId, 'milestones', milestoneId);
    const msSnap = await getDoc(msRef);
    if (!msSnap.exists()) {
      throw new Error('Milestone not found');
    }
    const msData = msSnap.data() as WorkspaceMilestone;
    const msTitle = msData.title || msData.name || 'Milestone';

    const projRef = doc(db, 'projects', projectId);
    const projSnap = await getDoc(projRef);
    const projData = projSnap.exists() ? projSnap.data() : null;
    const clientId = projData?.clientId || projData?.ownerId || '';

    // 1. Update milestone doc
    await updateDoc(msRef, {
      status: 'submitted',
      completed: false, // Remains under review until approved
      submittedAt: new Date().toISOString(),
      submittedBy: payload.specialistId,
      submittedByName: payload.specialistName,
      deliverables: payload.deliverables || [],
      repositoryUrl: payload.repositoryUrl || '',
      summaryNotes: payload.summaryNotes || '',
      updatedAt: new Date().toISOString(),
    });

    // 2. Index deliverables in project_files with clientId hydrated (Issue #37)
    if (payload.deliverables && payload.deliverables.length > 0) {
      for (const file of payload.deliverables) {
        try {
          await createProjectFile({
            projectId,
            projectName: projData?.title || 'Project Deliverables',
            clientId,
            name: file.name,
            size: file.size || '1.0 MB',
            type: file.type || 'application/octet-stream',
            category: 'deliverables',
            downloadUrl: file.url,
            uploadedBy: payload.specialistId,
            uploadedByName: payload.specialistName,
            uploadedAt: file.uploadedAt || new Date().toISOString(),
          });
        } catch (fileErr) {
          console.error('[workspace] Error indexing deliverable file:', fileErr);
        }
      }
    }

    // 3. Log project activity
    await logProjectActivity(projectId, {
      title: 'Milestone Submitted for Review',
      description: `${payload.specialistName} submitted deliverables and task summary for "${msTitle}".`,
      type: 'milestone',
      actorName: payload.specialistName,
      actorId: payload.specialistId,
    });

    // 4. Send notification to client
    if (clientId) {
      await createNotification({
        userId: clientId,
        type: 'milestone',
        title: 'Deliverables Submitted for Review',
        description: `${payload.specialistName} submitted deliverables for milestone "${msTitle}". Please review tasks and approve.`,
        read: false,
        relatedItemId: milestoneId,
        relatedItemLink: `/client/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/milestones/${milestoneId}`);
    throw error;
  }
}

export async function approveMilestoneByClient(
  projectId: string,
  milestoneId: string,
  clientUid?: string
): Promise<void> {
  try {
    const msRef = doc(db, 'workspaces', projectId, 'milestones', milestoneId);
    const msSnap = await getDoc(msRef);
    if (!msSnap.exists()) return;
    const msData = msSnap.data() as WorkspaceMilestone;
    const msTitle = msData.title || msData.name || 'Milestone';

    const projRef = doc(db, 'projects', projectId);
    const projSnap = await getDoc(projRef);
    const projData = projSnap.exists() ? projSnap.data() : null;
    const clientId = projData?.clientId || projData?.ownerId || clientUid || '';

    // 1. Fetch milestone tasks and mark all completed
    const tasksCol = collection(db, 'workspaces', projectId, 'tasks');
    const allTasksSnap = await getDocs(tasksCol);
    const milestoneTasks = allTasksSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as WorkspaceTask))
      .filter((t) => t.milestoneId === milestoneId);

    for (const task of milestoneTasks) {
      if (task.id && task.status !== 'completed') {
        await updateDoc(doc(db, 'workspaces', projectId, 'tasks', task.id), {
          status: 'completed',
          approvedAt: new Date().toISOString(),
          approvedBy: clientUid || 'Client',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Mark milestone completed and approved
    await updateDoc(msRef, {
      completed: true,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: clientUid || 'Client',
      updatedAt: new Date().toISOString(),
    });

    // 3. Notify specialist that milestone was approved
    const symbioteId = msData.submittedBy || projData?.assignedSymbioteId || projData?.symbioteId;
    if (symbioteId) {
      await createNotification({
        userId: symbioteId,
        type: 'milestone',
        title: 'Milestone Approved ✓',
        description: `Client approved milestone "${msTitle}". Deliverables verified.`,
        read: false,
        relatedItemId: milestoneId,
        relatedItemLink: `/symbiote/workspace?projectId=${projectId}`,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Log project activity
    await logProjectActivity(projectId, {
      title: 'Milestone Approved',
      description: `Client approved milestone "${msTitle}". Deliverables verified.`,
      type: 'milestone',
      actorName: 'Client',
      actorId: clientUid || clientId,
    });

    await syncProjectCompletionAndProgress(projectId);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workspaces/${projectId}/milestones/${milestoneId}`);
    throw error;
  }
}

export function subscribeToWorkspaceMilestones(
  projectId: string,
  callback: (milestones: WorkspaceMilestone[]) => void
): () => void {
  const colRef = collection(db, 'workspaces', projectId, 'milestones');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const ms = snapshot.docs.map(d => ({ id: d.id, projectId, ...d.data() } as WorkspaceMilestone));
      callback(ms);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/milestones`);
    }
  );
}

export async function createWorkspaceUpdate(
  projectId: string,
  update: Omit<WorkspaceUpdate, 'id' | 'projectId'>
): Promise<string> {
  try {
    const colRef = collection(db, 'workspaces', projectId, 'updates');
    const docRef = await addDoc(colRef, {
      ...update,
      createdAt: update.createdAt || new Date().toISOString(),
    });

    const projSnap = await getDoc(doc(db, 'projects', projectId));
    if (projSnap.exists()) {
      const pd = projSnap.data();
      const targets = Array.from(new Set([pd.clientId || pd.ownerId, pd.assignedSymbioteId || pd.symbioteId].filter(Boolean))) as string[];
      for (const tid of targets) {
        const isClient = tid === (pd.clientId || pd.ownerId);
        await createNotification({
          userId: tid,
          type: 'milestone',
          title: `Project Update: ${update.title || 'Workspace Update'}`,
          description: update.content || 'A new progress update was posted to the workspace.',
          read: false,
          relatedItemId: docRef.id,
          relatedItemLink: `${isClient ? '/client' : '/symbiote'}/workspace?projectId=${projectId}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `workspaces/${projectId}/updates`);
    return '';
  }
}

export function subscribeToWorkspaceUpdates(
  projectId: string,
  callback: (updates: WorkspaceUpdate[]) => void
): () => void {
  const colRef = collection(db, 'workspaces', projectId, 'updates');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const updatesList = snapshot.docs.map(
        (d) => ({ id: d.id, projectId, ...d.data() } as WorkspaceUpdate)
      );
      // Sort newest first
      updatesList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(updatesList);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${projectId}/updates`);
    }
  );
}

/**
 * Explicitly reopens a completed project back to in_progress status.
 */
export async function reopenProject(projectId: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', projectId);
    await updateDoc(projRef, {
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });
    await logProjectActivity(projectId, {
      title: 'Project Reopened',
      description: 'Client reopened project back to In Progress.',
      type: 'general',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}

