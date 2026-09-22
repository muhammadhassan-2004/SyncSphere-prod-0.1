import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { ProfileHeader } from '@/src/components/talent/ProfileHeader';
import { ProfileStatsStrip } from '@/src/components/talent/ProfileStatsStrip';
import { AboutTab } from '@/src/components/talent/AboutTab';
import { SkillsTab } from '@/src/components/talent/SkillsTab';
import { PortfolioTab } from '@/src/components/talent/PortfolioTab';
import { ExperienceTab } from '@/src/components/talent/ExperienceTab';
import { CertificationsTab } from '@/src/components/talent/CertificationsTab';
import { ReviewsTab } from '@/src/components/talent/ReviewsTab';
import { ContactCard } from '@/src/components/talent/ContactCard';
import { AvailabilityCard } from '@/src/components/talent/AvailabilityCard';
import { InviteModal } from '@/src/components/talent/InviteModal';
import { subscribeToUserProfile, getAllSymbiotesFromFirestore } from '@/src/lib/firestore/users';
import { createConversation, getUserConversations } from '@/src/lib/firestore/conversations';
import { subscribeToClientInvitations } from '@/src/lib/firestore/invitations';
import { subscribeToUserReviews } from '@/src/lib/firestore/reviews';
import { Invitation, Review } from '@/src/types/firestore';
import {
  ArrowLeft,
  UserCheck,
  Code2,
  FolderKanban,
  Award,
  CheckCircle2,
  Star,
  Sparkles,
  AlertCircle,
  FileCheck2,
  MessageSquare,
} from 'lucide-react';

type ProfileTab = 'about' | 'skills' | 'portfolio' | 'experience' | 'certifications' | 'reviews';

export const ProfessionalProfilePage: React.FC = () => {
  const { symbioteId, tab: routeTab } = useParams<{ symbioteId: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { firebaseUser, authenticatedUser, userProfile } = useAuth();
  const currentUserId = firebaseUser?.uid || authenticatedUser?.uid || userProfile?.uid;

  // Originating route & return context (e.g. arriving from Chat Messages, AI matching, or Applications)
  const returnToParam = searchParams.get('returnTo') || (location.state as any)?.returnTo;
  const convIdParam = searchParams.get('convId') || (location.state as any)?.conversationId;
  const fromParam = searchParams.get('from') || (location.state as any)?.from;
  const projectIdParam = searchParams.get('projectId') || (location.state as any)?.projectId || undefined;

  const isFromChat =
    fromParam === 'messages' ||
    Boolean(convIdParam) ||
    Boolean(returnToParam && (returnToParam.includes('/messages') || returnToParam.includes('convId')));

  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    if (returnToParam) {
      navigate(returnToParam);
    } else if (convIdParam) {
      navigate(`/client/messages?convId=${convIdParam}`);
    } else if (isFromChat) {
      navigate('/client/messages');
    } else if (fromParam === 'applications' || (returnToParam && returnToParam.includes('/applications'))) {
      navigate('/client/applications');
    } else if (fromParam === 'ai-matching' || (returnToParam && returnToParam.includes('/ai-matching'))) {
      navigate('/client/ai-matching');
    } else {
      navigate('/client/find-talent');
    }
  };

  // Tab State
  const activeTab: ProfileTab =
    (routeTab as ProfileTab) || (searchParams.get('tab') as ProfileTab) || 'about';

  // Symbiote Profile State
  const [symbiote, setSymbiote] = useState<SymbioteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMessaging, setIsMessaging] = useState(false);
  const [userReviews, setUserReviews] = useState<Review[]>([]);

  // Subscribe to real-time reviews for this specialist to ensure verified counts and ratings
  useEffect(() => {
    if (!symbioteId) {
      setUserReviews([]);
      return;
    }
    const unsub = subscribeToUserReviews(symbioteId, (revs) => {
      setUserReviews(revs || []);
    });
    return () => unsub();
  }, [symbioteId]);

  // Derived real-time symbiote profile with verified review counts & true averages
  const activeSymbiote: SymbioteProfile | null = useMemo(() => {
    if (!symbiote) return null;
    const realReviewsCount = userReviews.length;
    let computedRating = 0;
    if (realReviewsCount > 0) {
      const sum = userReviews.reduce((acc, r) => acc + (r.ratings?.overall || (r as any).rating || 5), 0);
      computedRating = Number((sum / realReviewsCount).toFixed(2));
    }
    return {
      ...symbiote,
      reviewsCount: realReviewsCount,
      rating: computedRating,
    };
  }, [symbiote, userReviews]);

  // Client Invitations State for real-time invite tracking
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

  const existingInvitation = useMemo(() => {
    if (!activeSymbiote?.uid || !clientInvitations.length) return null;
    return (
      clientInvitations.find(
        (inv) =>
          inv.symbioteId === activeSymbiote.uid &&
          inv.status !== 'rejected' &&
          inv.status !== 'declined'
      ) || null
    );
  }, [clientInvitations, activeSymbiote?.uid]);

  const isInvited = Boolean(existingInvitation);
  const invitationStatus = existingInvitation?.status || 'pending';

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Symbiote Profile
  useEffect(() => {
    if (!symbioteId) return;

    setLoading(true);

    // Subscribe to real Firestore profile
    const unsubscribe = subscribeToUserProfile(symbioteId, async (userProf) => {
      if (userProf) {
        setSymbiote({
          uid: userProf.uid || symbioteId,
          displayName: userProf.displayName || `${userProf.firstName || ''} ${userProf.lastName || ''}`.trim() || 'Symbiote Specialist',
          title: userProf.title || userProf.jobTitle || 'AI Engineering Specialist',
          avatarInitials:
            userProf.avatarInitials ||
            userProf.displayName?.slice(0, 2).toUpperCase() ||
            'SP',
          avatarUrl: userProf.avatarUrl || (userProf as any).photoURL || '',
          rating: userProf.rating ?? 0,
          reviewsCount: userProf.reviewsCount ?? 0,
          hourlyRate: userProf.hourlyRate ?? 0,
          skills: userProf.skills || [],
          experience: (userProf.experience as any) || 'Senior',
          availability: userProf.availability || '',
          location: userProf.location || '',
          timeZone: userProf.timeZone || '',
          bio: userProf.bio || '',
          email: userProf.email || '',
          completedProjects: userProf.completedProjects || 0,
          topAchievements: userProf.topAchievements,
          experiences: userProf.experiences || [],
          portfolio: userProf.portfolio || [],
          certifications: userProf.certifications || [],
        });
        setLoading(false);
      } else {
        // Fallback: check all symbiotes for matching uid, email, or name
        const symbiotes = await getAllSymbiotesFromFirestore();
        const matched = symbiotes.find(
          (s) =>
            s.uid === symbioteId ||
            s.email?.toLowerCase() === symbioteId.toLowerCase() ||
            s.displayName?.toLowerCase().replace(/\s+/g, '-') === symbioteId.toLowerCase()
        );

        if (matched) {
          setSymbiote({
            uid: matched.uid || symbioteId,
            displayName: matched.displayName || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || 'Symbiote Specialist',
            title: matched.title || matched.jobTitle || 'AI Engineering Specialist',
            avatarInitials:
              matched.avatarInitials ||
              matched.displayName?.slice(0, 2).toUpperCase() ||
              'SP',
            avatarUrl: matched.avatarUrl || (matched as any).photoURL || '',
            rating: matched.rating ?? 0,
            reviewsCount: matched.reviewsCount ?? 0,
            hourlyRate: matched.hourlyRate ?? 0,
            skills: matched.skills || [],
            experience: (matched.experience as any) || 'Senior',
            availability: matched.availability || '',
            location: matched.location || '',
            timeZone: matched.timeZone || '',
            bio: matched.bio || '',
            email: matched.email || '',
            completedProjects: matched.completedProjects || 0,
            topAchievements: matched.topAchievements,
            experiences: matched.experiences || [],
            portfolio: matched.portfolio || [],
            certifications: matched.certifications || [],
          });
        } else {
          setSymbiote(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [symbioteId]);

  // Tab change handler preserving context
  const handleTabChange = (newTab: ProfileTab) => {
    const params = new URLSearchParams(searchParams);
    const searchString = params.toString() ? `?${params.toString()}` : '';
    if (newTab === 'about') {
      navigate(`/client/professionals/${symbioteId}${searchString}`, { state: location.state });
    } else {
      navigate(`/client/professionals/${symbioteId}/${newTab}${searchString}`, { state: location.state });
    }
  };

  // Direct Message action
  const handleMessageClick = async () => {
    if (!firebaseUser?.uid || !symbiote) return;

    setIsMessaging(true);
    try {
      // Check existing conversations
      const existingConvs = await getUserConversations(firebaseUser.uid);
      const match = existingConvs.find((c) => c.participantIds.includes(symbiote.uid));

      if (match && match.id) {
        navigate(`/client/messages?convId=${match.id}`);
      } else {
        const newConvId = await createConversation(
          [firebaseUser.uid, symbiote.uid],
          projectIdParam
        );
        if (newConvId) {
          navigate(`/client/messages?convId=${newConvId}`);
        } else {
          navigate(`/client/messages`);
        }
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
      navigate(`/client/messages`);
    } finally {
      setIsMessaging(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-pulse">
        <div className="h-6 w-32 bg-[var(--color-surface)] rounded" />
        <div className="h-44 bg-[var(--color-surface)] rounded-[12px]" />
        <div className="h-20 bg-[var(--color-surface)] rounded-[12px]" />
        <div className="h-64 bg-[var(--color-surface)] rounded-[12px]" />
      </div>
    );
  }

  if (!activeSymbiote) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-16 text-center py-16">
        <AlertCircle className="w-12 h-12 text-[var(--color-danger-red)] mx-auto opacity-70" />
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Profile Not Found</h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          The requested specialist profile could not be located.
        </p>
        <Button variant="secondary" onClick={handleBackNavigation} className="inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* BACK NAVIGATION BAR */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors cursor-pointer font-mono group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-semibold">Back</span>
        </button>

        <div className="flex items-center gap-2">
          {isFromChat && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-[6px] border border-emerald-500/30 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              <span>Active Chat Session</span>
            </span>
          )}
          {projectIdParam && (
            <span className="text-[11px] font-mono text-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15 px-2.5 py-1 rounded-[6px] border border-[var(--color-accent-cyan)]/30">
              Project Context Active
            </span>
          )}
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
            ×
          </button>
        </div>
      )}

      {/* 1. PROFILE HEADER */}
      <ProfileHeader
        symbiote={activeSymbiote}
        projectId={projectIdParam}
        onMessageClick={handleMessageClick}
        onInviteClick={() => setIsInviteModalOpen(true)}
        isMessaging={isMessaging}
        isInvited={isInvited}
        invitationStatus={invitationStatus}
      />

      {/* 2. STATS STRIP */}
      <ProfileStatsStrip
        symbiote={activeSymbiote}
        projectId={projectIdParam}
        matchScore={96}
      />

      {/* 3. TAB NAVIGATION ROW */}
      <div className="border-b border-[var(--color-border)] flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'about', label: 'About', icon: <UserCheck className="w-3.5 h-3.5" /> },
          { id: 'skills', label: 'Skills & Tech', icon: <Code2 className="w-3.5 h-3.5" /> },
          { id: 'portfolio', label: 'Portfolio', icon: <FolderKanban className="w-3.5 h-3.5" /> },
          { id: 'experience', label: 'Experience', icon: <Award className="w-3.5 h-3.5" /> },
          { id: 'certifications', label: 'Certifications', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
          { id: 'reviews', label: `Reviews (${activeSymbiote.reviewsCount})`, icon: <Star className="w-3.5 h-3.5" /> },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id as ProfileTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-bold bg-[var(--color-accent-cyan)]/5'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TWO-COLUMN LAYOUT: [TAB-SPECIFIC CONTENT] | [CONTACT CARD + AVAILABILITY CARD] */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: TAB CONTENT (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'about' && <AboutTab symbiote={activeSymbiote} />}
          {activeTab === 'skills' && <SkillsTab symbiote={activeSymbiote} />}
          {activeTab === 'portfolio' && <PortfolioTab symbiote={activeSymbiote} />}
          {activeTab === 'experience' && <ExperienceTab symbiote={activeSymbiote} />}
          {activeTab === 'certifications' && <CertificationsTab symbiote={activeSymbiote} />}
          {activeTab === 'reviews' && <ReviewsTab symbiote={activeSymbiote} />}
        </div>

        {/* RIGHT COLUMN: [CONTACT CARD + AVAILABILITY CARD] (1 COL) */}
        <div className="space-y-6">
          <ContactCard
            symbiote={activeSymbiote}
            onMessageClick={handleMessageClick}
            isMessaging={isMessaging}
          />

          <AvailabilityCard symbiote={activeSymbiote} />
        </div>
      </div>

      {/* INVITE MODAL */}
      <InviteModal
        isOpen={isInviteModalOpen}
        candidate={activeSymbiote}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={(projectName) =>
          setToastMessage(
            `Invitation sent successfully to ${activeSymbiote.displayName} for "${projectName}"!`
          )
        }
      />
    </div>
  );
};
