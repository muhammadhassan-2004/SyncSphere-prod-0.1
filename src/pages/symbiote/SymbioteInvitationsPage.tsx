import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import {
  subscribeToSymbioteInvitations,
  updateInvitationStatus,
  createInvitation,
} from '@/src/lib/firestore';
import { Invitation } from '@/src/types/firestore';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Building,
  Clock,
  DollarSign,
  Sparkles,
  ArrowRight,
  MessageSquareQuote,
  Briefcase,
  AlertCircle,
  Filter,
} from 'lucide-react';

// Single InvitationCard component accepting status prop
interface InvitationCardProps {
  invitation: Invitation;
  status: 'pending' | 'accepted' | 'declined';
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  onViewDetails: (projectId: string) => void;
  isProcessing: boolean;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  status,
  onAccept,
  onDecline,
  onViewDetails,
  isProcessing,
}) => {
  const matchScore = invitation.aiMatchScore || invitation.matchScore || 90;
  const projectTitle = (invitation.projectTitle && invitation.projectTitle !== 'Project Invitation' && invitation.projectTitle !== 'Untitled Project')
    ? invitation.projectTitle
    : 'Privacy app';
  const clientName = invitation.clientName || 'Client';
  const clientQuote =
    invitation.clientNote ||
    invitation.message ||
    'Invitation received from client.';
  const budget = invitation.budgetRange || (invitation as any).budget || 'Negotiable';
  const timeline = invitation.timeline || 'Flexible';
  const tags = invitation.techTags || [];

  const isDeclined = status === 'declined';
  const isAccepted = status === 'accepted';

  return (
    <Card
      className={`p-6 border transition-all duration-200 rounded-[12px] space-y-4 flex flex-col justify-between ${
        isDeclined
          ? 'border-[var(--color-border)] bg-[var(--color-surface)]/60 opacity-65 hover:opacity-90'
          : isAccepted
          ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/10 via-[var(--color-surface)] to-[var(--color-surface)] shadow-sm'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-cyan-500/30 shadow-sm'
      }`}
    >
      <div className="space-y-3.5">
        {/* CARD TOP ROW: TITLE & MATCH BADGE */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-body font-bold text-[var(--color-text-primary)] leading-tight">
              {projectTitle}
            </h3>
            <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-cyan-400" /> {clientName}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatusPill
              variant={isAccepted ? 'green' : isDeclined ? 'red' : 'cyan'}
              label={`${matchScore}% Match`}
            />
            {isAccepted && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Accepted
              </span>
            )}
          </div>
        </div>

        {/* CLIENT QUOTE */}
        <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-caption text-[var(--color-text-secondary)] italic flex items-start gap-2">
          <MessageSquareQuote className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="line-clamp-2">"{clientQuote}"</p>
        </div>

        {/* BUDGET & TIMELINE STAT BOXES */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-center">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
              Budget Range
            </span>
            <span className="text-body font-bold text-cyan-400">{budget}</span>
          </div>
          <div className="border-l border-[var(--color-border)] pl-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold block">
              Timeline
            </span>
            <span className="text-body font-bold text-[var(--color-text-primary)]">{timeline}</span>
          </div>
        </div>

        {/* TECH TAG CHIPS */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 text-[11px] font-mono rounded bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* CARD ACTION / STATUS BAR ROW */}
      <div className="pt-3 border-t border-[var(--color-border)]">
        {status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={isProcessing}
              onClick={() => onAccept(invitation.id!)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-medium text-caption py-2 border-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Accept
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isProcessing}
              onClick={() => onViewDetails(invitation.projectId)}
              className="flex-1 border-[var(--color-border)] text-[var(--color-text-primary)] text-caption py-2"
            >
              Details
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isProcessing}
              onClick={() => onDecline(invitation.id!)}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-caption py-2 px-3"
            >
              Decline
            </Button>
          </div>
        )}

        {status === 'accepted' && (
          <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold text-caption text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Accepted — Contract Active</span>
          </div>
        )}

        {status === 'declined' && (
          <div className="w-full py-2.5 px-4 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 font-semibold text-caption text-center flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Invitation declined</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export const SymbioteInvitationsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time listener for Symbiote Invitations
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToSymbioteInvitations(uid, (invs) => {
      setInvitations(invs || []);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Handle Accept
  const handleAccept = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      await updateInvitationStatus(invitationId, 'accepted');
      setToastMessage('Invitation accepted! Contract has been auto-initiated and project is now In Progress.');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Decline
  const handleDecline = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      await updateInvitationStatus(invitationId, 'declined');
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Live Computed Counts from Firestore Array
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const acceptedCount = invitations.filter((i) => i.status === 'accepted').length;
  const declinedCount = invitations.filter((i) => i.status === 'declined').length;

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3 max-w-5xl mx-auto">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body font-medium">Loading invitations from Firestore...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HEADER SECTION WITH LIVE COUNTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-h1 font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-emerald-500" /> Invitations
          </h1>
          <p className="text-body text-[var(--color-text-secondary)] mt-1 font-medium">
            <span className="text-emerald-400 font-bold">{pendingCount}</span> pending invitation
            {pendingCount === 1 ? '' : 's'} awaiting your response
          </p>
        </div>

        {/* PILL COUNTERS (COMPUTED IN REAL-TIME FROM FIRESTORE) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-caption font-semibold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {acceptedCount} Accepted
          </span>

          <span className="px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-caption font-semibold flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-4 h-4 text-red-400" />
            {declinedCount} Declined
          </span>
        </div>
      </div>

      {/* SUCCESS TOAST BANNER */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs hover:text-emerald-300 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 text-caption font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          All ({invitations.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3.5 py-1.5 text-caption font-medium rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('accepted')}
          className={`px-3.5 py-1.5 text-caption font-medium rounded-lg transition-colors ${
            filter === 'accepted'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Accepted ({acceptedCount})
        </button>
        <button
          onClick={() => setFilter('declined')}
          className={`px-3.5 py-1.5 text-caption font-medium rounded-lg transition-colors ${
            filter === 'declined'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Declined ({declinedCount})
        </button>
      </div>

      {/* 2-COLUMN GRID OF INVITATION CARDS */}
      {filteredInvitations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInvitations.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              status={inv.status}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onViewDetails={(pId) => navigate(`/symbiote/browse/${pId}`)}
              isProcessing={processingId === inv.id}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px]">
          <Mail className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto opacity-50" />
          <h3 className="text-h3 font-bold text-[var(--color-text-primary)]">No Invitations Found</h3>
          <p className="text-caption text-[var(--color-text-secondary)] max-w-md mx-auto">
            {filter === 'all'
              ? 'When enterprise clients invite you to submit a proposal for their projects, invitations will appear here.'
              : `No invitations currently match the "${filter}" filter.`}
          </p>
          {filter !== 'all' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilter('all')}
              className="border-[var(--color-border)] text-[var(--color-text-primary)] mt-2"
            >
              Clear Filter
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};
