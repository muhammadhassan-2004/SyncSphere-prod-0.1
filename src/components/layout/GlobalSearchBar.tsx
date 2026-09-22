import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { subscribeToSearchProjects } from '@/src/lib/firestore/projects';
import { subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { subscribeToInvoices } from '@/src/lib/firestore/invoices';
import { Project, UserProfile, Invoice } from '@/src/types/firestore';
import {
  Search,
  X,
  Briefcase,
  User,
  FileText,
  Sparkles,
  ArrowRight,
  Compass,
  MessageSquare,
  Receipt,
  Clock,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'projects' | 'specialists' | 'invoices' | 'navigation' | 'files';
  route: string;
  icon: React.ReactNode;
  badge?: string;
}

export const GlobalSearchBar: React.FC = () => {
  // Global search bar hidden across all portals per platform privacy directive
  const HIDE_GLOBAL_SEARCH = true;
  if (HIDE_GLOBAL_SEARCH) return null;

  const navigate = useNavigate();
  const { firebaseUser, currentRole, userProfile } = useAuth();
  const role = currentRole || userProfile?.role || 'client';
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [specialists, setSpecialists] = useState<UserProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to accessible projects scoped by user role and ownership
  useEffect(() => {
    const uid = firebaseUser?.uid || '';
    const unsub = subscribeToSearchProjects(role, uid, (accessibleProjects) => {
      setProjects(accessibleProjects || []);
    });
    return () => unsub();
  }, [role, firebaseUser?.uid]);

  // Subscribe to real specialists for deep indexing
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((allSymbiotes) => {
      setSpecialists(allSymbiotes || []);
    });
    return () => unsub();
  }, []);

  // Subscribe to user invoices for deep indexing
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const unsub = subscribeToInvoices(
      firebaseUser.uid,
      role === 'symbiote' ? 'symbiote' : 'client',
      (allInvoices) => {
        setInvoices(allInvoices || []);
      }
    );
    return () => unsub();
  }, [firebaseUser?.uid, role]);

  // Global Keyboard Shortcut (Cmd+K or Ctrl+K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Portal Navigation Items based on role
  const navigationItems = useMemo(() => {
    const isClient = role === 'client';
    const isSymbiote = role === 'symbiote';
    const isAdmin = role === 'admin';

    const items: Array<{ title: string; subtitle: string; route: string; icon: React.ReactNode; keywords: string[] }> = [];

    if (isClient) {
      items.push(
        { title: 'Client Dashboard', subtitle: 'Overview of projects, metrics & activity', route: '/client/dashboard', icon: <Compass className="w-3.5 h-3.5" />, keywords: ['home', 'dashboard', 'stats'] },
        { title: 'Find Talent & Symbiotes', subtitle: 'Browse vetted AI engineers & specialists', route: '/client/talent', icon: <User className="w-3.5 h-3.5" />, keywords: ['talent', 'symbiotes', 'freelancers', 'engineers', 'hire'] },
        { title: 'Create New Project', subtitle: 'Launch a new AI development engagement', route: '/client/projects/new', icon: <Briefcase className="w-3.5 h-3.5" />, keywords: ['new project', 'post', 'brief', 'create'] },
        { title: 'My Projects', subtitle: 'View and manage active projects', route: '/client/projects', icon: <Briefcase className="w-3.5 h-3.5" />, keywords: ['projects', 'engagements', 'milestones'] },
        { title: 'AI Specialist Matching', subtitle: 'Neural matchmaking for active projects', route: '/client/matching', icon: <Sparkles className="w-3.5 h-3.5" />, keywords: ['match', 'ai match', 'presync', 'recommendations'] },
        { title: 'Applications & Candidates', subtitle: 'Review proposals and candidate submissions', route: '/client/applications', icon: <Zap className="w-3.5 h-3.5" />, keywords: ['proposals', 'applicants', 'applications'] },
        { title: 'Real-Time Messages', subtitle: 'Communicate with assigned specialists', route: '/client/messages', icon: <MessageSquare className="w-3.5 h-3.5" />, keywords: ['chat', 'messaging', 'inbox'] },
        { title: 'Invoices & Billing', subtitle: 'Manage milestone payments and invoices', route: '/client/invoices', icon: <Receipt className="w-3.5 h-3.5" />, keywords: ['invoices', 'settlement', 'payments', 'billing'] },
        { title: 'Files & Documentation', subtitle: 'Project assets, requirements and contracts', route: '/client/files', icon: <FileText className="w-3.5 h-3.5" />, keywords: ['files', 'documents', 'contracts', 'specs'] }
      );
    } else if (isSymbiote) {
      items.push(
        { title: 'Symbiote Dashboard', subtitle: 'Contract telemetry, milestones & earnings', route: '/symbiote/dashboard', icon: <Compass className="w-3.5 h-3.5" />, keywords: ['home', 'dashboard'] },
        { title: 'Browse Open Projects', subtitle: 'Find new AI projects & high-value contracts', route: '/symbiote/browse', icon: <Briefcase className="w-3.5 h-3.5" />, keywords: ['browse', 'jobs', 'gigs', 'contracts', 'projects'] },
        { title: 'My Engagements', subtitle: 'Active projects and client contracts', route: '/symbiote/projects', icon: <Briefcase className="w-3.5 h-3.5" />, keywords: ['projects', 'contracts'] },
        { title: 'Time Tracking', subtitle: 'Log work hours, tasks and milestones', route: '/symbiote/time-tracking', icon: <Clock className="w-3.5 h-3.5" />, keywords: ['hours', 'timer', 'log', 'time'] },
        { title: 'Earnings & Payouts', subtitle: 'Revenue summaries and transaction history', route: '/symbiote/earnings', icon: <Receipt className="w-3.5 h-3.5" />, keywords: ['revenue', 'earnings', 'payouts', 'money'] },
        { title: 'Symbiote Messages', subtitle: 'Client communication and project chat', route: '/symbiote/messages', icon: <MessageSquare className="w-3.5 h-3.5" />, keywords: ['chat', 'messages'] },
        { title: 'Invitations & Offers', subtitle: 'Direct client invitations and project offers', route: '/symbiote/invitations', icon: <Sparkles className="w-3.5 h-3.5" />, keywords: ['invites', 'offers'] }
      );
    } else if (isAdmin) {
      items.push(
        { title: 'Admin Overview', subtitle: 'System-wide platform KPI dashboard', route: '/admin', icon: <ShieldCheck className="w-3.5 h-3.5" />, keywords: ['admin', 'dashboard'] },
        { title: 'User Management', subtitle: 'Manage client and symbiote accounts', route: '/admin/users', icon: <User className="w-3.5 h-3.5" />, keywords: ['users', 'accounts', 'suspend'] },
        { title: 'Project Oversight', subtitle: 'Platform-wide projects & milestone tracking', route: '/admin/projects', icon: <Briefcase className="w-3.5 h-3.5" />, keywords: ['projects', 'moderation'] },
        { title: 'Audit Logs & Compliance', subtitle: 'Immutable security telemetry and event stream', route: '/admin/audit-logs', icon: <ShieldCheck className="w-3.5 h-3.5" />, keywords: ['audit', 'logs', 'security'] },
        { title: 'Platform Monitoring', subtitle: 'Live latency, APM and database status', route: '/admin/monitoring', icon: <Zap className="w-3.5 h-3.5" />, keywords: ['monitoring', 'telemetry', 'health'] }
      );
    }

    return items;
  }, [role]);

  // Compute Search Results across all categories
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const list: SearchResultItem[] = [];

    // 1. Projects Category
    const matchingProjects = projects.filter((p) => {
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      const matchStatus = (p.status || '').toLowerCase().includes(q);
      const matchTags = (p.techTags || p.skills || []).some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchStatus || matchTags;
    });

    matchingProjects.slice(0, 4).forEach((p) => {
      let dest = `/client/projects/${p.id}`;
      if (role === 'symbiote') {
        const isAssigned =
          p.assignedSymbioteId === firebaseUser?.uid ||
          (p as any).symbioteId === firebaseUser?.uid ||
          p.teamMemberUids?.includes(firebaseUser?.uid || '') ||
          p.teamMembers?.some((m) => m.uid === firebaseUser?.uid);
        dest = isAssigned ? `/symbiote/workspace/${p.id}` : `/symbiote/browse/${p.id}`;
      } else if (role === 'admin') {
        dest = `/admin/projects`;
      }

      list.push({
        id: `proj-${p.id}`,
        title: p.title,
        subtitle: `${p.category || 'AI Project'} • ${p.status || 'Active'} • $${(p.budget?.total || p.budget?.max || 0).toLocaleString()}`,
        category: 'projects',
        route: dest,
        icon: <Briefcase className="w-4 h-4 text-[var(--color-accent-cyan)]" />,
        badge: p.status,
      });
    });

    // 2. Specialists & Talent Deep Indexing
    const matchingSpecialists = specialists.filter((s) => {
      const name = (s.displayName || s.fullName || '').toLowerCase();
      const title = (s.title || s.jobTitle || '').toLowerCase();
      const bio = (s.bio || '').toLowerCase();
      const skills = (s.skills || []).some((sk) => sk.toLowerCase().includes(q));
      return name.includes(q) || title.includes(q) || bio.includes(q) || skills;
    });

    matchingSpecialists.slice(0, 3).forEach((s) => {
      list.push({
        id: `spec-${s.uid}`,
        title: s.displayName || s.fullName || 'AI Specialist',
        subtitle: `${s.title || 'Vetted AI Engineer'} • ${s.hourlyRate ? `$${s.hourlyRate}/hr` : 'Available'} • ${(s.skills || []).slice(0, 3).join(', ')}`,
        category: 'specialists',
        route: `/client/talent/${s.uid}`,
        icon: <User className="w-4 h-4 text-[var(--color-accent-cyan)]" />,
        badge: s.rating ? `★ ${s.rating.toFixed(1)}` : 'Verified',
      });
    });

    // 3. Invoices Deep Indexing
    const matchingInvoices = invoices.filter((inv) => {
      const num = (inv.invoiceNumber || '').toLowerCase();
      const proj = (inv.projectName || '').toLowerCase();
      const symbiote = (inv.symbioteName || '').toLowerCase();
      return num.includes(q) || proj.includes(q) || symbiote.includes(q);
    });

    matchingInvoices.slice(0, 3).forEach((inv) => {
      const dest = role === 'symbiote' ? '/symbiote/invoices' : '/client/invoices';
      list.push({
        id: `inv-${inv.id}`,
        title: `Invoice ${inv.invoiceNumber || ''}`,
        subtitle: `${inv.projectName || 'Project'} • $${(inv.amount || 0).toLocaleString()} • Due: ${inv.dueDate || 'N/A'}`,
        category: 'invoices',
        route: dest,
        icon: <Receipt className="w-4 h-4 text-[var(--color-accent-cyan)]" />,
        badge: inv.status,
      });
    });

    // 4. Navigation & Actions Category
    const matchingNav = navigationItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle.toLowerCase().includes(q);
      const matchKw = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSub || matchKw;
    });

    matchingNav.slice(0, 3).forEach((n, idx) => {
      list.push({
        id: `nav-${idx}`,
        title: n.title,
        subtitle: n.subtitle,
        category: 'navigation',
        route: n.route,
        icon: <span className="text-[var(--color-text-secondary)]">{n.icon}</span>,
      });
    });

    return list;
  }, [query, projects, specialists, invoices, navigationItems, role]);

  // Navigate to result
  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.route);
  };

  // Keyboard navigation inside results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        // Default search navigation to Find Talent or Projects
        if (role === 'symbiote') {
          navigate(`/symbiote/browse?q=${encodeURIComponent(query.trim())}`);
        } else {
          navigate(`/client/talent?q=${encodeURIComponent(query.trim())}`);
        }
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* SEARCH INPUT */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects, talent, skills (e.g. PyTorch), pages..."
          className="w-full bg-[var(--color-background)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/70 text-xs rounded-[10px] border border-[var(--color-border)] pl-9 pr-14 py-2 transition-all duration-150 focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)]/50 h-9"
        />

        {/* Clear Button or Keyboard Hint */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* FLOATING RESULTS POPUP */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] shadow-2xl z-50 overflow-hidden text-xs max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {results.length > 0 ? (
            <div className="py-2 divide-y divide-[var(--color-border)]/40">
              {/* Group by category */}
              {(['specialists', 'projects', 'invoices', 'navigation'] as const).map((cat) => {
                const catResults = results.filter((r) => r.category === cat);
                if (catResults.length === 0) return null;

                const catLabels: Record<string, string> = {
                  specialists: 'Talent & AI Specialists',
                  projects: 'Projects & Contracts',
                  invoices: 'Invoices & Billing',
                  navigation: 'Pages & Quick Actions',
                };

                return (
                  <div key={cat} className="p-1">
                    <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {catLabels[cat]}
                    </div>
                    <div className="space-y-0.5">
                      {catResults.map((item) => {
                        const itemGlobalIndex = results.findIndex((r) => r.id === item.id);
                        const isSelected = itemGlobalIndex === selectedIndex;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                            className={`px-3 py-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--color-accent-cyan)]/15 text-[var(--color-text-primary)] border border-[var(--color-accent-cyan)]/30'
                                : 'hover:bg-[var(--color-background)]/60 text-[var(--color-text-primary)] border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] shrink-0">
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs truncate">{item.title}</p>
                                <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            {item.badge && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* View all in Talent / Projects footer link */}
              <div className="p-2 bg-[var(--color-background)]/40 flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-secondary)]">
                  Showing {results.length} instant result{results.length > 1 ? 's' : ''} for "{query}"
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigate(role === 'symbiote' ? `/symbiote/browse?q=${encodeURIComponent(query)}` : `/client/talent?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                  className="text-[var(--color-accent-cyan)] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore full directory</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <Search className="w-6 h-6 text-[var(--color-text-secondary)] mx-auto opacity-50" />
              <p className="text-xs font-medium text-[var(--color-text-primary)]">
                No direct matches found for "{query}"
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Try searching for skills like <span className="text-[var(--color-accent-cyan)]">Python</span>, <span className="text-[var(--color-accent-cyan)]">PyTorch</span>, <span className="text-[var(--color-accent-cyan)]">LangChain</span>, or candidate names.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate(role === 'symbiote' ? `/symbiote/browse?q=${encodeURIComponent(query)}` : `/client/talent?q=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-semibold text-xs hover:bg-[var(--color-accent-cyan)]/25 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Search in {role === 'symbiote' ? 'Browse Projects' : 'Find Talent'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
