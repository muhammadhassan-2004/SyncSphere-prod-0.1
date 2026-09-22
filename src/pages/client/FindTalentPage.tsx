import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import { useAuth } from '@/src/context/AuthContext';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { subscribeToSymbiotesFromFirestore, getAllSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { InviteModal } from '@/src/components/talent/InviteModal';
import { subscribeToClientInvitations } from '@/src/lib/firestore/invitations';
import { Invitation } from '@/src/types/firestore';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  X,
  Sparkles,
  Send,
  UserCheck,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';

const SKILL_OPTIONS = [
  'Python',
  'PyTorch',
  'LangChain',
  'FastAPI',
  'React',
  'TypeScript',
  'TensorFlow',
  'Kubernetes',
  'Docker',
  'Llama',
  'Node.js',
  'vLLM',
  'VectorDB',
  'AutoGen',
  'OpenCV',
];

const EXPERIENCE_OPTIONS = ['Junior', 'Mid', 'Senior', 'Expert'];
const AVAILABILITY_OPTIONS = ['Immediate', 'Part-time', '2+ weeks'];
const LOCATION_OPTIONS = ['Remote', 'United States', 'Europe', 'Asia'];

export const FindTalentPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, userProfile, authenticatedUser } = useAuth();
  const currentUserId = firebaseUser?.uid || authenticatedUser?.uid || userProfile?.uid;
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected candidate for invite modal
  const [selectedCandidate, setSelectedCandidate] = useState<SymbioteProfile | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Client invitations for tracking sent invites
  const [clientInvitations, setClientInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setClientInvitations([]);
      return;
    }
    const unsub = subscribeToClientInvitations(currentUserId, (invs) => {
      setClientInvitations(invs);
    });
    return () => unsub();
  }, [currentUserId]);

  const invitedSymbioteUids = useMemo(() => {
    const set = new Set<string>();
    clientInvitations.forEach((inv) => {
      if (inv.symbioteId && inv.status !== 'rejected' && inv.status !== 'declined') {
        set.add(inv.symbioteId);
      }
    });
    return set;
  }, [clientInvitations]);

  // Parse URL Search Parameters
  const searchQuery = searchParams.get('q') || '';
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';
  const selectedSkills = useMemo(
    () => (searchParams.get('skills') ? searchParams.get('skills')!.split(',') : []),
    [searchParams]
  );
  const selectedExp = useMemo(
    () => (searchParams.get('exp') ? searchParams.get('exp')!.split(',') : []),
    [searchParams]
  );
  const selectedAvail = useMemo(
    () => (searchParams.get('avail') ? searchParams.get('avail')!.split(',') : []),
    [searchParams]
  );
  const selectedLoc = useMemo(
    () => (searchParams.get('loc') ? searchParams.get('loc')!.split(',') : []),
    [searchParams]
  );
  const minRateParam = searchParams.get('minRate') || '';
  const maxRateParam = searchParams.get('maxRate') || '';

  // Helper to update a single search parameter while retaining others
  const updateQueryParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  // Helper to toggle items in array-based params
  const toggleArrayParam = (key: string, currentList: string[], item: string) => {
    const nextList = currentList.includes(item)
      ? currentList.filter((i) => i !== item)
      : [...currentList, item];
    updateQueryParam(key, nextList.length > 0 ? nextList.join(',') : null);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const [symbiotesList, setSymbiotesList] = useState<SymbioteProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Subscribe & Fetch real Firestore Symbiote users ONLY
  useEffect(() => {
    let isMounted = true;

    const mapUsers = (users: any[]): SymbioteProfile[] => {
      return users.map((u) => ({
        uid: u.uid || u.id,
        email: u.email || 'specialist@syncsphere.io',
        displayName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Symbiote Specialist',
        title: u.title || u.jobTitle || 'AI Engineering Specialist',
        avatarInitials: u.avatarInitials || (u.displayName || u.firstName || 'SP').slice(0, 2).toUpperCase(),
        avatarUrl: u.avatarUrl || '',
        rating: typeof u.rating === 'number' ? u.rating : (parseFloat(u.rating) || 0),
        reviewsCount: typeof u.reviewsCount === 'number' ? u.reviewsCount : (typeof u.reviewCount === 'number' ? u.reviewCount : (parseInt(u.reviewsCount || u.reviewCount, 10) || 0)),
        completedProjects: u.completedProjects ?? 0,
        hourlyRate: u.hourlyRate ?? 130,
        experience: (u.experience as any) || 'Senior',
        availability: (u.availability as any) || 'Immediate',
        location: u.location || 'Remote',
        bio: u.bio || '',
        skills: Array.isArray(u.skills) && u.skills.length > 0 ? u.skills : ['Python', 'PyTorch', 'LangChain', 'FastAPI'],
        portfolio: u.portfolio || [],
        experiences: u.experiences || [],
        certifications: u.certifications || [],
        createdAt: u.createdAt || u.updatedAt || '',
      }));
    };

    setLoading(true);

    // Initial direct getDocs fetch
    getAllSymbiotesFromFirestore().then((initialUsers) => {
      if (isMounted) {
        setSymbiotesList(mapUsers(initialUsers || []));
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Error loading initial symbiotes from Firestore:', err);
      if (isMounted) {
        setSymbiotesList([]);
        setLoading(false);
      }
    });

    // Real-time listener
    const unsub = subscribeToSymbiotesFromFirestore((users) => {
      if (isMounted) {
        setSymbiotesList(mapUsers(users || []));
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Filtered and Sorted Symbiotes logic
  const filteredSymbiotes = useMemo(() => {
    const list = symbiotesList.filter((symbiote) => {
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = symbiote.displayName.toLowerCase().includes(q);
        const matchesTitle = symbiote.title.toLowerCase().includes(q);
        const matchesBio = symbiote.bio.toLowerCase().includes(q);
        const matchesSkills = symbiote.skills.some((s) => s.toLowerCase().includes(q));
        const matchesLocation = symbiote.location.toLowerCase().includes(q);
        const matchesExp = symbiote.experience.toLowerCase().includes(q);
        const matchesEmail = symbiote.email.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesBio && !matchesSkills && !matchesLocation && !matchesExp && !matchesEmail) {
          return false;
        }
      }

      // Skills
      if (selectedSkills.length > 0) {
        const hasSkill = selectedSkills.some((sk) =>
          symbiote.skills.map((s) => s.toLowerCase()).includes(sk.toLowerCase())
        );
        if (!hasSkill) return false;
      }

      // Experience
      if (selectedExp.length > 0) {
        const matchesExp = selectedExp.some(
          (exp) =>
            exp.toLowerCase() === symbiote.experience.toLowerCase() ||
            symbiote.experience.toLowerCase().includes(exp.toLowerCase())
        );
        if (!matchesExp) return false;
      }

      // Availability
      if (selectedAvail.length > 0) {
        const matchesAvail = selectedAvail.some((avail) => {
          const a = avail.toLowerCase();
          const symAvail = symbiote.availability.toLowerCase();
          if (a.includes('immediate') || a.includes('full')) {
            return symAvail.includes('immediate') || symAvail.includes('full') || symAvail.includes('40');
          }
          if (a.includes('part')) {
            return symAvail.includes('part') || symAvail.includes('20') || symAvail.includes('30');
          }
          if (a.includes('2+')) {
            return symAvail.includes('2+') || symAvail.includes('week');
          }
          return symAvail.includes(a);
        });
        if (!matchesAvail) return false;
      }

      // Location
      if (selectedLoc.length > 0) {
        const matchesLoc = selectedLoc.some((loc) => {
          const l = loc.toLowerCase();
          const symLoc = symbiote.location.toLowerCase();
          if (l === 'united states' || l === 'us' || l === 'usa') {
            return (
              symLoc.includes('usa') ||
              symLoc.includes('us') ||
              symLoc.includes('united states') ||
              symLoc.includes('tx') ||
              symLoc.includes('ma') ||
              symLoc.includes('ca') ||
              symLoc.includes('austin') ||
              symLoc.includes('boston')
            );
          }
          if (l === 'remote') {
            return true; // All digital symbiotes support remote contracts
          }
          return symLoc.includes(l);
        });
        if (!matchesLoc) return false;
      }

      // Rate Min/Max
      if (minRateParam) {
        const minVal = parseInt(minRateParam, 10);
        if (!isNaN(minVal) && symbiote.hourlyRate < minVal) return false;
      }
      if (maxRateParam) {
        const maxVal = parseInt(maxRateParam, 10);
        if (!isNaN(maxVal) && symbiote.hourlyRate > maxVal) return false;
      }

      return true;
    });

    // Sort specialists:
    // 1. Specialists with ratings appear first, sorted by rating descending, then review count descending
    // 2. Specialists with no ratings appear after, sorted by most recently joined / completed projects
    return [...list].sort((a, b) => {
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      const aReviews = a.reviewsCount || 0;
      const bReviews = b.reviewsCount || 0;
      const aHasRating = aRating > 0 && aReviews > 0;
      const bHasRating = bRating > 0 && bReviews > 0;

      // Rated specialists come first
      if (aHasRating && !bHasRating) return -1;
      if (!aHasRating && bHasRating) return 1;

      if (aHasRating && bHasRating) {
        // Higher rating first
        if (bRating !== aRating) {
          return bRating - aRating;
        }
        // More positive reviews next
        if (bReviews !== aReviews) {
          return bReviews - aReviews;
        }
        // More completed projects next
        if ((b.completedProjects || 0) !== (a.completedProjects || 0)) {
          return (b.completedProjects || 0) - (a.completedProjects || 0);
        }
      }

      // Specialists without ratings (or identical ratings): sort by completed projects, then most recent createdAt, then name
      if ((b.completedProjects || 0) !== (a.completedProjects || 0)) {
        return (b.completedProjects || 0) - (a.completedProjects || 0);
      }

      if (a.createdAt && b.createdAt) {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
          return timeB - timeA;
        }
      }

      return a.displayName.localeCompare(b.displayName);
    });
  }, [
    symbiotesList,
    searchQuery,
    selectedSkills,
    selectedExp,
    selectedAvail,
    selectedLoc,
    minRateParam,
    maxRateParam,
  ]);

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    selectedSkills.length +
    selectedExp.length +
    selectedAvail.length +
    selectedLoc.length +
    (minRateParam ? 1 : 0) +
    (maxRateParam ? 1 : 0);

  const handleOpenInvite = (candidate: SymbioteProfile) => {
    setSelectedCandidate(candidate);
    setIsInviteModalOpen(true);
  };

  const handleInviteSuccess = (projectName: string) => {
    setToastMessage(
      `Invitation sent successfully to ${selectedCandidate?.displayName} for "${projectName}"!`
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Find Freelancers
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Discover and hire elite AI architects, MLOps specialists, and LLM fine-tuning experts.
          </p>
        </div>

        {/* VIEW MODE TOGGLE BUTTONS */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] p-1">
            <button
              type="button"
              onClick={() => updateQueryParam('view', 'grid')}
              className={`p-1.5 rounded-[6px] text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => updateQueryParam('view', 'list')}
              className={`p-1.5 rounded-[6px] text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden p-2 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span>Filters ({activeFiltersCount})</span>
          </button>
        </div>
      </div>

      {/* TOAST SUCCESS BANNER */}
      {toastMessage && (
        <div className="p-3.5 rounded-[10px] bg-[var(--color-success-green)]/10 border border-[var(--color-success-green)]/30 text-[var(--color-success-green)] text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FULL-WIDTH SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
        <Input
          value={searchQuery}
          onChange={(e) => updateQueryParam('q', e.target.value || null)}
          placeholder="Search specialists by name, role (e.g. MLOps, LLM), skill (e.g. PyTorch, LangChain), or keyword..."
          className="pl-10 pr-10 text-xs py-2.5 bg-[var(--color-surface)] border-[var(--color-border)] focus:border-[var(--color-accent-cyan)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => updateQueryParam('q', null)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: FILTERS SIDEBAR */}
        <div
          className={`space-y-6 bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-[12px] ${
            showMobileFilters ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h2 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                Filter Candidates
              </h2>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[10.5px] font-mono text-[var(--color-accent-cyan)] hover:underline cursor-pointer"
              >
                Reset All ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* SKILLS CHECKBOXES */}
          <div className="space-y-2">
            <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Specialized Skills
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {SKILL_OPTIONS.map((skill) => {
                const isChecked = selectedSkills.includes(skill);
                return (
                  <label
                    key={skill}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-cyan)] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayParam('skills', selectedSkills, skill)}
                      className="rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-0 cursor-pointer"
                    />
                    <span>{skill}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* EXPERIENCE CHECKBOXES */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Experience Level
            </span>
            <div className="space-y-1.5">
              {EXPERIENCE_OPTIONS.map((exp) => {
                const isChecked = selectedExp.includes(exp);
                return (
                  <label
                    key={exp}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-cyan)] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayParam('exp', selectedExp, exp)}
                      className="rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-0 cursor-pointer"
                    />
                    <span>{exp}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* AVAILABILITY CHECKBOXES */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Availability
            </span>
            <div className="space-y-1.5">
              {AVAILABILITY_OPTIONS.map((avail) => {
                const isChecked = selectedAvail.includes(avail);
                return (
                  <label
                    key={avail}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-cyan)] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayParam('avail', selectedAvail, avail)}
                      className="rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-0 cursor-pointer"
                    />
                    <span>{avail}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* LOCATION CHECKBOXES */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Location / Timezone
            </span>
            <div className="space-y-1.5">
              {LOCATION_OPTIONS.map((loc) => {
                const isChecked = selectedLoc.includes(loc);
                return (
                  <label
                    key={loc}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-cyan)] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayParam('loc', selectedLoc, loc)}
                      className="rounded border-[var(--color-border)] text-[var(--color-accent-cyan)] focus:ring-0 cursor-pointer"
                    />
                    <span>{loc}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* HOURLY RATE RANGE INPUT */}
          <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Hourly Rate ($/hr)
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minRateParam}
                onChange={(e) => updateQueryParam('minRate', e.target.value || null)}
                className="text-xs py-1 px-2"
              />
              <span className="text-xs font-mono text-[var(--color-text-secondary)]">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxRateParam}
                onChange={(e) => updateQueryParam('maxRate', e.target.value || null)}
                className="text-xs py-1 px-2"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CARD GRID / LIST VIEW (3 COLS ON DESKTOP) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--color-text-secondary)]">
            <span>
              Showing <strong className="text-[var(--color-text-primary)]">{filteredSymbiotes.length}</strong> available AI specialist{filteredSymbiotes.length !== 1 && 's'}
            </span>
            {activeFiltersCount > 0 && (
              <span className="text-[var(--color-accent-cyan)]">{activeFiltersCount} filter(s) applied</span>
            )}
          </div>

          {loading && symbiotesList.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-border)]" />
                    <div className="space-y-2 flex-1">
                      <div className="w-28 h-3.5 bg-[var(--color-border)] rounded" />
                      <div className="w-40 h-2.5 bg-[var(--color-border)] rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-[var(--color-border)] rounded" />
                    <div className="w-3/4 h-3 bg-[var(--color-border)] rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredSymbiotes.length === 0 ? (
            <Card className="p-12 text-center space-y-3 bg-[var(--color-surface)] border-[var(--color-border)]">
              <Search className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No Symbiote Specialists Found</h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
                No specialists matched your criteria. Try adjusting or clearing your filters.
              </p>
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </Card>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW (2 COLUMNS) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSymbiotes.map((symbiote) => {
                const isInvited = invitedSymbioteUids.has(symbiote.uid);

                return (
                  <Card
                    key={symbiote.uid}
                    className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* TOP HEADER ROW */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={symbiote.displayName}
                            initials={symbiote.avatarInitials}
                            src={symbiote.avatarUrl}
                            size="md"
                            statusDot="online"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                                {symbiote.displayName}
                              </h3>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
                            </div>
                            <p className="text-[11.5px] text-[var(--color-text-secondary)] line-clamp-1">
                              {symbiote.title}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                            ${symbiote.hourlyRate}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-mono block">/ hour</span>
                        </div>
                      </div>

                      {/* RATING & META BADGES */}
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        {symbiote.reviewsCount > 0 ? (
                          <>
                            <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {symbiote.rating.toFixed(2)}
                            </span>
                            <span className="text-[var(--color-text-secondary)]">({symbiote.reviewsCount} review{symbiote.reviewsCount === 1 ? '' : 's'})</span>
                          </>
                        ) : (
                          <span className="text-[var(--color-text-secondary)] font-mono flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 opacity-40" />
                            <span>No ratings yet</span>
                          </span>
                        )}
                        <span className="text-[var(--color-border)]">•</span>
                        <span className="text-[var(--color-text-secondary)] flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                          {symbiote.location}
                        </span>
                      </div>

                      {/* BIO SUMMARY */}
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                        {symbiote.bio}
                      </p>

                      {/* TOP SKILL TAGS */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {symbiote.skills.slice(0, 4).map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                          >
                            {sk}
                          </span>
                        ))}
                        {symbiote.skills.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--color-text-secondary)]">
                            +{symbiote.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BOTTOM ACTION BUTTONS */}
                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                      {isInvited ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs opacity-60 cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success-green)]" />
                          <span>Invited</span>
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenInvite(symbiote)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Invite</span>
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/client/professionals/${symbiote.uid}`)}
                        className="flex-1 text-xs"
                      >
                        <span>View Profile</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW (1 COLUMN) */
            <div className="space-y-3">
              {filteredSymbiotes.map((symbiote) => {
                const isInvited = invitedSymbioteUids.has(symbiote.uid);

                return (
                  <Card
                    key={symbiote.uid}
                    className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <Avatar
                        name={symbiote.displayName}
                        initials={symbiote.avatarInitials}
                        src={symbiote.avatarUrl}
                        size="md"
                        statusDot="online"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                            {symbiote.displayName}
                          </h3>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                          <span className="text-[10.5px] font-mono text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15 px-1.5 py-0.2 rounded">
                            {symbiote.experience}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">{symbiote.title}</p>
                        <p className="text-[11.5px] text-[var(--color-text-secondary)] line-clamp-1">
                          {symbiote.bio}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--color-text-secondary)] pt-1 flex-wrap">
                          {symbiote.reviewsCount > 0 ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {symbiote.rating.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-secondary)] flex items-center gap-1">
                              <Star className="w-3 h-3 opacity-40" />
                              <span>No ratings yet</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>{symbiote.location}</span>
                          <span>•</span>
                          <span className="text-[var(--color-success-green)]">{symbiote.availability}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                      <div className="text-left sm:text-right">
                        <span className="text-base font-mono font-bold text-[var(--color-text-primary)]">
                          ${symbiote.hourlyRate}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] font-mono block">/ hour</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/client/professionals/${symbiote.uid}`)}
                          className="text-xs"
                        >
                          Profile
                        </Button>
                        {isInvited ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            className="flex items-center gap-1 text-xs opacity-60 cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success-green)]" />
                            <span>Invited</span>
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenInvite(symbiote)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Invite</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* INVITE MODAL */}
      <InviteModal
        isOpen={isInviteModalOpen}
        candidate={selectedCandidate}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
};
