import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import {
  UserCheck,
  CheckCircle2,
  Award,
  Terminal,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AboutTabProps {
  symbiote: SymbioteProfile;
}

export const AboutTab: React.FC<AboutTabProps> = ({ symbiote }) => {
  return (
    <div className="space-y-6">
      {/* BIO & SUMMARY CARD */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <UserCheck className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
            Professional Overview & Bio
          </h3>
        </div>

        {symbiote.bio ? (
          <p className="text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed font-sans whitespace-pre-wrap">
            {symbiote.bio}
          </p>
        ) : (
          <p className="text-xs text-[var(--color-text-secondary)] italic">
            No bio provided yet.
          </p>
        )}
      </Card>

      {/* TOP ACHIEVEMENTS & HIGHLIGHTS (ONLY RENDER IF SPECIFIED BY USER) */}
      {symbiote.topAchievements && symbiote.topAchievements.length > 0 && (
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Award className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Key Achievements & Milestones
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {symbiote.topAchievements.map((achievement, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-start gap-3"
              >
                <div className="p-1 rounded bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-[var(--color-text-primary)] font-medium leading-normal">
                  {achievement}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TECHNICAL DOMAIN COMPETENCIES */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Terminal className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
            Core Technical Capabilities
          </h3>
        </div>

        {symbiote.skills && symbiote.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {symbiote.skills.map((skill) => (
              <div
                key={skill}
                className="px-3 py-1.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono font-medium text-[var(--color-text-primary)] flex items-center gap-2"
              >
                <Zap className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-secondary)] italic">
            No technical skills listed yet.
          </p>
        )}
      </Card>
    </div>
  );
};
