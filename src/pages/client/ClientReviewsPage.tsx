import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Review, Project } from '@/src/types/firestore';
import { getProjectReview, getReviewsForUser, createReview, subscribeToClientReviews } from '@/src/lib/firestore/reviews';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { subscribeToSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import {
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  MessageSquare,
  ThumbsUp,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  XCircle,
} from 'lucide-react';

export const ClientReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const clientId = firebaseUser?.uid || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Subscribe to client's projects
  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList || []);
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  // Load reviews created by this client with real-time listener
  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeToClientReviews(clientId, (res) => {
      setReviews(res || []);
    });
    return () => unsub();
  }, [clientId]);

  // Symbiotes helper
  const [symbiotes, setSymbiotes] = useState<any[]>([]);
  useEffect(() => {
    const unsub = subscribeToSymbiotesFromFirestore((list) => {
      setSymbiotes(list || []);
    });
    return () => unsub();
  }, []);

  // Symbiote map helper
  const symbioteMap = React.useMemo(() => {
    const map: Record<string, { name: string; title: string; initials: string; avatarUrl?: string }> = {};
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
        title: s.headline || s.roleTitle || 'Technical Consultant',
        initials: initials || 'SP',
        avatarUrl: s.avatarUrl || s.photoURL,
      };
    });
    return map;
  }, [symbiotes]);

  // Filter Valid (Non-declined) Reviews
  const validReviews = React.useMemo(() => {
    return reviews.filter((r) => !r.declined);
  }, [reviews]);

  // Search filtered reviews
  const displayedReviews = React.useMemo(() => {
    if (!searchQuery.trim()) return validReviews;
    const q = searchQuery.toLowerCase();
    return validReviews.filter((r) => {
      const pName = (r.projectName || '').toLowerCase();
      const sName = (r.symbioteName || '').toLowerCase();
      const fBack = (r.feedback || '').toLowerCase();
      return pName.includes(q) || sName.includes(q) || fBack.includes(q);
    });
  }, [validReviews, searchQuery]);

  // Filter Completed / Closed Projects that need reviews
  const completedProjects = React.useMemo(() => {
    const reviewedProjectIds = new Set(reviews.map((r) => r.projectId));
    return projects.filter(
      (p) => (p.status === 'completed' || p.status === 'closed') && !reviewedProjectIds.has(p.id || '')
    );
  }, [projects, reviews]);

  const getStarLabel = (rating: number) => {
    if (rating === 5) return 'Excellent';
    if (rating === 4) return 'Good';
    if (rating === 3) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-amber-400/15 border border-amber-400/30 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                Reviews & Quality Feedback
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                Provide ratings for completed project briefs and view past submitted performance reviews.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PENDING REVIEWS SECTION (§11.8, §13.5 trigger) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Project Reviews ({completedProjects.length})</span>
          </h2>
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
            Review completed work to close contract milestones
          </span>
        </div>

        {completedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedProjects.map((p) => {
              const firstMember = p.teamMembers && p.teamMembers.length > 0 ? p.teamMembers[0] : null;
              const sId = p.assignedSymbioteId || (p as any).symbioteId || firstMember?.uid || (firstMember as any)?.symbioteId;
              const sInfo = sId ? symbioteMap[sId] : null;

              const hasSpecialist = Boolean(sInfo?.name || p.assignedSymbioteName || firstMember?.displayName);
              const symbioteName =
                sInfo?.name ||
                p.assignedSymbioteName ||
                firstMember?.displayName ||
                'Unassigned Specialist';
              const symbioteTitle =
                sInfo?.title ||
                firstMember?.role ||
                (hasSpecialist ? 'AI Specialist' : 'No Specialist Assigned');
              const symbioteInitials =
                sInfo?.initials ||
                (firstMember?.displayName
                  ? firstMember.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : null) ||
                (hasSpecialist ? symbioteName.slice(0, 2).toUpperCase() : 'NA');
              const symbioteAvatar = sInfo?.avatarUrl || firstMember?.avatarUrl;

              // Safe budget formatting (prevents [object Object])
              const budgetDisplay = (() => {
                if (!p.budget) return 'Milestone Based';
                if (typeof p.budget === 'number') return `$${p.budget.toLocaleString()} USD`;
                if (typeof p.budget === 'string') {
                  if (p.budget.includes('[object')) return 'Milestone Based';
                  const num = parseFloat(p.budget.replace(/[^0-9.]/g, ''));
                  if (!isNaN(num) && num > 0) return `$${num.toLocaleString()} USD`;
                  return p.budget.startsWith('$') ? `${p.budget} USD` : `$${p.budget} USD`;
                }
                if (typeof p.budget === 'object') {
                  const val = p.budget.total ?? p.budget.max ?? p.budget.min ?? (p.budget as any).amount;
                  if (typeof val === 'number') return `$${val.toLocaleString()} USD`;
                  if (typeof val === 'string') {
                    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                    if (!isNaN(num) && num > 0) return `$${num.toLocaleString()} USD`;
                  }
                }
                return 'Milestone Based';
              })();

              return (
                <Card
                  key={p.id}
                  className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 hover:border-[var(--color-accent-cyan)]/50 transition-all shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                          Completed Brief
                        </span>
                        <h3 className="text-base font-bold font-mono text-[var(--color-text-primary)]">
                          {p.title}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                        Ready for Review
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <Avatar
                        name={symbioteName}
                        initials={symbioteInitials}
                        src={symbioteAvatar}
                        size="md"
                        statusDot="online"
                        className="shrink-0 ring-1 ring-[var(--color-accent-cyan)]/30"
                      />
                      <div className="truncate">
                        <span className="text-[var(--color-text-primary)] font-semibold block truncate">
                          {symbioteName}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-secondary)] truncate block">
                          {symbioteTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {budgetDisplay}
                    </span>
                    <Button
                      onClick={() => navigate(`/client/projects/${p.id}/review?from=reviews`)}
                      className="h-9 bg-gradient-to-r from-[var(--color-accent-cyan)] to-blue-500 text-slate-950 font-mono text-xs font-bold px-4 rounded-[8px] flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-[1.02] transition-all cursor-pointer active:scale-95"
                    >
                      <span>Leave Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <p className="text-xs font-mono text-[var(--color-text-primary)] font-semibold">
              All completed projects have been reviewed!
            </p>
            <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              When an active project transitions to completed, it will automatically appear here for evaluation.
            </p>
          </div>
        )}
      </div>

      {/* 3. PAST SUBMITTED REVIEWS SECTION */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span>
              Past Submitted Reviews ({searchQuery.trim() ? `${displayedReviews.length} of ${validReviews.length}` : validReviews.length})
            </span>
          </h2>

          {validReviews.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by project or specialist..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-mono cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {validReviews.length === 0 ? (
          <div className="p-10 text-center space-y-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px]">
            <MessageSquare className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto opacity-40" />
            <p className="text-xs font-mono text-[var(--color-text-secondary)]">
              No submitted reviews found yet. Complete a brief above to publish your first review.
            </p>
          </div>
        ) : displayedReviews.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px]">
            <Search className="w-6 h-6 text-[var(--color-text-secondary)] mx-auto opacity-40" />
            <p className="text-xs font-mono text-[var(--color-text-primary)] font-semibold">
              No reviews match "{searchQuery}"
            </p>
            <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              Try searching by a different specialist name, project title, or keyword.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedReviews.map((r) => {
              const matchedSymbiote = symbioteMap[r.toUserId || r.symbioteId || ''];
              const rawName = r.symbioteName && r.symbioteName !== 'Alex Chen' ? r.symbioteName : matchedSymbiote?.name;
              const displayName = rawName && rawName !== 'Alex Chen' ? rawName : 'Assigned Specialist';
              const displayTitle = matchedSymbiote?.title || 'Technical Specialist';
              const displayInitials = matchedSymbiote?.initials || displayName.slice(0, 2).toUpperCase();

              const sInfo = {
                name: displayName,
                title: displayTitle,
                initials: displayInitials,
                avatarUrl: matchedSymbiote?.avatarUrl,
              };

              return (
                <Card
                  key={r.id || r.projectId}
                  className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={sInfo.name}
                        initials={sInfo.initials}
                        src={sInfo.avatarUrl}
                        size="md"
                      />
                      <div>
                        <h4 className="text-sm font-bold font-mono text-[var(--color-text-primary)]">
                          {sInfo.name}
                        </h4>
                        <span className="text-xs font-mono text-[var(--color-accent-cyan)]">
                          Project: {r.projectName || r.projectId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full text-amber-400 text-xs font-bold font-mono">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{r.ratings?.overall || 5} / 5</span>
                        <span className="text-[10px] text-amber-300 ml-1">
                          ({getStarLabel(r.ratings?.overall || 5)})
                        </span>
                      </div>
                      {r.recommend && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* FEEDBACK TEXT */}
                  {r.feedback && (
                    <div className="p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] leading-relaxed">
                      "{r.feedback}"
                    </div>
                  )}

                  {/* BREAKDOWN OF 5 CRITERIA */}
                  {r.ratings && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-[6px] bg-[var(--color-background)]/50 border border-[var(--color-border)]/60">
                        <span className="text-[var(--color-text-secondary)] block">Communication</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {r.ratings.communication} / 5
                        </span>
                      </div>
                      <div className="p-2 rounded-[6px] bg-[var(--color-background)]/50 border border-[var(--color-border)]/60">
                        <span className="text-[var(--color-text-secondary)] block">Tech Skills</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {r.ratings.technicalSkills} / 5
                        </span>
                      </div>
                      <div className="p-2 rounded-[6px] bg-[var(--color-background)]/50 border border-[var(--color-border)]/60">
                        <span className="text-[var(--color-text-secondary)] block">Timeliness</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {r.ratings.timeliness} / 5
                        </span>
                      </div>
                      <div className="p-2 rounded-[6px] bg-[var(--color-background)]/50 border border-[var(--color-border)]/60">
                        <span className="text-[var(--color-text-secondary)] block">Work Quality</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {r.ratings.workQuality} / 5
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
