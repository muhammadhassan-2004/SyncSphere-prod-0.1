import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from '@/src/lib/firestore/notifications';
import { NotificationItem } from '@/src/types/firestore';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Bell,
  CheckCheck,
  Settings,
  FileText,
  MessageSquare,
  CreditCard,
  Flag,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  ChevronRight,
  Inbox,
  Loader2,
} from 'lucide-react';

type FilterTab = 'all' | 'application' | 'message' | 'invoice' | 'milestone' | 'ai';

export const NotificationsFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const userId = firebaseUser?.uid || '';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // Subscribe to live notifications from Firestore
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToNotifications(userId, (liveNotifs) => {
      const sorted = [...(liveNotifs || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  // Mark single notification read & optionally navigate
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read && notif.id) {
      await markNotificationRead(notif.id);
    }
    if (notif.relatedItemLink) {
      navigate(notif.relatedItemLink);
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllNotificationsRead(userId);
    setMarkingAll(false);
  };

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    const t = (item.type || '').toLowerCase();
    if (activeTab === 'application') return t.includes('app');
    if (activeTab === 'message') return t.includes('msg') || t.includes('message');
    if (activeTab === 'invoice') return t.includes('inv') || t.includes('payment');
    if (activeTab === 'milestone') return t.includes('milestone');
    if (activeTab === 'ai') return t.includes('ai') || t.includes('match');
    return true;
  });

  // Calculate badge/unread counts per filter
  const unreadTotal = notifications.filter((n) => !n.read).length;

  const countByTab = (tab: FilterTab): number => {
    if (tab === 'all') return notifications.length;
    return notifications.filter((item) => {
      const t = (item.type || '').toLowerCase();
      if (tab === 'application') return t.includes('app');
      if (tab === 'message') return t.includes('msg') || t.includes('message');
      if (tab === 'invoice') return t.includes('inv') || t.includes('payment');
      if (tab === 'milestone') return t.includes('milestone');
      if (tab === 'ai') return t.includes('ai') || t.includes('match');
      return false;
    }).length;
  };

  // Format relative timestamp
  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Get icon and color badge according to notification type
  const getTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('app')) {
      return {
        icon: <FileText className="w-4 h-4 text-blue-400" />,
        bg: 'bg-blue-500/15 border-blue-500/30',
        label: 'Application',
      };
    }
    if (t.includes('msg') || t.includes('message')) {
      return {
        icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
        bg: 'bg-emerald-500/15 border-emerald-500/30',
        label: 'Message',
      };
    }
    if (t.includes('inv') || t.includes('payment')) {
      return {
        icon: <CreditCard className="w-4 h-4 text-amber-400" />,
        bg: 'bg-amber-500/15 border-amber-500/30',
        label: 'Invoice',
      };
    }
    if (t.includes('milestone')) {
      return {
        icon: <Flag className="w-4 h-4 text-purple-400" />,
        bg: 'bg-purple-500/15 border-purple-500/30',
        label: 'Milestone',
      };
    }
    return {
      icon: <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />,
      bg: 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)]/30',
      label: 'AI Update',
    };
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[12px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] relative">
              <Bell className="w-6 h-6" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-[var(--color-background)] animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                  Notifications Feed
                </h1>
                {unreadTotal > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold">
                    {unreadTotal} unread
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                    All read
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Real-time updates on applications, messaging, invoices, milestone submissions, and AI matches.
              </p>
            </div>
          </div>
        </div>

        {/* HEADER ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleMarkAllRead}
            disabled={unreadTotal === 0 || markingAll}
            variant="outline"
            className="h-9 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] flex items-center gap-1.5"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-accent-cyan)]" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            )}
            <span>Mark all read</span>
          </Button>

          <Button
            onClick={() => navigate('/client/settings/notifications')}
            variant="outline"
            className="h-9 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
            <span>Preferences</span>
          </Button>
        </div>
      </div>

      {/* 2. FILTER TAB ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--color-border)]/60">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'application', label: 'Applications' },
            { id: 'message', label: 'Messages' },
            { id: 'invoice', label: 'Invoices' },
            { id: 'milestone', label: 'Milestones' },
            { id: 'ai', label: 'AI Updates' },
          ] as { id: FilterTab; label: string }[]
        ).map((tab) => {
          const count = countByTab(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 px-3.5 rounded-[8px] font-mono text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                isActive
                  ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-bold shadow-sm'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]/40'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-[var(--color-accent-cyan)] text-slate-950'
                    : 'bg-[var(--color-background)] text-[var(--color-text-secondary)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. NOTIFICATION LIST */}
      <Card className="p-2 sm:p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] shadow-md divide-y divide-[var(--color-border)]/50">
        {loading ? (
          <div className="p-12 text-center space-y-3 font-mono">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent-cyan)] mx-auto" />
            <p className="text-xs text-[var(--color-text-secondary)]">Syncing notifications feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3 font-mono">
            <div className="p-3 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] w-fit mx-auto text-[var(--color-text-secondary)]">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">No notifications found</p>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
              There are no notifications matching the selected filter tab. Check back later or adjust your preference filters.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const badge = getTypeBadge(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 sm:p-4 rounded-[10px] transition-all cursor-pointer group flex items-start gap-3.5 relative ${
                  notif.read
                    ? 'hover:bg-[var(--color-background)]/50 opacity-85'
                    : 'bg-blue-500/5 hover:bg-blue-500/10 border-l-2 border-l-blue-500'
                }`}
              >
                {/* CIRCULAR TYPE BADGE */}
                <div className={`p-2.5 rounded-full border shrink-0 ${badge.bg}`}>
                  {badge.icon}
                </div>

                {/* CONTENT BODY */}
                <div className="space-y-1 min-w-0 flex-1 pr-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 inline-block animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs font-mono text-[var(--color-text-secondary)] leading-relaxed">
                    {notif.description}
                  </p>

                  {notif.relatedItemLink && (
                    <div className="pt-1 flex items-center gap-1 text-[11px] font-mono text-blue-400 group-hover:underline">
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* TIMESTAMP & UNREAD INDICATOR */}
                <div className="shrink-0 text-right space-y-1">
                  <span className="text-[10px] font-mono text-[var(--color-text-secondary)] block">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-cyan)] transition-colors ml-auto" />
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
};
