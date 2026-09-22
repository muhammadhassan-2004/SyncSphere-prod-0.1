import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { Briefcase, Calendar, MapPin } from 'lucide-react';

interface ExperienceTabProps {
  symbiote: SymbioteProfile;
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({ symbiote }) => {
  const experiences = symbiote.experiences || [];

  if (experiences.length === 0) {
    return (
      <EmptyStateBlock
        icon={<Briefcase className="w-6 h-6 text-[var(--color-accent-cyan)]" />}
        title="No Work History Listed"
        description="This specialist has not added any work experience to their profile yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Work History & Experience Timeline
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            Total Entries: {experiences.length}
          </span>
        </div>

        {/* VERTICAL TIMELINE PATTERN */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-accent-cyan)]/30">
          {experiences.map((exp) => {
            const dateStr = exp.currentlyWorking
              ? `${exp.startDate || 'Started'} – Present`
              : exp.startDate && exp.endDate
              ? `${exp.startDate} – ${exp.endDate}`
              : exp.startDate || exp.endDate || 'Dates not specified';

            return (
              <div key={exp.id} className="relative group">
                {/* TEAL DOT MARKER */}
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[var(--color-accent-cyan)] border-2 border-[var(--color-surface)] shadow-[0_0_8px_rgba(6,182,212,0.6)]" />

                <div className="p-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] group-hover:border-[var(--color-accent-cyan)]/40 transition-colors space-y-3">
                  {/* ROLE & COMPANY HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--color-border)] pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                        {exp.role}
                      </h4>
                      <p className="text-xs font-mono text-[var(--color-accent-cyan)] font-semibold">
                        {exp.company}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--color-text-secondary)] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                        {dateStr}
                      </span>
                      {exp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--color-text-secondary)]" />
                          {exp.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  {exp.description && (
                    <p className="text-xs text-[var(--color-text-primary)] leading-relaxed font-sans whitespace-pre-wrap">
                      {exp.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
