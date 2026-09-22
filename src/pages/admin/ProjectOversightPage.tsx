import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Download, FolderKanban, AlertCircle, Eye, X, Calendar, User, DollarSign, Tag, Clock, Layers } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { AvatarStack } from '@/src/components/ui/AvatarStack';
import {
  getProjectsPage,
  type ProjectOversightRow,
  type ProjectOversightFilters,
  type ProjectOversightStatus,
} from '@/src/lib/firestore/adminProjects';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

const statusTabs: { label: string; value: ProjectOversightStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Suspended', value: 'suspended' },
];

const statusBadgeVariant: Record<ProjectOversightStatus, 'green' | 'blue' | 'purple' | 'red'> = {
  active: 'green',
  completed: 'blue',
  in_review: 'purple',
  suspended: 'red',
};

const formatStatusLabel = (s: ProjectOversightStatus) => {
  switch (s) {
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'in_review':
      return 'In Review';
    case 'suspended':
      return 'Suspended';
    default:
      return s;
  }
};

export function ProjectOversightPage() {
  const [activeTab, setActiveTab] = useState<ProjectOversightStatus | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ProjectOversightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOversightRow | null>(null);

  const load = useCallback(
    async (reset = true) => {
      setLoading(true);
      setError(null);
      const filters: ProjectOversightFilters = {
        status: activeTab,
        category: selectedCategory || undefined,
        search: search || undefined,
      };
      try {
        const { rows: newRows, nextCursor, hasMore: more } = await getProjectsPage(
          filters,
          reset ? undefined : cursor ?? undefined
        );
        setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
        setCursor(nextCursor);
        setHasMore(more);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, selectedCategory, search, cursor]
  );

  useEffect(() => {
    load(true);
  }, [activeTab, selectedCategory]);

  // Debounced search input effect for instant filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      load(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(true);
  };

  // Dynamically derive category options from loaded rows
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    rows.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [rows]);

  const exportCsv = () => {
    const header = ['Project ID', 'Name', 'Client', 'Freelancers', 'Budget', 'Status', 'Category', 'Created'];
    const lines = rows.map((r) =>
      [
        r.projectIdLabel,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.businessOwnerName.replace(/"/g, '""')}"`,
        `"${(r.budgetDisplay || '').replace(/"/g, '""')}"`,
        r.status,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        r.createdAt ? r.createdAt.toDate().toISOString() : '',
      ].join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-oversight-${activeTab ?? 'all'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Project Oversight</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {rows.length} platform projects {hasMore ? '(more available)' : ''}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export CSV</span>
        </button>
      </header>

      {/* Filter Toolbar */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              placeholder="Search by project name, ID, or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] min-w-[160px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            {!availableCategories.length && (
              <>
                <option value="Web Development">Web Development</option>
                <option value="Design">Design</option>
                <option value="AI & ML">AI & ML</option>
                <option value="Marketing">Marketing</option>
              </>
            )}
          </select>
        </form>

        {/* Status Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.value
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 text-red-300 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </Card>
      )}

      {/* Projects Table */}
      <Card className="overflow-hidden border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white/5 border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="p-3.5 font-medium">Project ID</th>
                <th className="p-3.5 font-medium">Project Name</th>
                <th className="p-3.5 font-medium">Client</th>
                <th className="p-3.5 font-medium">Freelancers</th>
                <th className="p-3.5 font-medium">Budget</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium">Category</th>
                <th className="p-3.5 font-medium">Created</th>
                <th className="p-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--color-text-secondary)]">
                    Loading projects…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <FolderKanban className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                      <span>No projects match the selected filters.</span>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3.5 font-mono text-xs text-cyan-400 font-medium">
                    {p.projectIdLabel}
                  </td>
                  <td className="p-3.5 text-[var(--color-text-primary)] font-medium">
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="hover:underline text-left text-cyan-300 font-semibold cursor-pointer"
                    >
                      {p.name}
                    </button>
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)] font-medium">
                    {p.businessOwnerName}
                  </td>
                  <td className="p-3.5">
                    <AvatarStack names={p.professionalNames} />
                  </td>
                  <td className="p-3.5 font-mono">
                    {p.previousBudget != null && p.previousBudget !== p.budget && (
                      <span className="line-through text-[var(--color-text-tertiary)] mr-2">
                        ${p.previousBudget.toLocaleString()}
                      </span>
                    )}
                    <span className="text-cyan-400 font-semibold">
                      {p.budgetDisplay || (p.budget != null ? `$${p.budget.toLocaleString()}` : 'Negotiable')}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <Badge variant={statusBadgeVariant[p.status] || 'gray'}>
                      {formatStatusLabel(p.status)}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)]">
                    {p.category || '—'}
                  </td>
                  <td className="p-3.5 text-[var(--color-text-secondary)]">
                    {p.createdAt ? p.createdAt.toDate().toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
          >
            {loading ? 'Loading…' : 'Load More Projects'}
          </button>
        </div>
      )}

      {/* READ-ONLY PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--color-border)] flex items-start justify-between gap-4 bg-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  {selectedProject.category && (
                    <span className="font-mono text-xs text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 font-semibold">
                      {selectedProject.category}
                    </span>
                  )}
                  <Badge variant={statusBadgeVariant[selectedProject.status] || 'gray'}>
                    {formatStatusLabel(selectedProject.status)}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                  {selectedProject.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-black/40 border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Client
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {selectedProject.businessOwnerName}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-[var(--color-border)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Budget Range
                  </div>
                  <div className="text-sm font-bold text-cyan-400">
                    {selectedProject.budgetDisplay}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-[var(--color-border)] space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-medium">
                    <Tag className="w-3.5 h-3.5 text-purple-400" /> Category
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {selectedProject.category || 'General'}
                  </div>
                </div>
              </div>

              {/* Description / Brief */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider font-mono text-[var(--color-text-secondary)] font-bold">
                  Project Description
                </h3>
                <div className="p-4 rounded-lg bg-black/30 border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                  {selectedProject.rawProject?.description || selectedProject.rawProject?.brief || 'No description provided for this project.'}
                </div>
              </div>

              {/* Skills / Tech Tags */}
              {Array.isArray(selectedProject.rawProject?.skills || selectedProject.rawProject?.techTags) && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-mono text-[var(--color-text-secondary)] font-bold">
                    Required Skills & Tech
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedProject.rawProject?.skills || selectedProject.rawProject?.techTags || []).map((sk: string) => (
                      <span key={sk} className="px-2.5 py-1 rounded text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Team */}
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider font-mono text-[var(--color-text-secondary)] font-bold">
                  Assigned Team & Freelancers
                </h3>
                {selectedProject.professionalNames.length > 0 ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-[var(--color-border)]">
                    <AvatarStack names={selectedProject.professionalNames} />
                    <span className="text-xs text-[var(--color-text-primary)] font-medium">
                      {selectedProject.professionalNames.join(', ')}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)] italic">
                    No freelancers assigned yet.
                  </p>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border)]">
                <span>
                  Created:{' '}
                  {selectedProject.createdAt
                    ? selectedProject.createdAt.toDate().toLocaleString()
                    : selectedProject.rawProject?.createdAt
                    ? new Date(selectedProject.rawProject.createdAt).toLocaleString()
                    : '—'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--color-border)] bg-white/5 flex items-center justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

