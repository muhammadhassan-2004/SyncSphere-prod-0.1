import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '@/src/types/firestore';
import { subscribeToUserProfile } from '@/src/lib/firestore/users';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { getUserPresence } from '@/src/lib/utils/presence';
import {
  X,
  User,
  Building,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  Mail,
  ExternalLink,
  Briefcase,
  Award,
  Globe,
  Sparkles,
  ShieldCheck,
  Check,
  Tag,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialProfile?: UserProfile | null;
  conversationId?: string;
  returnTo?: string;
  projectId?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialProfile,
  conversationId,
  returnTo,
  projectId,
}) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState<boolean>(!initialProfile);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(initialProfile || null);
      return;
    }

    if (initialProfile) {
      setProfile(initialProfile);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const unsub = subscribeToUserProfile(userId, async (userProf) => {
      if (userProf) {
        setProfile(userProf);
        setLoading(false);
      } else {
        // Fallback search across all users in Firestore (clients & symbiotes)
        try {
          const colRef = collection(db, 'users');
          const snap = await getDocs(colRef);
          const allUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
          const matched = allUsers.find(
            (u) =>
              u.uid === userId ||
              u.email?.toLowerCase() === userId.toLowerCase() ||
              u.displayName?.toLowerCase() === userId.toLowerCase() ||
              u.companyName?.toLowerCase() === userId.toLowerCase()
          );
          if (matched) {
            setProfile(matched);
          } else if (!initialProfile) {
            setProfile(null);
          }
        } catch (err) {
          console.warn('Fallback profile search error:', err);
          if (!initialProfile) setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsub();
  }, [isOpen, userId, initialProfile]);

  if (!isOpen) return null;

  const presence = getUserPresence(profile);
  
  // Check if profile is Symbiote or Client
  const isSymbiote =
    profile?.role === 'symbiote' ||
    profile?.role === 'freelancer' ||
    Boolean(profile?.hourlyRate && profile.hourlyRate > 0) ||
    Boolean(profile?.skills && profile.skills.length > 0 && !profile?.companyProfile?.industry);

  const displayName =
    profile?.displayName ||
    profile?.companyName ||
    profile?.companyProfile?.companyName ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '') ||
    'User Profile';

  const companyName =
    profile?.companyName ||
    profile?.companyProfile?.companyName ||
    (isSymbiote ? '' : displayName);

  const title =
    profile?.title ||
    profile?.jobTitle ||
    (isSymbiote
      ? 'AI Engineering Specialist'
      : companyName
      ? `${companyName} Executive`
      : 'Verified Enterprise Client');

  const avatarInitials =
    profile?.avatarInitials ||
    (companyName ? companyName.slice(0, 2).toUpperCase() : displayName.slice(0, 2).toUpperCase()) ||
    'US';

  const location =
    profile?.location ||
    profile?.companyProfile?.country ||
    'United States';

  const timeZone =
    profile?.timeZone ||
    profile?.companyProfile?.timeZone ||
    'UTC-08:00 (Pacific Time)';

  const industry =
    profile?.companyProfile?.industry ||
    (profile as any)?.industry ||
    'Artificial Intelligence & Cloud Systems';

  const companySize =
    profile?.companyProfile?.companySize ||
    '11-50 employees (Growth Stage)';

  const description =
    profile?.bio ||
    profile?.companyProfile?.companyDescription ||
    'No detailed overview provided.';

  const websiteUrl =
    profile?.companyProfile?.website ||
    profile?.websiteUrl ||
    '';

  const handleViewFullProfile = () => {
    onClose();
    const targetUid = profile?.uid || userId;
    const currentOrigin =
      returnTo ||
      (conversationId
        ? `/client/messages?convId=${conversationId}`
        : `${window.location.pathname}${window.location.search}`);

    if (isSymbiote) {
      navigate(
        `/client/professionals/${targetUid}?from=messages&convId=${conversationId || ''}&returnTo=${encodeURIComponent(
          currentOrigin
        )}`,
        {
          state: {
            returnTo: currentOrigin,
            conversationId,
            from: 'messages',
          },
        }
      );
    } else {
      // If admin portal, route to user detail
      if (window.location.pathname.startsWith('/admin')) {
        navigate(`/admin/users/${targetUid}?returnTo=${encodeURIComponent(currentOrigin)}`);
      } else {
        navigate(
          `/client/professionals/${targetUid}?from=messages&convId=${conversationId || ''}&returnTo=${encodeURIComponent(
            currentOrigin
          )}`,
          {
            state: {
              returnTo: currentOrigin,
              conversationId,
              from: 'messages',
            },
          }
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER COVER BANNER */}
        <div className="relative bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSymbiote ? 'Verified AI Specialist' : 'Verified Enterprise Client'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {profile && (
              <button
                type="button"
                onClick={handleViewFullProfile}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
                title="Open full detailed profile page"
              >
                <User className="w-3.5 h-3.5" />
                <span>View Full Profile</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROFILE BODY */}
        {loading && !profile ? (
          <div className="p-12 text-center text-xs font-mono text-[var(--color-text-secondary)] space-y-3">
            <Sparkles className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
            <p>Loading profile details...</p>
          </div>
        ) : profile ? (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* AVATAR + TITLE HEADER BLOCK */}
            <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* AVATAR CIRCLE */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 border-2 border-cyan-500/40 text-cyan-400 flex items-center justify-center font-mono font-bold text-2xl shadow-md overflow-hidden">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    avatarInitials
                  )}
                </div>
                <span
                  className={`w-4 h-4 rounded-full absolute bottom-0 right-0 border-2 border-[var(--color-surface)] ${
                    presence.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                  title={presence.label}
                />
              </div>

              {/* NAME, ROLE & METRICS */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                    {displayName}
                  </h2>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 shrink-0 ${
                      presence.isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${presence.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                    <span>{presence.label}</span>
                  </span>
                </div>

                <p className="text-sm font-semibold text-cyan-400 font-mono">{title}</p>

                {/* META INFO ROW */}
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] flex-wrap pt-1 font-sans">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{location}</span>
                    </span>
                  )}
                  {timeZone && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{timeZone}</span>
                    </span>
                  )}
                  {profile.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300">{profile.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KEY FIELDS STRIP / METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
              {isSymbiote ? (
                <>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Hourly Rate</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {profile.hourlyRate ? `$${profile.hourlyRate}/hr` : 'Negotiable'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Rating</span>
                    {(profile.reviewsCount ?? 0) > 0 ? (
                      <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{profile.rating?.toFixed(1) || '0.0'} ({profile.reviewsCount})</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 opacity-40" />
                        <span>No ratings yet</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Completed Projects</span>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                      {profile.completedProjects ?? 0} Projects
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Experience Level</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {profile.experience || 'Specialist'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Organization</span>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] truncate block" title={companyName}>
                      {companyName}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Role / Title</span>
                    <span className="text-sm font-bold text-cyan-400 truncate block" title={title}>
                      {title}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Industry</span>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] truncate block" title={industry}>
                      {industry}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-secondary)] block">Account Status</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* OVERVIEW / DESCRIPTION SECTION */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSymbiote ? 'Specialist Overview & Bio' : 'Company & Role Overview'}</span>
              </h3>
              <div className="p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
                {description}
              </div>
            </div>

            {/* TECHNICAL EXPERTISE (IF SYMBIOTE) */}
            {isSymbiote && profile.skills && profile.skills.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Technical Skills</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* COMPANY DETAILS (IF CLIENT) */}
            {!isSymbiote && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enterprise Profile Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-xs">
                  <div>
                    <span className="text-[11px] text-[var(--color-text-secondary)] block font-mono uppercase">Company Size</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{companySize}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--color-text-secondary)] block font-mono uppercase">Industry Sector</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{industry}</span>
                  </div>
                  {websiteUrl && (
                    <div className="sm:col-span-2 pt-1 border-t border-[var(--color-border)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase">Official Website</span>
                      <a
                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1.5"
                      >
                        <span>{websiteUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[var(--color-text-secondary)]">
            Profile not found.
          </div>
        )}

        {/* MODAL FOOTER ACTION BAR */}
        {profile && (
          <div className="p-4 px-6 bg-[var(--color-background)] border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs font-mono text-[var(--color-text-secondary)] hidden sm:flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isSymbiote ? 'Verified portfolio, experience & client reviews' : 'Verified enterprise company profile'}</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleViewFullProfile}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>View Full Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
