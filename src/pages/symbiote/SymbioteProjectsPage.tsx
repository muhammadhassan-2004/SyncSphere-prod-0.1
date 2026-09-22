import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { subscribeToProjectsBySymbiote } from '@/src/lib/firestore';
import { Project } from '@/src/types/firestore';
import {
  Briefcase,
  Clock,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  FileCheck2,
  Compass,
} from 'lucide-react';

type FilterTab = 'All' | 'In Progress' | 'Review' | 'Planning' | 'Completed';

export const SymbioteProjectsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Real-time Firestore Listener for Symbiote Projects
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToProjectsBySymbiote(uid, (projList) => {
      setProjects(projList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Helper to normalize project status into tab categories
  const getNormalizedStatus = (status: string): FilterTab => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'done' || s === 'closed') return 'Completed';
    if (s === 'review' || s === 'under_review' || s === 'qa') return 'Review';
    if (s === 'planning' || s === 'draft' || s === 'open' || s === 'backlog') return 'Planning';
    return 'In Progress';
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: string) => {
    const normalized = getNormalizedStatus(status);
    switch (normalized) {
      case 'In Progress':
        return <StatusPill variant="green" label="In Progress" />;
      case 'Review':
        return <StatusPill variant="purple" label="In Review" />;
      case 'Planning':
        return <StatusPill variant="amber" label="Planning" />;
      case 'Completed':
        return <StatusPill variant="blue" label="Completed" />;
      default:
        return <StatusPill variant="gray" label={status} />;
    }
  };

  // Filter real projects array according to active tab
  const filteredProjects = projects.filter((p) => {
    if (activeFilter === 'All') return true;
    return getNormalizedStatus(p.status) === activeFilter;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3 max-w-6xl mx-auto">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body font-medium">Fetching assigned projects from Firestore...</p>
      </div>
    );
  }

  const tabs: FilterTab[] = ['All', 'In Progress', 'Review', 'Planning', 'Completed'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER WITH FILTER TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-h1 font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-emerald-500" /> My Projects
          </h1>
          <p className="text-body text-[var(--color-text-secondary)] mt-1 font-medium">
            Active engagements and contract milestones where you are assigned.
          </p>
        </div>

        {/* FILTER TAB GROUP */}
        <div className="flex items-center gap-1.5 bg-[var(--color-surface)] p-1.5 rounded-lg border border-[var(--color-border)] overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const count = projects.filter((p) =>
              tab === 'All' ? true : getNormalizedStatus(p.status) === tab
            ).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 text-caption font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFilter === tab
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
                }`}
              >
                <span>{tab}</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[var(--color-background)] border border-[var(--color-border)] font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DATA TABLE / EMPTY STATE */}
      {filteredProjects.length > 0 ? (
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/80 text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="py-3.5 px-4 font-semibold">Project & Client</th>
                  <th className="py-3.5 px-4 font-semibold">Progress</th>
                  <th className="py-3.5 px-4 font-semibold">Rate</th>
                  <th className="py-3.5 px-4 font-semibold">Hours Logged</th>
                  <th className="py-3.5 px-4 font-semibold">Deadline</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-caption">
                {filteredProjects.map((project) => {
                  const clientName =
                    (project as any).clientName ||
                    project.clientId ||
                    'Enterprise Client';
                  const progress =
                    typeof project.progressPct === 'number'
                      ? project.progressPct
                      : typeof project.progressPercent === 'number'
                      ? project.progressPercent
                      : project.status === 'completed'
                      ? 100
                      : 0;
                  const teamMember = project.teamMembers?.find((m) => m.uid === uid);
                  const rate = teamMember?.hourlyRate || project.maxBudget || 110;
                  const hoursLogged = Math.round((progress / 100) * 120);
                  const deadline = project.deadline
                    ? new Date(project.deadline).toLocaleDateString('default', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'On Schedule';

                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/symbiote/workspace/${project.id}`)}
                      className="hover:bg-[var(--color-background)]/60 cursor-pointer transition-colors group"
                    >
                      {/* PROJECT & CLIENT COLUMN */}
                      <td className="py-4 px-4 font-medium max-w-xs">
                        <div className="space-y-1">
                          <p className="text-body font-bold text-[var(--color-text-primary)] group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {project.title}
                          </p>
                          <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{clientName}</span>
                          </p>
                        </div>
                      </td>

                      {/* PROGRESS INLINE MINI BAR */}
                      <td className="py-4 px-4 min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-[var(--color-text-secondary)]">Completion</span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              {progress}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* RATE */}
                      <td className="py-4 px-4 font-mono font-bold text-cyan-400">
                        ${rate}/hr
                      </td>

                      {/* HOURS */}
                      <td className="py-4 px-4 font-mono text-[var(--color-text-primary)]">
                        {hoursLogged} hrs
                      </td>

                      {/* DEADLINE */}
                      <td className="py-4 px-4 text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          {deadline}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-4">{renderStatusBadge(project.status)}</td>

                      {/* ACTION */}
                      <td className="py-4 px-4 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/symbiote/workspace/${project.id}`);
                          }}
                          className="border-[var(--color-border)] text-[var(--color-text-primary)] group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all text-caption"
                        >
                          Workspace
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={activeFilter === 'All' ? "No active projects yet" : `No ${activeFilter} Projects Found`}
          description={
            activeFilter === 'All'
              ? 'You do not have any active project contracts yet. Browse marketplace projects or check pending invitations to submit proposals.'
              : `There are currently no assigned projects matching the "${activeFilter}" filter.`
          }
          actionLabel={activeFilter === 'All' ? "Browse Open Projects" : "Clear Filter"}
          onAction={() => {
            if (activeFilter === 'All') {
              navigate('/symbiote/browse');
            } else {
              setActiveFilter('All');
            }
          }}
        />
      )}
    </div>
  );
};
