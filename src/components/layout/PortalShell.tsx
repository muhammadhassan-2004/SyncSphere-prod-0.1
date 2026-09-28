import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { cn } from '@/src/lib/utils';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import {
  subscribeToNotifications,
  subscribeToClientApplications,
  subscribeToUserConversations,
  subscribeToSymbioteInvitations,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/src/lib/firestore';
import { NotificationItem } from '@/src/types/firestore';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Folder,
  Search,
  Sparkles,
  FileText,
  MessageSquare,
  Clock,
  FileCode,
  CreditCard,
  Star,
  Settings,
  Bell,
  Compass,
  Mail,
  DollarSign,
  User,
  Users,
  ShieldAlert,
  Activity,
  FileSearch,
  BarChart3,
  FilePieChart,
  ChevronDown,
  LogOut,
  CheckCheck,
  Inbox,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface PortalShellProps {
  role: 'client' | 'symbiote' | 'admin';
  children?: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({ role, children }) => {
  const { firebaseUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Live Firestore Badge Counts
  const [notifBadgeCount, setNotifBadgeCount] = useState<number>(0);
  const [appBadgeCount, setAppBadgeCount] = useState<number>(0);
  const [msgBadgeCount, setMsgBadgeCount] = useState<number>(0);
  const [invBadgeCount, setInvBadgeCount] = useState<number>(0);

  // Subscribe to live Firestore data for current user
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const unSubNotifs = subscribeToNotifications(firebaseUser.uid, (notifs) => {
      const sorted = [...(notifs || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
      const unread = sorted.filter((n) => !n.read).length;
      setNotifBadgeCount(unread);
    });

    const unSubApps = subscribeToClientApplications(firebaseUser.uid, (apps) => {
      setAppBadgeCount(apps.length);
    });

    const unSubConvs = subscribeToUserConversations(firebaseUser.uid, (convs) => {
      // Filter out legacy mock conversations if any
      const realConvs = (convs || []).filter((conv) => {
        if (!conv.participantIds) return false;
        const hasMockParticipant = conv.participantIds.some(
          (pId) =>
            pId === 'client-apex-corp' ||
            pId === 'symbiote-demo' ||
            pId === 'client-demo' ||
            pId.startsWith('symbiote-10')
        );
        if (hasMockParticipant || conv.projectId === 'proj-demo-1') {
          return false;
        }
        return true;
      });

      // Count only conversations that have at least one genuinely unread message for the current user
      const unreadCount = realConvs.filter(
        (c) => (c.unreadCount?.[firebaseUser.uid] || 0) > 0
      ).length;
      setMsgBadgeCount(unreadCount);
    });

    const unSubInvs = subscribeToSymbioteInvitations(firebaseUser.uid, (invs) => {
      const pending = (invs || []).filter((i) => i.status === 'pending' || !i.status).length;
      setInvBadgeCount(pending);
    });

    return () => {
      if (unSubNotifs) unSubNotifs();
      if (unSubApps) unSubApps();
      if (unSubConvs) unSubConvs();
      if (unSubInvs) unSubInvs();
    };
  }, [firebaseUser?.uid]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Configure portal role metadata
  const roleConfig = {
    client: {
      title: 'Client Portal',
      accentColor: 'var(--color-info-blue)',
      badgeVariant: 'blue' as const,
      userTitle: userProfile?.companyName || userProfile?.companyProfile?.companyName || 'Enterprise Client',
      defaultPath: '/client/dashboard',
    },
    symbiote: {
      title: 'Freelancer Portal',
      accentColor: 'var(--color-success-green)',
      badgeVariant: 'green' as const,
      userTitle: userProfile?.title || userProfile?.jobTitle || 'Freelancer',
      defaultPath: '/symbiote/dashboard',
    },
    admin: {
      title: 'Admin Console',
      accentColor: 'var(--color-danger-red)',
      badgeVariant: 'red' as const,
      userTitle: userProfile?.adminTitle || userProfile?.department || 'Super Administrator',
      defaultPath: '/admin/dashboard',
    },
  }[role];

  // Derive User Display Info (Guarantees identical user name across sidebar user card & topbar avatar)
  const userName =
    userProfile?.displayName ||
    (userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
      : null) ||
    (role === 'client' && userProfile?.companyName ? userProfile.companyName : null) ||
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split('@')[0] : null) ||
    (role === 'client' ? 'Client User' : role === 'symbiote' ? 'Symbiote User' : 'Admin User');

  const userEmail = userProfile?.email || firebaseUser?.email || '';

  // Configure Nav Items per Role (Focused workflow & module navigation)
  const navItems: NavItemConfig[] = {
    client: [
      { label: 'Dashboard', path: '/client/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Create Project', path: '/client/create-project', icon: <PlusCircle className="w-4 h-4" /> },
      { label: 'My Projects', path: '/client/projects', icon: <FolderKanban className="w-4 h-4" /> },
      { label: 'Find Talent', path: '/client/find-talent', icon: <Search className="w-4 h-4" /> },
      { label: 'AI Matching', path: '/client/ai-matching', icon: <Sparkles className="w-4 h-4" />, badge: 'NEW' },
      { label: 'Applications', path: '/client/applications', icon: <FileText className="w-4 h-4" />, badge: appBadgeCount > 0 ? appBadgeCount : undefined },
      { label: 'Messages', path: '/client/messages', icon: <MessageSquare className="w-4 h-4" />, badge: msgBadgeCount > 0 ? msgBadgeCount : undefined },
      { label: 'Time Tracking', path: '/client/time-tracking', icon: <Clock className="w-4 h-4" /> },
      { label: 'Files & Resources', path: '/client/files', icon: <Folder className="w-4 h-4" /> },
      { label: 'Invoices', path: '/client/invoices', icon: <CreditCard className="w-4 h-4" /> },
      { label: 'Reviews', path: '/client/reviews', icon: <Star className="w-4 h-4" /> },
      { label: 'Notifications', path: '/client/notifications', icon: <Bell className="w-4 h-4" />, badge: notifBadgeCount > 0 ? notifBadgeCount : undefined },
    ],
    symbiote: [
      { label: 'Dashboard', path: '/symbiote/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Browse Projects', path: '/symbiote/browse', icon: <Compass className="w-4 h-4" /> },
      { label: 'Invitations', path: '/symbiote/invitations', icon: <Mail className="w-4 h-4" />, badge: invBadgeCount > 0 ? invBadgeCount : undefined },
      { label: 'My Projects', path: '/symbiote/projects', icon: <FolderKanban className="w-4 h-4" /> },
      { label: 'Messages', path: '/symbiote/messages', icon: <MessageSquare className="w-4 h-4" />, badge: msgBadgeCount > 0 ? msgBadgeCount : undefined },
      { label: 'Time Tracking', path: '/symbiote/time-tracking', icon: <Clock className="w-4 h-4" /> },
      { label: 'Earnings', path: '/symbiote/earnings', icon: <DollarSign className="w-4 h-4" /> },
      { label: 'Invoices', path: '/symbiote/invoices', icon: <CreditCard className="w-4 h-4" /> },
      { label: 'Reviews', path: '/symbiote/reviews', icon: <Star className="w-4 h-4" /> },
    ],
    admin: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'User Management', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { label: 'Project Oversight', path: '/admin/projects', icon: <ShieldAlert className="w-4 h-4" /> },
      { label: 'Platform Monitoring', path: '/admin/monitoring', icon: <Activity className="w-4 h-4" /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <FileSearch className="w-4 h-4" /> },
      { label: 'Analytics & Reporting', path: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { label: 'Reports Center', path: '/admin/reports', icon: <FilePieChart className="w-4 h-4" /> },
    ],
  }[role];

  // Helper to determine if a sidebar nav item is strictly and genuinely active (handles sub-routes accurately)
  const checkIsNavItemActive = (itemPath: string): boolean => {
    const currentPath = location.pathname;

    // 1. Exact match always wins
    if (currentPath === itemPath) return true;

    // 2. Client role specific sub-route mappings
    if (role === 'client') {
      if (itemPath === '/client/create-project') {
        return currentPath === '/client/create-project' || currentPath.startsWith('/client/projects/new');
      }
      if (itemPath === '/client/projects') {
        if (currentPath.startsWith('/client/projects/new')) return false;
        if (currentPath.includes('/matching')) return false;
        if (currentPath.includes('/review')) return false;
        return currentPath === '/client/projects' || currentPath.startsWith('/client/projects/');
      }
      if (itemPath === '/client/find-talent') {
        return (
          currentPath === '/client/find-talent' ||
          currentPath.startsWith('/client/find-talent/') ||
          currentPath.startsWith('/client/talent')
        );
      }
      if (itemPath === '/client/ai-matching') {
        return currentPath === '/client/ai-matching' || currentPath.endsWith('/matching');
      }
      if (itemPath === '/client/reviews') {
        return currentPath === '/client/reviews' || currentPath.endsWith('/review');
      }
      if (itemPath === '/client/settings') {
        return currentPath === '/client/settings' || currentPath.startsWith('/client/settings/');
      }
      if (itemPath === '/client/profile') {
        return currentPath === '/client/profile' || currentPath.startsWith('/client/profile/');
      }
      if (itemPath === '/client/messages') {
        return currentPath === '/client/messages' || currentPath.startsWith('/client/messages/');
      }
      if (itemPath === '/client/applications') {
        return currentPath === '/client/applications' || currentPath.startsWith('/client/applications/');
      }
      if (itemPath === '/client/time-tracking') {
        return currentPath === '/client/time-tracking' || currentPath.startsWith('/client/time-tracking/');
      }
      if (itemPath === '/client/files') {
        return currentPath === '/client/files' || currentPath.startsWith('/client/files/');
      }
      if (itemPath === '/client/invoices') {
        return currentPath === '/client/invoices' || currentPath.startsWith('/client/invoices/');
      }
      if (itemPath === '/client/notifications') {
        return currentPath === '/client/notifications' || currentPath.startsWith('/client/notifications/');
      }
      if (itemPath === '/client/dashboard') {
        return currentPath === '/client/dashboard' || currentPath === '/client';
      }
    }

    // 3. Symbiote role specific sub-route mappings
    if (role === 'symbiote') {
      if (itemPath === '/symbiote/dashboard') {
        return currentPath === '/symbiote/dashboard' || currentPath === '/symbiote';
      }
      if (itemPath === '/symbiote/browse') {
        return currentPath === '/symbiote/browse' || currentPath.startsWith('/symbiote/browse/');
      }
      if (itemPath === '/symbiote/invitations') {
        return currentPath === '/symbiote/invitations' || currentPath.startsWith('/symbiote/invitations/');
      }
      if (itemPath === '/symbiote/projects') {
        return (
          currentPath === '/symbiote/projects' ||
          currentPath.startsWith('/symbiote/projects/') ||
          currentPath.startsWith('/symbiote/workspace/') ||
          currentPath === '/symbiote/workspace'
        );
      }
      if (itemPath === '/symbiote/messages') {
        return currentPath === '/symbiote/messages' || currentPath.startsWith('/symbiote/messages/');
      }
      if (itemPath === '/symbiote/time-tracking') {
        return currentPath === '/symbiote/time-tracking' || currentPath.startsWith('/symbiote/time-tracking/');
      }
      if (itemPath === '/symbiote/earnings') {
        return currentPath === '/symbiote/earnings' || currentPath.startsWith('/symbiote/earnings/');
      }
      if (itemPath === '/symbiote/invoices') {
        return currentPath === '/symbiote/invoices' || currentPath.startsWith('/symbiote/invoices/');
      }
      if (itemPath === '/symbiote/reviews') {
        return currentPath === '/symbiote/reviews' || currentPath.startsWith('/symbiote/reviews/');
      }
      if (itemPath === '/symbiote/profile') {
        return currentPath === '/symbiote/profile' || currentPath.startsWith('/symbiote/profile/');
      }
      if (itemPath === '/symbiote/settings') {
        return currentPath === '/symbiote/settings' || currentPath.startsWith('/symbiote/settings/');
      }
    }

    // 4. Admin role specific sub-route mappings
    if (role === 'admin') {
      if (itemPath === '/admin/dashboard') {
        return currentPath === '/admin/dashboard' || currentPath === '/admin';
      }
      if (itemPath === '/admin/users') {
        return currentPath === '/admin/users' || currentPath.startsWith('/admin/users/');
      }
      if (itemPath === '/admin/projects') {
        return currentPath === '/admin/projects' || currentPath.startsWith('/admin/projects/');
      }
      if (itemPath === '/admin/monitoring') {
        return currentPath === '/admin/monitoring' || currentPath.startsWith('/admin/monitoring/');
      }
      if (itemPath === '/admin/audit-logs') {
        return currentPath === '/admin/audit-logs' || currentPath.startsWith('/admin/audit-logs/');
      }
      if (itemPath === '/admin/analytics') {
        return currentPath === '/admin/analytics' || currentPath.startsWith('/admin/analytics/');
      }
      if (itemPath === '/admin/reports') {
        return currentPath === '/admin/reports' || currentPath.startsWith('/admin/reports/');
      }
      if (itemPath === '/admin/profile') {
        return currentPath === '/admin/profile' || currentPath.startsWith('/admin/profile/');
      }
      if (itemPath === '/admin/settings') {
        return currentPath === '/admin/settings' || currentPath.startsWith('/admin/settings/');
      }
    }

    // Default fallback: match sub-paths but exclude root index route false positives
    if (itemPath !== `/${role}` && itemPath !== `/${role}/dashboard` && currentPath.startsWith(itemPath + '/')) {
      return true;
    }

    return false;
  };

  // Helper functions for notification dropdown
  const getNotifIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('app') || t.includes('invitation')) return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    if (t.includes('msg') || t.includes('message')) return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
    if (t.includes('inv') || t.includes('payment') || t.includes('invoice')) return <CreditCard className="w-3.5 h-3.5 text-purple-400" />;
    if (t.includes('milestone') || t.includes('task')) return <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />;
    if (t.includes('ai') || t.includes('match')) return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    return <Bell className="w-3.5 h-3.5 text-gray-400" />;
  };

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const mins = Math.floor(diffInSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased">
      {/* SIDEBAR: ~240px width, fixed left, full height, surface fill, 1px border right */}
      <aside className="w-[240px] shrink-0 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col justify-between z-20 select-none">
        {/* TOP BRANDING HEADER */}
        <div className="p-4 border-b border-[var(--color-border)] space-y-2">
          <Link
            to={roleConfig.defaultPath}
            className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-cyan)] rounded-md transition-opacity hover:opacity-85 cursor-pointer"
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
          >
            <SyncSphereLogo iconSize={26} textSize="md" />
          </Link>

          <div className="flex items-center gap-1.5 pl-0.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: roleConfig.accentColor }}
            />
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] tracking-wide">
              {roleConfig.title}
            </span>
          </div>
        </div>

        {/* MIDDLE SCROLLABLE NAV ITEMS */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 no-scrollbar">
          {navItems.map((item) => {
            const isActive = checkIsNavItemActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-[#22D3EE] to-[#34D399] text-slate-950 font-bold shadow-none'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]/50'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-slate-950' : 'text-[var(--color-text-secondary)]'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-1',
                      isActive
                        ? 'bg-slate-950 text-white'
                        : 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* BOTTOM SECTION: INTERACTIVE USER PROFILE CARD */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* User Profile Footer Widget */}
          <div>
              <button
                type="button"
                id="sidebar-user-card-button"
                onClick={() => {
                  if (role === 'admin') {
                    navigate('/admin/settings');
                  } else {
                    navigate(`/${role}/profile`);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--color-background)]/80 transition-all text-left cursor-pointer group focus:outline-none"
                title="View Profile"
              >
              <Avatar name={userName} src={userProfile?.avatarUrl} size="sm" statusDot="online" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent-cyan)] transition-colors">
                  {userName}
                </p>
                <p className="text-[10.5px] text-[var(--color-text-secondary)] truncate">
                  {roleConfig.userTitle}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusPill variant={roleConfig.badgeVariant} className="text-[9px] uppercase px-1 py-0">
                  {role === 'client' ? 'Client' : role === 'symbiote' ? 'Freelancer' : 'Admin'}
                </StatusPill>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP BAR: Fixed top, surface fill, border bottom */}
        <header className="h-14 shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 flex items-center justify-between gap-4 z-30">
          {/* Left-center Spacer (Global Search Bar hidden per platform privacy directive) */}
          <div className="flex-1" />

          {/* Right side controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Notification Bell Dropdown Widget */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-background)] transition-colors focus:outline-none cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifBadgeCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-cyan)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-cyan)] ring-2 ring-[var(--color-surface)]" />
                  </span>
                )}
              </button>

              {/* Inline Dropdown Popup */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                  {/* Header */}
                  <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                      <span className="font-semibold text-[var(--color-text-primary)]">Notifications</span>
                      {notifBadgeCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
                          {notifBadgeCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (firebaseUser?.uid) markAllNotificationsRead(firebaseUser.uid);
                        }}
                        className="text-[11px] text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
                        <Inbox className="w-8 h-8 mx-auto opacity-40 text-[var(--color-text-secondary)]" />
                        <p className="font-medium text-xs">No notifications yet</p>
                        <p className="text-[10.5px] opacity-70">Updates and invitations will appear here</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read && n.id) {
                              markNotificationRead(n.id);
                            }
                            const destination = n.relatedItemLink || (n as any).link;
                            if (destination) {
                              setNotifDropdownOpen(false);
                              navigate(destination);
                            }
                          }}
                          className={cn(
                            'p-3 flex items-start gap-3 hover:bg-[var(--color-background)]/80 transition-colors cursor-pointer text-left',
                            !n.read && 'bg-[var(--color-accent-cyan)]/[0.04]'
                          )}
                        >
                          <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <p className={cn('text-xs truncate', !n.read ? 'font-bold text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-primary)]/90')}>
                                {n.title}
                              </p>
                              <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0 font-mono">
                                {formatRelativeTime(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan)] shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-background)]/40 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        navigate(`/${role}/notifications`);
                      }}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] font-medium transition-colors py-1 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>View all notifications</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topbar User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
              >
                <Avatar name={userName} src={userProfile?.avatarUrl} size="sm" statusDot="online" />
                <span className="text-xs font-semibold hidden md:inline text-[var(--color-text-primary)]">
                  {userName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>

              {/* Dropdown Box */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-1.5 space-y-1 z-50 text-xs shadow-xl animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                    <p className="font-semibold text-[var(--color-text-primary)] truncate">{userName}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{userEmail || `${role}@syncsphere.io`}</p>
                    <div className="mt-1.5">
                      <StatusPill variant={roleConfig.badgeVariant} className="text-[9px] uppercase px-1.5 py-0.5">
                        {role === 'client' ? 'Client' : role === 'symbiote' ? 'Freelancer' : 'Admin'}
                      </StatusPill>
                    </div>
                  </div>

                  {role === 'admin' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/admin/settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-[8px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                      <span>Admin Profile & Settings</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigate(`/${role}/profile`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[8px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <User className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                        <span>Edit Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigate(`/${role}/settings`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-[8px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Settings className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                        <span>Settings</span>
                      </button>
                    </>
                  )}

                  <div className="border-t border-[var(--color-border)] my-1" />

                  <button
                    type="button"
                    id="header-signout-btn"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setShowSignOutConfirm(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[8px] text-[var(--color-danger-red)] hover:bg-[var(--color-danger-red)]/10 flex items-center gap-2.5 font-medium cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SIGN OUT CONFIRMATION MODAL */}
        <ConfirmDialog
          open={showSignOutConfirm}
          title="Are You Sure You Want To Sign Out"
          description="You will need to sign in again to access your active workspace, projects, and messages."
          confirmLabel="Sign Out"
          destructive={true}
          onCancel={() => setShowSignOutConfirm(false)}
          onConfirm={async () => {
            setShowSignOutConfirm(false);
            await logout();
            navigate('/login', { replace: true });
          }}
        />

        {/* MAIN SCROLLABLE CONTENT OUTLET */}
        <main
          className={cn(
            'flex-1 bg-[var(--color-background)] min-h-0',
            location.pathname.includes('/messages')
              ? 'overflow-hidden p-3 sm:p-4 md:p-6 flex flex-col'
              : 'overflow-y-auto p-8 md:p-10'
          )}
        >
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

