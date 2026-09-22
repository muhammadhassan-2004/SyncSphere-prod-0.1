import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Flag,
  BarChart2,
  TrendingUp,
  Target,
  Calendar,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { WorkspaceTask, WorkspaceMilestone, Project } from '@/src/types/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ProjectProgressTabProps {
  projectId: string;
  project?: Project | null;
  tasks?: WorkspaceTask[];
  milestones?: WorkspaceMilestone[];
}

export const ProjectProgressTab: React.FC<ProjectProgressTabProps> = ({
  projectId,
  project,
  tasks = [],
  milestones = [],
}) => {
  // Calculated stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.completed).length;

  // Overall completion score (weighted between milestones 60% and tasks 40%)
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const overallCompletion = Math.round(
    totalMilestones > 0 && totalTasks > 0
      ? milestoneProgress * 0.5 + taskProgress * 0.5
      : totalMilestones > 0
      ? milestoneProgress
      : totalTasks > 0
      ? taskProgress
      : 0
  );

  // Chart data for milestones
  const milestoneChartData = useMemo(() => {
    return milestones.map((m, idx) => {
      const msTasks = tasks.filter((t) => t.milestoneId === m.id);
      const msCompletedTasks = msTasks.filter((t) => t.status === 'completed').length;
      const pct = msTasks.length > 0 ? Math.round((msCompletedTasks / msTasks.length) * 100) : 0;

      return {
        id: m.id || `ms-${idx}`,
        shortId: `M${idx + 1}`,
        name: m.title || (m as any).name || `Milestone ${idx + 1}`,
        progress: pct,
        isCompleted: m.completed,
        tasksCount: msTasks.length,
        completedTasksCount: msCompletedTasks,
        dueDate: m.dueDate || 'TBD',
      };
    });
  }, [milestones, tasks]);

  // Priority breakdown
  const priorityStats = useMemo(() => {
    const high = tasks.filter((t) => t.priority === 'high').length;
    const medium = tasks.filter((t) => t.priority === 'medium').length;
    const low = tasks.filter((t) => t.priority === 'low').length;
    return { high, medium, low };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* OVERALL PROJECT HEALTH & SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Completion */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 font-bold font-mono text-[var(--color-text-primary)]">
              {overallCompletion}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">complete</span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallCompletion}%` }}
            />
          </div>
        </Card>

        {/* Milestones Completed */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Milestones
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Flag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 font-bold font-mono text-[var(--color-text-primary)]">
              {completedMilestones}
            </span>
            <span className="text-caption text-[var(--color-text-secondary)] font-mono">
              / {totalMilestones} Completed
            </span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* Tasks Progress */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Tasks Closed
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 font-bold font-mono text-[var(--color-text-primary)]">
              {completedTasks}
            </span>
            <span className="text-caption text-[var(--color-text-secondary)] font-mono">
              / {totalTasks} Tasks
            </span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* In Progress Tasks */}
        <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Active Work
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-h1 font-bold font-mono text-[var(--color-text-primary)]">
              {inProgressTasks}
            </span>
            <span className="text-caption text-[var(--color-text-secondary)] font-mono">
              In Progress
            </span>
          </div>
          <div className="text-caption text-[var(--color-text-secondary)]">
            {todoTasks} items remaining in queue
          </div>
        </Card>
      </div>

      {/* MILESTONE TIMELINE & PROGRESS CHART */}
      <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-h3 font-bold text-[var(--color-text-primary)]">
              Milestone Progress Breakdown
            </h3>
          </div>
          <span className="text-caption font-mono text-[var(--color-text-secondary)]">
            {milestoneChartData.length} Milestones Tracked
          </span>
        </div>

        {milestoneChartData.length > 0 ? (
          <div className="space-y-6">
            {/* Recharts Bar Visualization */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={milestoneChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="shortId" stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Progress']}
                    labelFormatter={(label: any) => {
                      const ms = milestoneChartData.find((m) => m.shortId === label);
                      return ms ? `${ms.shortId}: ${ms.name}` : label;
                    }}
                  />
                  <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                    {milestoneChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.progress === 100 ? '#10b981' : entry.progress > 0 ? '#3b82f6' : '#6b7280'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Row Listing of Milestones */}
            <div className="space-y-3 pt-2">
              <h4 className="text-caption font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Milestone Status List
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {milestoneChartData.map((ms) => (
                  <div
                    key={ms.id}
                    className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded shrink-0 border ${
                        ms.progress === 100 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : ms.progress > 0 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                      }`}>
                        {ms.shortId}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-[var(--color-text-primary)] truncate">
                          {ms.name}
                        </p>
                        <p className="text-caption text-[var(--color-text-secondary)] font-mono">
                          {ms.tasksCount > 0
                            ? `${ms.completedTasksCount} / ${ms.tasksCount} tasks completed • Due: ${ms.dueDate}`
                            : `0 / 0 tasks (No tasks) • Due: ${ms.dueDate}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block font-mono text-sm">
                        <span className="font-bold text-[var(--color-text-primary)]">{ms.progress}%</span>
                      </div>
                      {ms.tasksCount === 0 ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
                          No Tasks
                        </span>
                      ) : ms.isCompleted || ms.progress === 100 ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 space-y-2">
            <Target className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto opacity-50" />
            <p className="text-body font-semibold text-[var(--color-text-primary)]">
              No Milestones Configured
            </p>
            <p className="text-caption text-[var(--color-text-secondary)]">
              Create milestones in the Milestones tab to track overall completion progress.
            </p>
          </div>
        )}
      </Card>

      {/* TASK STATUS & PRIORITY DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-4">
          <h3 className="text-h3 font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
            Task Status Breakdown
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-body font-medium mb-1">
                <span className="text-[var(--color-text-primary)]">Completed</span>
                <span className="font-mono text-emerald-400 font-bold">{completedTasks}</span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-body font-medium mb-1">
                <span className="text-[var(--color-text-primary)]">In Progress</span>
                <span className="font-mono text-blue-400 font-bold">{inProgressTasks}</span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-body font-medium mb-1">
                <span className="text-[var(--color-text-primary)]">To Do</span>
                <span className="font-mono text-[var(--color-text-secondary)] font-bold">{todoTasks}</span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gray-500 h-full rounded-full"
                  style={{ width: `${totalTasks > 0 ? (todoTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Priority Distribution */}
        <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-sm space-y-4">
          <h3 className="text-h3 font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3">
            Task Priority Distribution
          </h3>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center space-y-1">
              <span className="text-caption font-bold text-red-400 uppercase tracking-wider block">
                High Priority
              </span>
              <span className="text-h2 font-mono font-bold text-red-400">
                {priorityStats.high}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
              <span className="text-caption font-bold text-amber-400 uppercase tracking-wider block">
                Medium
              </span>
              <span className="text-h2 font-mono font-bold text-amber-400">
                {priorityStats.medium}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
              <span className="text-caption font-bold text-blue-400 uppercase tracking-wider block">
                Low
              </span>
              <span className="text-h2 font-mono font-bold text-blue-400">
                {priorityStats.low}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
