import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { useAuth } from '@/src/context/AuthContext';
import { Application, Project } from '@/src/types/firestore';
import {
  subscribeToClientApplications,
  updateApplicationStatus,
  createApplication,
} from '@/src/lib/firestore/applications';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import {
  createConversation,
  getUserConversations,
} from '@/src/lib/firestore/conversations';
import { createNotification } from '@/src/lib/firestore/notifications';
import { Zap, Users, UserCheck, Clock, CheckCircle2, FileText, Search, Download, Eye, MessageSquare, XCircle, Sparkles, UserX } from 'lucide-react';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ResponsiveStatValue } from '@/src/components/ui/ResponsiveStatValue';

export const ApplicationsPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || '';
  const clientName = userProfile?.displayName || firebaseUser?.displayName || 'Client';
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Messaging action state
  const [messagingAppId, setMessagingAppId] = useState<string | null>(null);

  // 1. Subscribe to Client Projects
  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList || []);
    });
    return () => unsub();
  }, [clientId]);

  // 2. Subscribe to Real-Time Client Applications
  useEffect(() => {
    if (!clientId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsub = subscribeToClientApplications(clientId, (apps) => {
      setApplications(apps || []);
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  // Enriched applications with project fallbacks
  const enrichedApplications = useMemo(() => {
    return applications.map((app) => {
      const matchedProject = projects.find((p) => p.id === app.projectId);

      return {
        ...app,
        symbioteName: app.symbioteName || 'Specialist Candidate',
        symbioteTitle: app.symbioteTitle || 'AI Specialist',
        symbioteAvatarInitials: app.symbioteAvatarInitials || 'AI',
        projectTitle: app.projectTitle || matchedProject?.title || 'AI Development Brief',
      };
    });
  }, [applications, projects]);

  // LIVE COMPUTED STATS CARDS
  const stats = useMemo(() => {
    const total = enrichedApplications.length;
    const shortlisted = enrichedApplications.filter((a) => a.status === 'shortlisted').length;
    const interview = enrichedApplications.filter((a) => a.status === 'interview').length;
    const hired = enrichedApplications.filter((a) => a.status === 'hired').length;
    const rejected = enrichedApplications.filter((a) => a.status === 'rejected').length;

    return { total, shortlisted, interview, hired, rejected };
  }, [enrichedApplications]);

  // FILTERED APPLICATIONS TABLE DATA
  const filteredApplications = useMemo(() => {
    return enrichedApplications.filter((app) => {
      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        app.symbioteName?.toLowerCase().includes(q) ||
        app.symbioteTitle?.toLowerCase().includes(q) ||
        app.projectTitle?.toLowerCase().includes(q) ||
        app.experience?.toLowerCase().includes(q);

      // Project filter
      const matchesProject =
        selectedProjectId === 'all' || app.projectId === selectedProjectId;

      // Status filter
      const matchesStatus =
        selectedStatus === 'all' || app.status === selectedStatus;

      return matchesQuery && matchesProject && matchesStatus;
    });
  }, [enrichedApplications, searchQuery, selectedProjectId, selectedStatus]);

  // ROW ACTIONS (§15)
  // 1. View Profile
  const handleViewProfile = (symbioteId: string, projectId: string) => {
    navigate(`/client/professionals/${symbioteId}?projectId=${projectId}&from=applications`);
  };

  // 2. Message Candidate
  const handleMessageCandidate = async (app: Application) => {
    if (!clientId) return;
    setMessagingAppId(app.id || app.symbioteId);

    try {
      const existingConvs = await getUserConversations(clientId);
      const existingConv = existingConvs.find(
        (c) =>
          c.participantIds.includes(clientId) &&
          c.participantIds.includes(app.symbioteId)
      );

      let convId = existingConv?.id;
      if (!convId) {
        convId = await createConversation([clientId, app.symbioteId], app.projectId);
      }

      navigate(`/client/messages?convId=${convId}`);
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setMessagingAppId(null);
    }
  };

  // Status Dropdown Select Handler
  const handleStatusChange = async (app: Application, newStatus: Application['status']) => {
    if (!app.id || app.status === newStatus) return;

    try {
      await updateApplicationStatus(app.id, newStatus);

      // Send notification to applicant
      await createNotification({
        userId: app.symbioteId,
        type: 'application',
        title: `Application Status Updated: ${newStatus.toUpperCase()}`,
        description: `Your application status for "${app.projectTitle || 'Project'}" has been updated to ${newStatus}.`,
        read: false,
        relatedItemId: app.projectId,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating application status:', err);
    }
  };

  // 3. Reject
  const handleReject = async (app: Application) => {
    if (!app.id) return;
    try {
      await updateApplicationStatus(app.id, 'rejected');

      // Send notification to applicant
      await createNotification({
        userId: app.symbioteId,
        type: 'application',
        title: `Application Update`,
        description: `Your application for "${app.projectTitle || 'Project'}" was not selected.`,
        read: false,
        relatedItemId: app.projectId,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error rejecting application:', err);
    }
  };

  // EXPORT CSV ACTION
  const handleExportCSV = () => {
    if (filteredApplications.length === 0) return;

    const headers = [
      'Applicant Name',
      'Title',
      'Project Title',
      'AI Match Score',
      'Experience Level',
      'Hourly Rate ($/hr)',
      'Applied Date',
      'Status',
    ];

    const rows = filteredApplications.map((app) => [
      `"${app.symbioteName}"`,
      `"${app.symbioteTitle}"`,
      `"${app.projectTitle}"`,
      `${app.aiMatchScore}%`,
      `"${app.experience}"`,
      `$${app.rate}`,
      `"${new Date(app.appliedAt).toLocaleDateString()}"`,
      `"${app.status.toUpperCase()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `applications_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER (§4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                Candidate Applications
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] font-mono">
                Review incoming candidate proposals, AI match ranks, and advance candidates through hiring stages.
              </p>
            </div>
          </div>
        </div>

        {/* HEADER CONTROLS (EXPORT CSV) */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCSV}
            disabled={filteredApplications.length === 0}
            variant="outline"
            className="h-10 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs font-semibold rounded-[8px] flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. 4 STAT CARDS (§4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* TOTAL APPLICATIONS */}
        <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
            <span className="truncate">TOTAL APPLICANTS</span>
            <Users className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={stats.total}
              mono
              tooltip={`Total Applicants: ${stats.total}`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Across all project briefs
          </p>
        </Card>

        {/* SHORTLISTED */}
        <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
            <span className="truncate">SHORTLISTED</span>
            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={stats.shortlisted}
              mono
              className="text-indigo-400"
              tooltip={`Shortlisted: ${stats.shortlisted}`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Marked for review
          </p>
        </Card>

        {/* INTERVIEW */}
        <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
            <span className="truncate">INTERVIEWING</span>
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={stats.interview}
              mono
              className="text-amber-400"
              tooltip={`Interviewing: ${stats.interview}`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            In active discussions
          </p>
        </Card>

        {/* HIRED */}
        <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
            <span className="truncate">HIRED SPECIALISTS</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success-green)] shrink-0" />
          </div>
          <div className="pt-1">
            <ResponsiveStatValue
              value={stats.hired}
              mono
              className="text-[var(--color-success-green)]"
              tooltip={`Hired Specialists: ${stats.hired}`}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">
            Contract finalized
          </p>
        </Card>
      </div>

      {/* 3. SEARCH & 2 FILTER DROPDOWNS (§4) */}
      <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by candidate name, skill, title, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
            />
          </div>

          {/* PROJECT FILTER DROPDOWN */}
          <div className="w-full md:w-56">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Projects ({projects.length})
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER DROPDOWN */}
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="pending" className="bg-slate-900 text-white">Pending</option>
              <option value="shortlisted" className="bg-slate-900 text-white">Shortlisted</option>
              <option value="interview" className="bg-slate-900 text-white">Interview</option>
              <option value="hired" className="bg-slate-900 text-white">Hired</option>
              <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. DATA TABLE (§4 & §15) */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[var(--color-text-secondary)] space-y-2">
            <Zap className="w-6 h-6 text-[var(--color-accent-cyan)] animate-spin mx-auto" />
            <p>Subscribing to live application stream...</p>
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
                  <th className="py-3.5 px-4 font-bold">Applicant</th>
                  <th className="py-3.5 px-4 font-bold">Project Brief</th>
                  <th className="py-3.5 px-4 font-bold">AI Match</th>
                  <th className="py-3.5 px-4 font-bold">Experience</th>
                  <th className="py-3.5 px-4 font-bold">Rate</th>
                  <th className="py-3.5 px-4 font-bold">Applied</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-xs">
                {filteredApplications.map((app) => {
                  const isMessaging = messagingAppId === (app.id || app.symbioteId);

                  return (
                    <tr
                      key={app.id || app.symbioteId}
                      className="hover:bg-[var(--color-background)]/50 transition-colors group"
                    >
                      {/* APPLICANT COLUMN */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={app.symbioteName}
                            initials={app.symbioteAvatarInitials}
                            src={app.symbioteAvatarUrl}
                            size="sm"
                            className="shrink-0 ring-1 ring-[var(--color-accent-cyan)]/40"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors block truncate">
                              {app.symbioteName}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--color-text-secondary)] block truncate">
                              {app.symbioteTitle}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PROJECT BRIEFS COLUMN */}
                      <td className="py-4 px-4 font-medium text-[var(--color-text-primary)] max-w-xs truncate">
                        {app.projectTitle}
                      </td>

                      {/* AI MATCH BADGE */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-mono font-bold text-[11px]">
                          <Sparkles className="w-3 h-3" />
                          {app.aiMatchScore}%
                        </span>
                      </td>

                      {/* EXPERIENCE LEVEL */}
                      <td className="py-4 px-4 font-mono text-[var(--color-text-secondary)]">
                        {app.experience}
                      </td>

                      {/* RATE */}
                      <td className="py-4 px-4 font-mono font-bold text-[var(--color-text-primary)]">
                        ${app.rate}/hr
                      </td>

                      {/* APPLIED DATE */}
                      <td className="py-4 px-4 font-mono text-[var(--color-text-secondary)] text-[11px]">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* STATUS DROPDOWN SELECT */}
                      <td className="py-4 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app, e.target.value as Application['status'])}
                          className={`px-2.5 py-1.5 rounded-[6px] text-[10.5px] font-mono font-bold uppercase tracking-wider cursor-pointer focus:outline-none transition-colors border ${
                            app.status === 'hired'
                              ? 'bg-[var(--color-success-green)]/15 border-[var(--color-success-green)]/40 text-[var(--color-success-green)]'
                              : app.status === 'interview'
                              ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                              : app.status === 'shortlisted'
                              ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                              : app.status === 'rejected'
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          }`}
                        >
                          <option value="pending" className="bg-slate-900 text-amber-400 font-mono">
                            Pending
                          </option>
                          <option value="shortlisted" className="bg-slate-900 text-purple-400 font-mono">
                            Shortlisted
                          </option>
                          <option value="interview" className="bg-slate-900 text-amber-400 font-mono">
                            Interview
                          </option>
                          <option value="hired" className="bg-slate-900 text-[var(--color-success-green)] font-mono">
                            Hired
                          </option>
                          <option value="rejected" className="bg-slate-900 text-rose-400 font-mono">
                            Rejected
                          </option>
                        </select>
                      </td>

                      {/* ACTIONS COLUMN */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. VIEW PROFILE */}
                          <button
                            onClick={() => handleViewProfile(app.symbioteId, app.projectId)}
                            title="View Specialist Profile"
                            className="p-2 rounded-[6px] hover:bg-[var(--color-background)] border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. MESSAGE CANDIDATE */}
                          <button
                            onClick={() => handleMessageCandidate(app)}
                            disabled={isMessaging}
                            title="Message Candidate"
                            className="p-2 rounded-[6px] hover:bg-[var(--color-background)] border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* 3. REJECT */}
                          <button
                            onClick={() => handleReject(app)}
                            disabled={app.status === 'rejected'}
                            title="Reject Candidate"
                            className={`p-2 rounded-[6px] border border-transparent hover:border-[var(--color-border)] transition-colors cursor-pointer ${
                              app.status === 'rejected'
                                ? 'text-rose-500 cursor-default opacity-50'
                                : 'text-[var(--color-text-secondary)] hover:text-rose-400 hover:bg-[var(--color-background)]'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : enrichedApplications.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No applications yet"
            description="Applications will appear here once professionals apply"
          />
        ) : (
          <EmptyState
            icon={UserX}
            title="No applications match filter criteria"
            description="Try adjusting your search query, project brief selector, or status filter dropdown above."
            actionLabel="Clear All Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedProjectId('all');
              setSelectedStatus('all');
            }}
          />
        )}
      </Card>
    </div>
  );
};
