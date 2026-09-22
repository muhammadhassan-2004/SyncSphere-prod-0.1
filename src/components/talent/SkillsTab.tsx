import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { Code2, CheckCircle2, Zap } from 'lucide-react';

interface SkillsTabProps {
  symbiote: SymbioteProfile;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({ symbiote }) => {
  const realSkills = symbiote.skills || [];

  if (realSkills.length === 0) {
    return (
      <EmptyStateBlock
        icon={<Code2 className="w-6 h-6 text-[var(--color-accent-cyan)]" />}
        title="No Skills Listed"
        description="This specialist has not added any verified skills to their profile yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Self-Reported & Listed Skills
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            Total Skills: {realSkills.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {realSkills.map((skill) => (
            <div
              key={skill}
              className="p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Zap className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                <span className="text-xs font-medium text-[var(--color-text-primary)] font-mono truncate">
                  {skill}
                </span>
              </div>
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
