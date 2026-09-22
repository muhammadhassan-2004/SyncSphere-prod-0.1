import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { Sparkles, DollarSign, Award, Star, Clock, Briefcase } from 'lucide-react';

interface ProfileStatsStripProps {
  symbiote: SymbioteProfile;
  projectId?: string;
  matchScore?: number;
}

export const ProfileStatsStrip: React.FC<ProfileStatsStripProps> = ({
  symbiote,
  projectId,
  matchScore = 96,
}) => {
  const hasProjectContext = Boolean(projectId);

  return (
    <div
      className={`grid gap-3 ${
        hasProjectContext
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {/* AI MATCH SCORE HIGHLIGHT CARD (ONLY PRESENT IF PROJECT ID IS PASSED) */}
      {hasProjectContext && (
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-accent-cyan)]/50 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-accent-cyan)]/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono text-[var(--color-accent-cyan)] uppercase font-bold tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Match Score
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]">
              HIGH
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--color-accent-cyan)]">
              {matchScore}%
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-1 font-sans mt-0.5">
              Matched for Project Requirements
            </p>
          </div>
        </Card>
      )}

      {/* STAT 1: HOURLY RATE */}
      <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold">
            Hourly Rate
          </span>
          <DollarSign className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            ${symbiote.hourlyRate}
            <span className="text-xs font-normal text-[var(--color-text-secondary)]">/hr</span>
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)] font-mono mt-0.5">
            Transparent Pricing
          </p>
        </div>
      </Card>

      {/* STAT 2: COMPLETED PROJECTS */}
      <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold">
            Completed
          </span>
          <Briefcase className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {symbiote.completedProjects}
          </div>
          <p className={`text-[10px] font-mono mt-0.5 font-semibold ${
            symbiote.completedProjects > 0
              ? 'text-[var(--color-success-green)]'
              : 'text-[var(--color-text-secondary)]'
          }`}>
            {symbiote.completedProjects > 0 ? '100% Delivery Rate' : 'No projects yet'}
          </p>
        </div>
      </Card>

      {/* STAT 3: RATING */}
      <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold">
            Client Rating
          </span>
          <Star
            className={`w-3.5 h-3.5 ${
              symbiote.reviewsCount > 0
                ? 'text-amber-400 fill-amber-400'
                : 'text-[var(--color-text-secondary)] opacity-40'
            }`}
          />
        </div>
        <div className="mt-2">
          {symbiote.reviewsCount > 0 ? (
            <div className="text-xl font-mono font-bold text-[var(--color-text-primary)] flex items-baseline gap-1">
              {symbiote.rating.toFixed(2)}
              <span className="text-xs font-normal text-[var(--color-text-secondary)]">/5.0</span>
            </div>
          ) : (
            <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-text-secondary)]">
              No ratings yet
            </div>
          )}
          <p className="text-[10px] text-[var(--color-text-secondary)] font-mono mt-0.5">
            {symbiote.reviewsCount > 0
              ? `${symbiote.reviewsCount} verified review${symbiote.reviewsCount === 1 ? '' : 's'}`
              : '0 verified reviews'}
          </p>
        </div>
      </Card>

      {/* STAT 4: EXPERIENCE LEVEL */}
      <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold">
            Experience Level
          </span>
          <Award className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {symbiote.experience}
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)] font-mono mt-0.5">
            {symbiote.experience === 'Expert'
              ? '8+ yrs industry exp'
              : symbiote.experience === 'Senior'
              ? '5-8 yrs industry exp'
              : 'Verified competency'}
          </p>
        </div>
      </Card>
    </div>
  );
};
