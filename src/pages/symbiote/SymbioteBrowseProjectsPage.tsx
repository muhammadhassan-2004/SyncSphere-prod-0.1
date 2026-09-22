import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { subscribeToOpenProjects } from '@/src/lib/firestore';
import { Project } from '@/src/types/firestore';
import {
  Search,
  Filter,
  X,
  Compass,
  Clock,
  DollarSign,
  Briefcase,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  Building,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  'Web Dev',
  'Mobile',
  'AI/ML',
  'DevOps',
  'Data',
  'Backend',
];

const TIMELINES = [
  'Any Length',
  '<4 weeks',
  '4–8 weeks',
  '8+ weeks',
];

const EXPERIENCE_LEVELS = [
  'Junior',
  'Mid-level',
  'Senior',
  'Expert',
];

export const SymbioteBrowseProjectsPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const currentUid = firebaseUser?.uid || userProfile?.uid;

  // Firestore Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<'any' | 'under5k' | '5k-10k' | 'over10k'>('any');
  const [selectedTimelines, setSelectedTimelines] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Live Firestore Subscription (Scoped to open/published marketplace projects)
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToOpenProjects((openProjects) => {
      setProjects(openProjects);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Category Checkbox Handler
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Timeline Checkbox Handler
  const toggleTimeline = (tl: string) => {
    if (tl === 'Any Length') {
      setSelectedTimelines([]);
      return;
    }
    setSelectedTimelines((prev) =>
      prev.includes(tl) ? prev.filter((t) => t !== tl) : [...prev, tl]
    );
  };

  // Experience Checkbox Handler
  const toggleExperience = (exp: string) => {
    setSelectedExperience((prev) =>
      prev.includes(exp) ? prev.filter((e) => e !== exp) : [...prev, exp]
    );
  };

  // Reset All Filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setBudgetRange('any');
    setSelectedTimelines([]);
    setSelectedExperience([]);
  };

  // REAL FIRESTORE FILTERING LOGIC
  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      // 1. Search Query Filter (Title, Description, Category, TechTags)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = proj.title?.toLowerCase().includes(query);
        const descMatch = proj.description?.toLowerCase().includes(query);
        const catMatch = proj.category?.toLowerCase().includes(query);
        const tagsMatch = proj.techTags?.some((t) => t.toLowerCase().includes(query)) ||
                          proj.skills?.some((s) => s.toLowerCase().includes(query));

        if (!titleMatch && !descMatch && !catMatch && !tagsMatch) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategories.length > 0) {
        const projCategory = proj.category || '';
        const projTags = [...(proj.techTags || []), ...(proj.skills || [])];

        const matchesCat = selectedCategories.some((cat) => {
          const catLower = cat.toLowerCase();
          return (
            projCategory.toLowerCase().includes(catLower) ||
            projTags.some((t) => t.toLowerCase().includes(catLower))
          );
        });

        if (!matchesCat) return false;
      }

      // 3. Budget Range Filter
      if (budgetRange !== 'any') {
        const minB = proj.minBudget ?? 0;
        const maxB = proj.maxBudget ?? (typeof proj.budget === 'number' ? proj.budget : 0);

        if (budgetRange === 'under5k') {
          if (maxB > 5000 && minB > 5000) return false;
        } else if (budgetRange === '5k-10k') {
          if (maxB < 5000 || minB > 10000) return false;
        } else if (budgetRange === 'over10k') {
          if (maxB < 10000 && minB < 10000) return false;
        }
      }

      // 4. Timeline Filter
      if (selectedTimelines.length > 0 && !selectedTimelines.includes('Any Length')) {
        const projTimeline = (proj.timeline || proj.duration || '').toLowerCase();
        const matchesTimeline = selectedTimelines.some((tl) => {
          if (tl === '<4 weeks') return projTimeline.includes('<4') || projTimeline.includes('2 week') || projTimeline.includes('3 week') || projTimeline.includes('1 month');
          if (tl === '4–8 weeks') return projTimeline.includes('4-8') || projTimeline.includes('4–8') || projTimeline.includes('1-2 month') || projTimeline.includes('6 week');
          if (tl === '8+ weeks') return projTimeline.includes('8+') || projTimeline.includes('3 month') || projTimeline.includes('6 month') || projTimeline.includes('long term');
          return true;
        });
        if (!matchesTimeline) return false;
      }

      // 5. Experience Level Filter
      if (selectedExperience.length > 0) {
        const projExp = (proj.experienceLevel || '').toLowerCase();
        const matchesExp = selectedExperience.some((exp) =>
          projExp.includes(exp.toLowerCase())
        );
        if (!matchesExp) return false;
      }

      return true;
    });
  }, [projects, searchTerm, selectedCategories, budgetRange, selectedTimelines, selectedExperience]);

  // Deterministic Match % calculation or Pending AI Assessment
  const calculateMatchScore = (proj: Project): { score: number | null; label: string } => {
    if ((proj as any).matchScore !== undefined) {
      return { score: (proj as any).matchScore, label: `${(proj as any).matchScore}% Match` };
    }

    // Compute deterministic skill overlap if user profile has skills
    const userSkills = userProfile?.skills || [];
    const projSkills = [...(proj.techTags || []), ...(proj.skills || [])];

    if (userSkills.length > 0 && projSkills.length > 0) {
      const matchCount = projSkills.filter((ps) =>
        userSkills.some((us) => us.toLowerCase() === ps.toLowerCase())
      ).length;
      const calculated = Math.min(98, Math.max(60, Math.round((matchCount / projSkills.length) * 100)));
      return { score: calculated, label: `${calculated}% Skill Match` };
    }

    // Explicit Gap Flagging per prompt instructions: AI Assessment Pending when no profile skills or matchScore doc field
    return { score: null, label: 'AI Match Pending' };
  };

  // Helper for budget display
  const formatBudget = (proj: Project): string => {
    if (proj.minBudget && proj.maxBudget) {
      return `$${proj.minBudget.toLocaleString()} – $${proj.maxBudget.toLocaleString()}`;
    }
    if (proj.maxBudget) {
      return `Up to $${proj.maxBudget.toLocaleString()}`;
    }
    if (typeof proj.budget === 'number') {
      return `$${proj.budget.toLocaleString()}`;
    }
    if (typeof proj.budget === 'object' && proj.budget?.total) {
      return `$${proj.budget.total.toLocaleString()}`;
    }
    return 'Budget Negotiable';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-500" /> Browse Projects
          </h1>
          <p className="text-caption text-[var(--color-text-secondary)] mt-1">
            Explore open client projects matched for Symbiote specialists.
          </p>
        </div>

        {/* Local Search Input & Result Count */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-body rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden border-[var(--color-border)] text-[var(--color-text-primary)]"
          >
            <Filter className="w-4 h-4 mr-1.5" /> Filters
          </Button>

          <span className="text-caption font-mono font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 whitespace-nowrap">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
          </span>
        </div>
      </div>

      {/* TWO COLUMN CONTENT: FILTER SIDEBAR (260px) + MAIN PROJECT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT FILTER SIDEBAR (~260px) */}
        <aside
          className={`md:col-span-4 lg:col-span-3 space-y-6 p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] ${
            mobileFilterOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-500" /> Filters
            </h3>
            {(selectedCategories.length > 0 ||
              budgetRange !== 'any' ||
              selectedTimelines.length > 0 ||
              selectedExperience.length > 0 ||
              searchTerm) && (
              <button
                onClick={resetFilters}
                className="text-caption text-emerald-500 hover:underline font-medium"
              >
                Reset All
              </button>
            )}
          </div>

          {/* FILTER 1: CATEGORY */}
          <div className="space-y-2.5">
            <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Category
            </h4>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const checked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 text-body text-[var(--color-text-primary)] cursor-pointer hover:text-emerald-400 transition-colors py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] accent-emerald-500"
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* FILTER 2: BUDGET RANGE (RADIO) */}
          <div className="space-y-2.5 border-t border-[var(--color-border)] pt-4">
            <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Budget Range
            </h4>
            <div className="space-y-1.5">
              {[
                { id: 'any', label: 'Any Budget' },
                { id: 'under5k', label: 'Under $5k' },
                { id: '5k-10k', label: '$5k–$10k' },
                { id: 'over10k', label: 'Over $10k' },
              ].map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2.5 text-body text-[var(--color-text-primary)] cursor-pointer hover:text-emerald-400 transition-colors py-0.5"
                >
                  <input
                    type="radio"
                    name="budgetRange"
                    value={b.id}
                    checked={budgetRange === b.id}
                    onChange={() => setBudgetRange(b.id as any)}
                    className="w-4 h-4 border-[var(--color-border)] bg-[var(--color-background)] accent-emerald-500"
                  />
                  <span>{b.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* FILTER 3: TIMELINE */}
          <div className="space-y-2.5 border-t border-[var(--color-border)] pt-4">
            <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Timeline
            </h4>
            <div className="space-y-1.5">
              {TIMELINES.map((tl) => {
                const checked =
                  tl === 'Any Length'
                    ? selectedTimelines.length === 0
                    : selectedTimelines.includes(tl);
                return (
                  <label
                    key={tl}
                    className="flex items-center gap-2.5 text-body text-[var(--color-text-primary)] cursor-pointer hover:text-emerald-400 transition-colors py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTimeline(tl)}
                      className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] accent-emerald-500"
                    />
                    <span>{tl}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* FILTER 4: EXPERIENCE LEVEL */}
          <div className="space-y-2.5 border-t border-[var(--color-border)] pt-4">
            <h4 className="text-caption font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Experience Level
            </h4>
            <div className="space-y-1.5">
              {EXPERIENCE_LEVELS.map((exp) => {
                const checked = selectedExperience.includes(exp);
                return (
                  <label
                    key={exp}
                    className="flex items-center gap-2.5 text-body text-[var(--color-text-primary)] cursor-pointer hover:text-emerald-400 transition-colors py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExperience(exp)}
                      className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] accent-emerald-500"
                    />
                    <span>{exp}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA: VERTICAL STACK OF PROJECT CARDS */}
        <main className="md:col-span-8 lg:col-span-9 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px]">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-body font-medium">Fetching open client projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No projects match your filters"
              description="Try resetting your category, budget, timeline, or search filters to see more projects."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          ) : (
            filteredProjects.map((proj) => {
              const match = calculateMatchScore(proj);
              const budgetDisplay = formatBudget(proj);
              const tags = proj.techTags || proj.skills || ['React', 'TypeScript', 'Node.js'];

              return (
                <div
                  key={proj.id}
                  className="group relative p-6 border border-[var(--color-border)] hover:border-cyan-500/40 bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]/90 rounded-[14px] space-y-4.5 transition-all duration-200 hover:shadow-[0_8px_30px_-8px_rgba(6,182,212,0.14)] hover:-translate-y-0.5"
                >
                  {/* TOP ROW: TITLE + META + BUDGET + MATCH BADGE */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3
                          onClick={() => navigate(`/symbiote/browse/${proj.id}`)}
                          className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] group-hover:text-cyan-400 transition-colors cursor-pointer leading-snug"
                        >
                          {proj.title}
                        </h3>

                        {/* OUTLINED AI MATCH / COMPATIBILITY BADGE */}
                        {match.score === null ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 hover:border-white/35 text-[11.5px] font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent backdrop-blur-xs transition-colors select-none">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 opacity-90 animate-pulse" />
                            <span>AI Match Pending</span>
                          </span>
                        ) : match.score >= 90 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 text-[11.5px] font-mono font-medium text-emerald-400 bg-emerald-500/10 select-none shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{match.label}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/40 text-[11.5px] font-mono font-medium text-cyan-400 bg-cyan-500/10 select-none shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{match.label}</span>
                          </span>
                        )}
                      </div>

                      {/* META DETAILS ROW */}
                      <div className="flex items-center gap-2.5 text-xs text-[var(--color-text-secondary)] flex-wrap">
                        {proj.category && (
                          <>
                            <span className="px-2 py-0.5 rounded bg-[var(--color-background)] border border-[var(--color-border)] font-medium text-[11px] text-[var(--color-text-primary)]">
                              {proj.category}
                            </span>
                            <span className="text-[var(--color-border)]">•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400/70" /> {proj.duration || proj.timeline || '4 Weeks'}
                        </span>
                        <span className="text-[var(--color-border)]">•</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-400/70" /> {proj.experienceLevel || 'Senior'}
                        </span>
                        {proj.ownerId && (
                          <>
                            <span className="text-[var(--color-border)]">•</span>
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-[var(--color-text-secondary)]/70" /> Client: {proj.ownerId?.substring(0, 8)}...
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* BUDGET PRESENTATION */}
                    <div className="sm:text-right shrink-0">
                      <div className="text-base sm:text-lg font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                        {budgetDisplay}
                      </div>
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        {proj.budgetType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
                      </span>
                    </div>
                  </div>

                  {/* PROJECT DESCRIPTION SNIPPET */}
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>

                  {/* TECH / SKILL TAGS (CYAN-TO-GREEN GRADIENT ACCENT TREATMENT) */}
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-gradient-to-r from-cyan-500/[0.08] to-emerald-500/[0.08] border border-cyan-500/25 text-cyan-200/90 hover:text-cyan-100 hover:border-emerald-500/40 hover:from-cyan-500/[0.14] hover:to-emerald-500/[0.14] transition-all cursor-default shadow-[0_1px_4px_rgba(6,182,212,0.04)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* BOTTOM ACTION BAR */}
                  <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-text-secondary)]/60" />
                      <span>Posted {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'Recently'}</span>
                    </span>

                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/symbiote/browse/${proj.id}`)}
                        className="h-8 px-3 text-xs border-[var(--color-border)] hover:border-cyan-500/40 text-[var(--color-text-primary)] hover:text-cyan-300"
                      >
                        View Details
                      </Button>

                      {currentUid && (
                        proj.symbioteId === currentUid ||
                        (proj.teamMembers || []).some((m) => m.uid === currentUid)
                      ) ? (
                        <span className="h-8 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 rounded-[8px] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Hired
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/symbiote/browse/${proj.id}`)}
                          className="h-8 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-bold px-4 text-xs shadow-sm border-0 group/btn"
                        >
                          <span>Apply Now</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
};
