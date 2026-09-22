import React, { useState, useEffect } from 'react';
import {
  Activity as ActivityIcon,
  CheckSquare,
  ListTodo,
  FileText,
  Users,
  CreditCard,
  MessageSquare,
  Clock,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { ProjectActivityItem } from '@/src/types/firestore';
import { subscribeToProjectActivity } from '@/src/lib/firestore/projectActivity';

interface ProjectActivityTabProps {
  projectId: string;
}

export const ProjectActivityTab: React.FC<ProjectActivityTabProps> = ({ projectId }) => {
  const [activities, setActivities] = useState<ProjectActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'task' | 'milestone' | 'file' | 'team' | 'invoice'
  >('all');

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToProjectActivity(projectId, (items) => {
      setActivities(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const filteredActivities = activities.filter((a) => {
    if (categoryFilter === 'all') return true;
    return a.type === categoryFilter;
  });

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActorInitials = (name?: string) => {
    if (!name) return 'SY';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderBadge = (type: string) => {
    switch (type) {
      case 'milestone':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <CheckSquare className="w-3 h-3" /> Milestone
          </span>
        );
      case 'task':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <ListTodo className="w-3 h-3" /> Task
          </span>
        );
      case 'file':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <FileText className="w-3 h-3" /> File
          </span>
        );
      case 'team':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" /> Team
          </span>
        );
      case 'invoice':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <CreditCard className="w-3 h-3" /> Invoice
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Bell className="w-3 h-3" /> Update
          </span>
        );
    }
  };

  return (
    <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-6 shadow-sm">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-2.5">
          <ActivityIcon className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="text-h3 font-bold text-[var(--color-text-primary)]">
            Live Activity Feed
          </h3>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {activities.length} {activities.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        {/* CATEGORY FILTER BUTTONS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'task', 'milestone', 'file', 'team', 'invoice'] as const).map((cat) => {
            const count = cat === 'all'
              ? activities.length
              : activities.filter((a) => a.type === cat).length;
            const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1) + 's';

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-caption font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <span>{label}</span>
                <span className="font-mono text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVITY FEED ENTRIES */}
      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-secondary)] space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
          <p className="text-body font-medium">Loading live project audit feed...</p>
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="space-y-3">
          {filteredActivities.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] hover:border-emerald-500/30 transition-all flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* ACTOR AVATAR */}
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {getActorInitials(event.actorName)}
                </div>

                {/* ACTIVITY CONTENT */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-body text-[var(--color-text-primary)]">
                      {event.title}
                    </span>
                    {renderBadge(event.type)}
                  </div>
                  <p className="text-body text-[var(--color-text-secondary)] leading-snug break-words">
                    {event.description}
                  </p>
                  <p className="text-caption font-mono text-[var(--color-text-secondary)] opacity-80 pt-0.5">
                    By <strong className="text-[var(--color-text-primary)]">{event.actorName || 'System User'}</strong>
                  </p>
                </div>
              </div>

              {/* RELATIVE TIMESTAMP */}
              <div className="text-caption font-mono text-[var(--color-text-secondary)] shrink-0 pt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 opacity-60" />
                {getRelativeTime(event.timestamp)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateBlock
          icon={<ActivityIcon className="w-6 h-6 text-emerald-400" />}
          title="No Events Recorded"
          description={`No activity recorded under the "${categoryFilter}" category yet.`}
        />
      )}
    </Card>
  );
};
