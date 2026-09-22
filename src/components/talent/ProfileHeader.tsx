import React from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { SymbioteProfile } from '@/src/data/symbiotes';
import {
  MessageSquare,
  Send,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface ProfileHeaderProps {
  symbiote: SymbioteProfile;
  projectId?: string;
  onMessageClick: () => void;
  onInviteClick: () => void;
  isMessaging?: boolean;
  isInvited?: boolean;
  invitationStatus?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  symbiote,
  projectId,
  onMessageClick,
  onInviteClick,
  isMessaging,
  isInvited,
  invitationStatus,
}) => {
  return (
    <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] relative overflow-hidden">
      {/* BACKGROUND DECORATIVE ACCENT */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--color-accent-cyan)]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        {/* LEFT: AVATAR & INFO */}
        <div className="flex items-start gap-4 sm:gap-5 min-w-0">
          <Avatar
            name={symbiote.displayName}
            initials={symbiote.avatarInitials}
            src={symbiote.avatarUrl}
            size="lg"
            statusDot="online"
            className="w-16 h-16 sm:w-20 sm:h-20 text-lg border-2 border-[var(--color-accent-cyan)]/30 shrink-0"
          />

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {symbiote.displayName}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                {symbiote.experience}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium">
              {symbiote.title}
            </p>

            {/* META ROW */}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] flex-wrap pt-1 font-mono">
              {symbiote.reviewsCount > 0 ? (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {symbiote.rating.toFixed(2)}
                  <span className="text-[var(--color-text-secondary)] font-normal">
                    ({symbiote.reviewsCount} review{symbiote.reviewsCount === 1 ? '' : 's'})
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[var(--color-text-secondary)] font-medium">
                  <Star className="w-3.5 h-3.5 opacity-40" />
                  <span>No ratings yet</span>
                  <span className="text-[var(--color-text-secondary)]/70 font-normal">
                    (0 reviews)
                  </span>
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                {symbiote.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[var(--color-text-primary)]">
                <Briefcase className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                {symbiote.completedProjects} Projects Completed
              </span>
            </div>

            {/* AVAILABILITY LINE */}
            <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success-green)] animate-pulse" />
              <span className="text-[var(--color-success-green)] font-semibold">
                Available: {symbiote.availability || 'Inquire'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTION BUTTONS */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[var(--color-border)]">
          <Button
            variant="secondary"
            onClick={onMessageClick}
            disabled={isMessaging}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs"
          >
            <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <span>{isMessaging ? 'Opening Chat...' : 'Message'}</span>
          </Button>

          {isInvited ? (
            <Button
              variant="secondary"
              disabled
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs opacity-75 cursor-not-allowed bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
            >
              <UserCheck className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <span>{invitationStatus === 'accepted' ? 'Active Member' : 'Invited'}</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={onInviteClick}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs"
            >
              <Send className="w-4 h-4" />
              <span>Invite to Project</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
