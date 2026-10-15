import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import { ProgressBar } from '@/src/components/widgets/ProgressBar';
import { useAuth } from '@/src/context/AuthContext';
import { Project } from '@/src/types/firestore';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { syncProjectCompletionAndProgress } from '@/src/lib/firestore/workspace';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';
import { formatProjectBudget, getCleanProjectTitle, isAiBriefProject } from '@/src/lib/utils/projectBudget';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Briefcase,
  Clock,
  DollarSign,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Star,
} from 'lucide-react';

export const ClientProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, firebaseUser, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const clientId = userProfile?.uid || firebaseUser?.uid || '';

  // Subscribe to real-time Firestore projects for this client
  useEffect(() => {
    if (authLoading) return;
    if (!clientId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToProjectsByOwner(clientId, (clientProjects) => {
      setProjects(clientProjects);
      setLoading(false);

      // Auto-heal legacy projects that are completed with missing totalSpent
      clientProjects.forEach((p) => {
        if (p.id && p.status === 'completed' && (!p.totalSpent || p.totalSpent === 0)) {
          syncProjectCompletionAndProgress(p.id).catch(() => {});
        }
      });
    });

    return () => {
      unsub();
    };
  }, [clientId, authLoading]);

  // Subscribe to specialists to resolve assigned talent profiles by UID
  const [symbiotes, setSymbiotes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((list) => {
      setSymbiotes(list || []);
    });
    return () => unsub();
  }, []);

  const symbioteMap = useMemo(() => {
    const map: Record<string, { name: string; initials: string; avatarUrl?: string }> = {};
    symbiotes.forEach((s) => {
      const name =
        s.displayName ||
        `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
        'Specialist';
      const initials = (s.displayName
        ? s.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : `${(s.firstName || '')[0] || ''}${(s.lastName || '')[0] || ''}`.toUpperCase()) || 'SP';
      map[s.uid] = {
        name,
        initials: initials || 'SP',
        avatarUrl: s.avatarUrl || s.photoURL,
      };
    });
    return map;
  }, [symbiotes]);

  // Helper to reliably resolve assigned specialist details from any Firestore representation
  const getProjectSpecialist = (project: Project) => {
    // 1. Direct name on project if present
    if (project.assignedSymbioteName) {
      return {
        name: project.assignedSymbioteName,
        initials: project.assignedSymbioteName.slice(0, 2).toUpperCase(),
        avatarUrl: undefined,
      };
    }
    // 2. Direct team members array
    if (project.teamMembers && project.teamMembers.length > 0) {
      const member: any = project.teamMembers[0];
      const name = member.displayName || member.name || member.symbioteName || 'Specialist';
      const initials = member.avatarInitials || (name ? name.slice(0, 2).toUpperCase() : 'SP');
      return {
        name,
        initials,
        avatarUrl: member.avatarUrl || member.photoURL,
      };
    }
    // 3. ID lookup in symbioteMap
    const sId = project.assignedSymbioteId || (project as any).symbioteId || (project as any).specialistId;
    if (sId && symbioteMap[sId]) {
      return symbioteMap[sId];
    }
    if (sId) {
      return {
        name: 'Specialist Assigned',
        initials: 'SP',
        avatarUrl: undefined,
      };
    }
    return null;
  };

  // Helper to compute realistic, accurate milestone progress
  const getProjectProgress = (project: Project): number => {
    const pStatus = (project.status || '').toLowerCase();
    const isCompleted = pStatus === 'completed' || pStatus === 'closed';

    if (isCompleted) {
      return 100;
    }

    if (typeof project.progressPct === 'number' && project.progressPct > 0) {
      return Math.min(100, Math.max(0, project.progressPct));
    }
    if (typeof project.progressPercent === 'number' && project.progressPercent > 0) {
      return Math.min(100, Math.max(0, project.progressPercent));
    }

    if (pStatus === 'active' || pStatus === 'in_progress') {
      return 60;
    }
    if (pStatus === 'under_review' || pStatus === 'review') {
      return 85;
    }
    return 0;
  };

  // Filter projects based on search query and status tab
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status Filter
      if (selectedStatus !== 'all') {
        const pStatus = (p.status || 'draft').toLowerCase();
        if (selectedStatus === 'active' && pStatus !== 'active' && pStatus !== 'in_progress') return false;
        if (selectedStatus === 'matching' && pStatus !== 'matching' && pStatus !== 'submitted') return false;
        if (selectedStatus === 'review' && pStatus !== 'review' && pStatus !== 'under_review') return false;
        if (selectedStatus === 'completed' && pStatus !== 'completed') return false;
        if (selectedStatus === 'draft' && pStatus !== 'draft') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesCategory = p.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [projects, selectedStatus, searchQuery]);

  // Compute summary statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length;
    const matching = projects.filter((p) => p.status === 'matching' || p.status === 'submitted').length;
    const completed = projects.filter((p) => p.status === 'completed').length;

    return { total, active, matching, completed };
  }, [projects]);

  const getStatusVariant = (status?: string): 'cyan' | 'green' | 'amber' | 'blue' | 'purple' | 'red' | 'gray' => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'green';
      case 'matching':
      case 'submitted':
        return 'cyan';
      case 'under_review':
      case 'review':
        return 'purple';
      case 'completed':
        return 'blue';
      case 'draft':
        return 'amber';
      default:
        return 'gray';
    }
  };

  const formatStatusLabel = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'Active Contract';
      case 'matching':
      case 'submitted':
        return 'AI Matching';
      case 'under_review':
      case 'review':
        return 'Milestone Review';
      case 'completed':
        return 'Completed';
      case 'draft':
        return 'Draft Brief';
      default:
        return status || 'Pending';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 font-bold text-[var(--color-text-primary)]">My Projects</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
              {projects.length} Total
            </span>
          </div>
          <p className="text-body text-[var(--color-text-secondary)] mt-1">
            Manage your AI engineering briefs, real-time workspace boards, and specialist engagements.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/client/create-project')}
          className="shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold truncate">
              Total Briefs
            </span>
            <FolderKanban className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
          </div>
          <div className="mt-2">
            <ResponsiveStatValue value={stats.total} />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold truncate">
              Active Contracts
            </span>
            <Briefcase className="w-4 h-4 text-[var(--color-success-green)] shrink-0" />
          </div>
          <div className="mt-2">
            <ResponsiveStatValue value={stats.active} />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold truncate">
              In AI Matching
            </span>
            <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
          </div>
          <div className="mt-2">
            <ResponsiveStatValue value={stats.matching} />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold truncate">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
          </div>
          <div className="mt-2">
            <ResponsiveStatValue value={stats.completed} />
          </div>
        </Card>
      </div>

      {/* CONTROLS BAR: SEARCH, STATUS TABS, VIEW SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] p-3.5 rounded-[12px] border border-[var(--color-border)]">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'active', label: 'Active' },
            { id: 'matching', label: 'AI Matching' },
            { id: 'review', label: 'Under Review' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === tab.id
                  ? 'bg-gradient-to-r from-[#22D3EE] to-[#34D399] text-slate-950 font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & View Mode Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input
              type="text"
              placeholder="Search by title, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-background)] p-1 rounded-[8px] border border-[var(--color-border)] shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${
                viewMode === 'table'
                  ? 'bg-[var(--color-surface)] text-[var(--color-accent-cyan)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-surface)] text-[var(--color-accent-cyan)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT LIST / TABLE */}
      {loading || authLoading ? (
        <Card className="p-12 text-center bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
            <p className="text-caption text-[var(--color-text-secondary)] font-medium">
              Loading projects from Firestore...
            </p>
          </div>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-h2 font-bold text-[var(--color-text-primary)]">
              {searchQuery || selectedStatus !== 'all' ? 'No Matching Projects Found' : 'No Projects Created Yet'}
            </h3>
            <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search query or status filter above.'
                : 'Get started by creating your first AI engineering brief to find top-tier Symbiote specialists.'}
            </p>
          </div>
          {!searchQuery && selectedStatus === 'all' && (
            <Button variant="primary" onClick={() => navigate('/client/create-project')} className="mx-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Create AI Project Brief
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <th className="py-3 px-4">Project Name & Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Assigned Specialist</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-xs">
                {filteredProjects.map((project) => {
                  const progressPct = getProjectProgress(project);
                  const specialist = getProjectSpecialist(project);

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-[var(--color-background)]/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/client/projects/${project.id}`)}
                    >
                      {/* Title & Category */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-[var(--color-text-primary)] text-sm group-hover:text-[var(--color-accent-cyan)] transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{getCleanProjectTitle(project.title)}</span>
                          {isAiBriefProject(project) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
                              <Sparkles className="w-3 h-3" /> PreSync AI Brief
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                            {project.category || 'AI Engineering'}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusPill
                          variant={getStatusVariant(project.status)}
                          label={formatStatusLabel(project.status)}
                        />
                      </td>

                      {/* Budget */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono">
                        <div className="font-bold text-[var(--color-text-primary)] text-xs">
                          {formatProjectBudget(project)}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="py-4 px-4 min-w-[150px]">
                        <ProgressBar value={progressPct} variant="compact" showPercent size="sm" />
                      </td>

                      {/* Specialist */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {specialist ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              initials={specialist.initials}
                              src={specialist.avatarUrl}
                              className="w-7 h-7 text-xs bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]"
                            />
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {specialist.name}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/client/projects/${project.id}/matching`);
                            }}
                            className="text-[11px] font-semibold text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Match Specialist
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {(project.status === 'completed' || project.status === 'closed') && (
                            <Button
                              size="sm"
                              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                              onClick={() => navigate(`/client/projects/${project.id}/review?from=projects`)}
                            >
                              <Star className="w-3 h-3 fill-slate-950" />
                              <span>Review</span>
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/client/projects/${project.id}/workspace`)}
                          >
                            Workspace
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate(`/client/projects/${project.id}`)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const progressPct = getProjectProgress(project);
            const specialist = getProjectSpecialist(project);

            return (
              <Card
                key={project.id}
                className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                      {project.category || 'AI Engineering'}
                    </span>
                    <StatusPill
                      variant={getStatusVariant(project.status)}
                      label={formatStatusLabel(project.status)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        onClick={() => navigate(`/client/projects/${project.id}`)}
                        className="font-bold text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors cursor-pointer line-clamp-1"
                      >
                        {getCleanProjectTitle(project.title)}
                      </h3>
                      {isAiBriefProject(project) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30">
                          <Sparkles className="w-3 h-3" /> PreSync AI Brief
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-[var(--color-text-secondary)] line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--color-text-secondary)] font-medium">Milestone Progress</span>
                      <span className="font-mono font-bold text-[var(--color-accent-cyan)]">{progressPct}%</span>
                    </div>
                    <ProgressBar value={progressPct} size="sm" />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-caption text-[var(--color-text-secondary)] block">Budget</span>
                      <span className="font-bold text-[var(--color-text-primary)] text-xs">
                        {formatProjectBudget(project)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-caption text-[var(--color-text-secondary)] block">Assigned To</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {specialist?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {(project.status === 'completed' || project.status === 'closed') ? (
                      <Button
                        size="sm"
                        className="flex-1 justify-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 cursor-pointer"
                        onClick={() => navigate(`/client/projects/${project.id}/review?from=projects`)}
                      >
                        <Star className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Review</span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => navigate(`/client/projects/${project.id}/workspace`)}
                      >
                        Workspace
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 justify-center"
                      onClick={() => navigate(`/client/projects/${project.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
