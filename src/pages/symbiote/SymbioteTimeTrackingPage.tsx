import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { TimeEntry, Project, WorkspaceMilestone, WorkspaceTask } from '@/src/types/firestore';
import {
  subscribeToTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from '@/src/lib/firestore/timeEntries';
import { subscribeToProjectsBySymbiote, getProjectById } from '@/src/lib/firestore/projects';
import {
  subscribeToWorkspaceMilestones,
  subscribeToWorkspaceTasks,
} from '@/src/lib/firestore/workspace';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Clock,
  Calendar,
  BarChart2,
  CheckCheck,
  Plus,
  Layers,
  CheckSquare,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Shield,
} from 'lucide-react';

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to parse date string into Date object safely
function parseEntryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Format: "Jan 15" (assume current year)
  const monthMatch = dateStr.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (monthMatch) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIndex = months.indexOf(monthMatch[1].toLowerCase());
    if (mIndex >= 0) {
      const day = parseInt(monthMatch[2], 10);
      const now = new Date();
      return new Date(now.getFullYear(), mIndex, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Format date into clean display format e.g. "Jan 15" or "Aug 26"
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^[A-Za-z]{3}\s\d{1,2}$/.test(dateStr)) return dateStr;
  const d = parseEntryDate(dateStr);
  if (d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
}

// Helper to get Monday of current week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export const SymbioteTimeTrackingPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const uid = firebaseUser?.uid || userProfile?.uid || '';
  const symbioteName =
    userProfile?.displayName ||
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Freelancer');

  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project') || '';

  // Data States
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<WorkspaceMilestone[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Inputs
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(getLocalDateString());
  const [entryHours, setEntryHours] = useState<string>('3');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'error' | 'warning' } | null>(null);

  // Edit Description Modal State
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // Table Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Format decimal hours to human-friendly text: e.g. "5 mins", "1h 30m", "2h"
  const formatHoursToHuman = (hrs: number): string => {
    if (!hrs || isNaN(hrs)) return '0m';
    const totalMinutes = Math.round(hrs * 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  };

  // 1. Subscribe to Projects (Symbiote Assigned Projects ONLY)
  useEffect(() => {
    if (!uid) return;
    const unsubSymbiote = subscribeToProjectsBySymbiote(uid, (symProjects) => {
      const list = symProjects || [];
      setProjects(list);
      if (list.length > 0) {
        if (!selectedProjectId || !list.some((p) => p.id === selectedProjectId)) {
          const match = list.find((p) => p.id === initialProjectId) || list[0];
          if (match?.id) setSelectedProjectId(match.id);
        }
      } else {
        setSelectedProjectId('');
      }
    });

    return () => unsubSymbiote();
  }, [uid, initialProjectId]);

  // 2. Subscribe to Selected Project's Milestones and Tasks
  useEffect(() => {
    if (!selectedProjectId) {
      setMilestones([]);
      setTasks([]);
      return;
    }

    const unsubMilestones = subscribeToWorkspaceMilestones(selectedProjectId, (msList) => {
      setMilestones(msList || []);
    });

    const unsubTasks = subscribeToWorkspaceTasks(selectedProjectId, (taskList) => {
      setTasks(taskList || []);
    });

    return () => {
      unsubMilestones();
      unsubTasks();
    };
  }, [selectedProjectId]);

  // 3. Subscribe to Real-Time Time Entries for this Symbiote
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsub = subscribeToTimeEntries(uid, (entries) => {
      setTimeEntries(entries || []);
      setLoading(false);
    });

    // Listen to cross-component / cross-tab status events
    const handleStatusEvent = (e: any) => {
      const { entryId, status } = e?.detail || {};
      if (entryId && status) {
        setTimeEntries((prev) =>
          prev.map((item) => (item.id === entryId ? { ...item, status } : item))
        );
      }
    };

    window.addEventListener('syncsphere:time-entry-status-changed', handleStatusEvent);

    return () => {
      unsub();
      window.removeEventListener('syncsphere:time-entry-status-changed', handleStatusEvent);
    };
  }, [uid]);

  // Helper toast notification
  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Delete logged entry and roll back task hours
  const handleDeleteEntry = async (entryId: string, taskName?: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry? The task actual logged hours will be updated.')) {
      return;
    }
    try {
      await deleteTimeEntry(entryId);
      showToast(`Time entry deleted successfully.`);
    } catch (err) {
      console.error('Error deleting time entry:', err);
      showToast('Failed to delete time entry.');
    }
  };

  // Open Edit Description Modal
  const handleOpenEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDescription(entry.description || '');
  };

  // Save Updated Description to Firestore
  const handleSaveEdit = async () => {
    if (!editingEntry?.id || !editDescription.trim()) return;
    try {
      setEditSaving(true);
      const cleanDesc = editDescription.trim();
      await updateTimeEntry(editingEntry.id, {
        description: cleanDesc,
      });
      setTimeEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id ? { ...e, description: cleanDesc } : e
        )
      );
      showToast('Description updated successfully.');
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to update description:', err);
      showToast('Failed to update description.');
    } finally {
      setEditSaving(false);
    }
  };

  // When task is selected from dropdown, sync milestone & description
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (!taskId) return;
    const taskObj = tasks.find((t) => t.id === taskId);
    if (taskObj) {
      if (taskObj.milestoneId) {
        setSelectedMilestoneId(taskObj.milestoneId);
      }
      setEntryDescription(taskObj.title);
    }
  };

  // Submit New Time Entry to Firestore
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = parseFloat(entryHours);

    if (!selectedProjectId) {
      showToast('Please select a project');
      return;
    }
    if (tasks.length > 0 && !selectedTaskId) {
      showToast('Please select a Workspace Task for this work session.');
      return;
    }
    if (isNaN(parsedHours) || parsedHours <= 0) {
      showToast('Please enter valid hours greater than 0');
      return;
    }
    if (!entryDescription.trim()) {
      showToast('Please enter a description for this work session');
      return;
    }

    const taskObj = tasks.find((t) => t.id === selectedTaskId);
    const taskTitle = taskObj?.title || undefined;

    // Strict Task Time Cap Protection Check
    if (taskObj) {
      const taskCap = Number(taskObj.maxHours || taskObj.estimatedHours || 0);
      const currentLogged = Number(taskObj.actualHours || taskObj.actualTotalHours || 0);
      if (taskCap > 0 && +(currentLogged + parsedHours).toFixed(2) > taskCap) {
        const remaining = Math.max(0, +(taskCap - currentLogged).toFixed(2));
        showToast(
          remaining > 0
            ? `⚠️ Time Cap Exceeded: Client has set a maximum limit of ${taskCap.toFixed(1)}h for this task (Current logged: ${currentLogged.toFixed(1)}h). You cannot log more than ${remaining.toFixed(1)} remaining hours without client approval.`
            : `⚠️ Time Cap Exceeded: Client has set a maximum limit of ${taskCap.toFixed(1)}h for this task, and it is already fully logged (${currentLogged.toFixed(1)}h). You cannot log additional hours without client approval.`,
          'error'
        );
        return;
      }
    }

    setSubmitting(true);

    let projectObj = projects.find((p) => p.id === selectedProjectId);
    if (!projectObj && selectedProjectId) {
      try {
        const fetched = await getProjectById(selectedProjectId);
        if (fetched) projectObj = fetched;
      } catch (e) {
        console.warn('Could not fetch project info:', e);
      }
    }
    const projectName = projectObj?.title || 'Project';
    const clientOwnerId = projectObj?.clientId || projectObj?.ownerId || (projectObj as any)?.clientUid || undefined;

    const milestoneObj = milestones.find((m) => m.id === selectedMilestoneId);
    const milestoneTitle = milestoneObj?.title || (milestoneObj as any)?.name || undefined;

    const newEntry: Omit<TimeEntry, 'id'> = {
      symbioteId: uid,
      symbioteName,
      projectId: selectedProjectId,
      projectName,
      clientId: clientOwnerId,
      date: entryDate,
      hours: parsedHours,
      description: entryDescription.trim(),
      status: 'pending',
    };
    if (userProfile?.avatarUrl) newEntry.symbioteAvatarUrl = userProfile.avatarUrl;
    if (selectedMilestoneId) newEntry.milestoneId = selectedMilestoneId;
    if (milestoneTitle) newEntry.milestoneTitle = milestoneTitle;
    if (selectedTaskId) newEntry.taskId = selectedTaskId;
    if (taskTitle) newEntry.taskTitle = taskTitle;

    try {
      await createTimeEntry(newEntry);
      showToast(`Logged ${parsedHours}h for "${projectName}" successfully.`);
      setEntryDescription('');
      setSelectedTaskId('');
      setEntryHours('3');
    } catch (err) {
      console.error('Error logging time:', err);
      showToast('Failed to log time entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // REAL COMPUTED AGGREGATIONS
  const stats = useMemo(() => {
    const todayStr = getLocalDateString();
    const now = new Date();
    const monday = getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let todayHours = 0;
    let todaySessions = 0;
    let thisWeekHours = 0;
    let thisMonthHours = 0;

    timeEntries.forEach((entry) => {
      const h = Number(entry.hours) || 0;
      const parsedDate = parseEntryDate(entry.date);

      // Check Today
      if (entry.date === todayStr || (parsedDate && getLocalDateString(parsedDate) === todayStr)) {
        todayHours += h;
        todaySessions += 1;
      }

      // Check This Week (Mon - Sun)
      if (parsedDate && parsedDate >= monday && parsedDate <= sunday) {
        thisWeekHours += h;
      }

      // Check This Month
      if (parsedDate && parsedDate.getFullYear() === currentYear && parsedDate.getMonth() === currentMonth) {
        thisMonthHours += h;
      }
    });

    // If completely brand new / 0 hours, provide sensible default targets
    return {
      todayHours: Number(todayHours.toFixed(1)),
      todaySessions,
      thisWeekHours: Number(thisWeekHours.toFixed(1)),
      thisMonthHours: Number(thisMonthHours.toFixed(1)),
    };
  }, [timeEntries]);

  // REAL WEEKLY BAR CHART CALCULATION (Mon to Sun)
  const weeklyChartData = useMemo(() => {
    const now = new Date();
    const monday = getMonday(now);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysMap: Record<string, { dateStr: string; hours: number }> = {};

    dayLabels.forEach((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      daysMap[label] = {
        dateStr: getLocalDateString(d),
        hours: 0,
      };
    });

    timeEntries.forEach((entry) => {
      const h = Number(entry.hours) || 0;
      const parsedDate = parseEntryDate(entry.date);
      if (!parsedDate) return;
      const entryDateStr = getLocalDateString(parsedDate);

      dayLabels.forEach((label) => {
        if (daysMap[label].dateStr === entryDateStr) {
          daysMap[label].hours += h;
        }
      });
    });

    return dayLabels.map((day) => ({
      day,
      hours: Number(daysMap[day].hours.toFixed(1)),
    }));
  }, [timeEntries]);

  // Filtered & Sorted Time Entries
  const filteredTimeEntries = useMemo(() => {
    return timeEntries
      .filter((entry) => {
        const q = searchQuery.toLowerCase().trim();
        const pName = (entry.projectName || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const taskName = (entry.taskTitle || '').toLowerCase();

        const matchesQuery = !q || pName.includes(q) || desc.includes(q) || taskName.includes(q);
        const matchesStatus =
          statusFilter === 'all' || (entry.status || 'pending').toLowerCase() === statusFilter.toLowerCase();

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = parseEntryDate(a.date)?.getTime() || 0;
        const dateB = parseEntryDate(b.date)?.getTime() || 0;
        return dateB - dateA;
      });
  }, [timeEntries, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 text-white font-semibold text-xs rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 border max-w-md ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 border-rose-500 shadow-rose-950/50'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 border-amber-500 shadow-amber-950/50'
              : 'bg-emerald-600 border-emerald-500 shadow-emerald-950/50'
          }`}
        >
          {toastMessage.type === 'error' || toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <CheckCheck className="w-4 h-4 shrink-0 text-white" />
          )}
          <span className="leading-snug">{toastMessage.text}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Time Tracking</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Log your active project hours, link milestones and tasks, and track weekly productivity.
          </p>
        </div>
      </div>

      {/* TOP 3 STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: TODAY */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 relative flex flex-col justify-between shadow-sm transition-all hover:border-cyan-500/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-normal text-[var(--color-text-secondary)]">Today</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
              {stats.todayHours}h
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              {stats.todaySessions} {stats.todaySessions === 1 ? 'session' : 'sessions'}
            </div>
          </div>
        </div>

        {/* CARD 2: THIS WEEK */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 relative flex flex-col justify-between shadow-sm transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-normal text-[var(--color-text-secondary)]">This Week</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
              {stats.thisWeekHours}h
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">of 40h target</div>
          </div>
        </div>

        {/* CARD 3: THIS MONTH */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 relative flex flex-col justify-between shadow-sm transition-all hover:border-purple-500/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-normal text-[var(--color-text-secondary)]">This Month</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
              {stats.thisMonthHours}h
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              Total monthly hours logged
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: LOG TIME (MANUAL ENTRY) */}
        <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-4">
          {/* CARD HEADER */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">Log Time</h2>
                <p className="text-[11px] text-[var(--color-text-secondary)]">Manual Hours Entry</p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              Auto-aggregates
            </span>
          </div>

          {/* MANUAL ENTRY FORM */}
          <form onSubmit={handleLogTime} className="space-y-3.5">
            {/* 1. PROJECT DROPDOWN */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Project <span className="text-cyan-400">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedMilestoneId('');
                  setSelectedTaskId('');
                }}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all cursor-pointer"
                required
              >
                {projects.length === 0 ? (
                  <option value="">No active assigned projects</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. MILESTONE DROPDOWN (DYNAMIC) */}
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  Milestone
                </span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">Optional</span>
              </label>
              <select
                value={selectedMilestoneId}
                onChange={(e) => {
                  setSelectedMilestoneId(e.target.value);
                  setSelectedTaskId('');
                }}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  {milestones.length > 0 ? '-- General / All Milestones --' : '-- No milestones defined --'}
                </option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                    {m.title || (m as any).name || 'Milestone'} {m.completed ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. TASK DROPDOWN (DYNAMIC) */}
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3 text-cyan-400" />
                  Workspace Task
                </span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">Optional</span>
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  {tasks.length > 0 ? '-- Select Task or Type Custom Below --' : '-- No workspace tasks --'}
                </option>
                {tasks
                  .filter((t) => !selectedMilestoneId || t.milestoneId === selectedMilestoneId)
                  .map((t) => {
                    const cap = Number(t.maxHours || t.estimatedHours || 0);
                    const logged = Number(t.actualHours || t.actualTotalHours || 0);
                    return (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.title} [{logged.toFixed(1)}h logged / {cap > 0 ? `${cap.toFixed(1)}h max cap` : 'flexible'}]
                      </option>
                    );
                  })}
              </select>

              {/* Task Cap & Limit Protection Badge */}
              {selectedTaskId && (() => {
                const currentTask = tasks.find((t) => t.id === selectedTaskId);
                if (!currentTask) return null;
                const cap = Number(currentTask.maxHours || currentTask.estimatedHours || 0);
                const logged = Number(currentTask.actualHours || currentTask.actualTotalHours || 0);
                const remaining = cap > 0 ? Math.max(0, +(cap - logged).toFixed(2)) : null;
                const isCapReached = cap > 0 && logged >= cap;

                return (
                  <div className={`mt-2 p-2 rounded-lg border text-[11px] flex items-center justify-between font-mono ${
                    isCapReached
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : cap > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {cap > 0 ? `Max Cap: ${cap.toFixed(1)}h | Logged: ${logged.toFixed(1)}h` : `Logged: ${logged.toFixed(1)}h (No limit)`}
                      </span>
                    </div>
                    {cap > 0 && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCapReached ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {isCapReached ? 'Cap Reached 🚫' : `${remaining}h remaining`}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 4. DATE AND HOURS ROW */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Date <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Hours <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max="24"
                  value={entryHours}
                  onChange={(e) => setEntryHours(e.target.value)}
                  placeholder="3"
                  required
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* 5. DESCRIPTION */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Description / Work Notes <span className="text-cyan-400">*</span>
              </label>
              <textarea
                rows={3}
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                placeholder="What did you work on?"
                required
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/30 transition-all resize-none"
              />
            </div>

            {/* 6. SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#22D3EE] to-[#34D399] hover:opacity-90 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Logging Time...' : 'Log Time Entry'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: WEEKLY HOURS CHART & TIME LOGS */}
        <div className="lg:col-span-7 space-y-5">
          {/* WEEKLY HOURS CHART CARD */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Weekly Hours</h2>
              <span className="text-xs text-[var(--color-text-secondary)]">Current Week Breakdown</span>
            </div>

            <div className="h-[175px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'dataMax + 2']}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs space-y-1 shadow-xl">
                            <p className="font-semibold text-[var(--color-text-primary)]">{data.day}</p>
                            <p className="text-cyan-400 font-bold font-mono">{data.hours} hours logged</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="var(--color-accent-cyan)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TIME LOGS TABLE CARD */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Time Logs</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-background)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                  {filteredTimeEntries.length}
                </span>
              </div>

              {/* SEARCH AND STATUS FILTER */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent-cyan)] w-36 transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-normal">
                    <th className="pb-3 pr-4 font-normal">Date</th>
                    <th className="pb-3 pr-4 font-normal">Project</th>
                    <th className="pb-3 pr-4 font-normal">Task & Description</th>
                    <th className="pb-3 pr-4 font-normal">Hours</th>
                    <th className="pb-3 pr-4 font-normal">Status</th>
                    <th className="pb-3 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/60">
                  {filteredTimeEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--color-text-secondary)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-6 h-6 text-slate-500" />
                          <p className="text-xs">No time logs match your criteria.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                            }}
                            className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTimeEntries.map((entry) => {
                      const isApproved = (entry.status || 'pending').toLowerCase() === 'approved';
                      const isRejected = (entry.status || '').toLowerCase() === 'rejected';
                      const displayDate = formatDisplayDate(entry.date);
                      const taskTitle = entry.taskTitle;
                      const description = entry.description;

                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-[var(--color-background)]/50 transition-colors group"
                        >
                          <td className="py-3.5 pr-4 text-[var(--color-text-secondary)] whitespace-nowrap font-mono">
                            {displayDate}
                          </td>
                          <td className="py-3.5 pr-4 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                            {entry.projectName}
                          </td>
                          <td className="py-3.5 pr-4 max-w-xs">
                            <div className="truncate text-[var(--color-text-primary)]">
                              {taskTitle ? (
                                <span className="font-medium text-cyan-300 mr-1.5">{taskTitle}</span>
                              ) : null}
                              <span className="text-[var(--color-text-secondary)]">{description}</span>
                            </div>
                            {entry.milestoneTitle && (
                              <div className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                                <Layers className="w-2.5 h-2.5 text-cyan-400" />
                                <span>{entry.milestoneTitle}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 font-semibold text-cyan-400 whitespace-nowrap font-mono">
                            <span>{formatHoursToHuman(entry.hours)}</span>
                            <span className="text-[10.5px] text-[var(--color-text-secondary)] font-normal ml-1.5 opacity-75">
                              ({Number(entry.hours).toFixed(2)}h)
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            {isApproved ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Approved
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 whitespace-nowrap text-right">
                            {entry.id && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(entry)}
                                  className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                  title="Edit description"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntry(entry.id!, entry.taskTitle)}
                                  className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                                  title="Delete log entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT DESCRIPTION MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Edit Time Log Description
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {editingEntry.taskTitle && (
                <div className="text-xs text-[var(--color-text-secondary)] font-mono">
                  Task: <span className="text-cyan-300 font-semibold">{editingEntry.taskTitle}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                  placeholder="Describe work performed..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                disabled={editSaving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving || !editDescription.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent-cyan)] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {editSaving ? 'Saving...' : 'Save Description'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
