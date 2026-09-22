import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { Calendar, Clock, Briefcase, Zap, CheckCircle2 } from 'lucide-react';

interface AvailabilityCardProps {
  symbiote: SymbioteProfile;
}

function deriveWorkingTimezone(location?: string, timeZone?: string): string {
  if (timeZone) return timeZone;
  if (!location) return 'Flexible / Global';
  const loc = location.toLowerCase();
  if (
    loc.includes('california') ||
    loc.includes('ca') ||
    loc.includes('san francisco') ||
    loc.includes('los angeles') ||
    loc.includes('sf') ||
    loc.includes('la') ||
    loc.includes('seattle') ||
    loc.includes('wa') ||
    loc.includes('pacific')
  ) {
    return 'PST / UTC-8';
  }
  if (
    loc.includes('new york') ||
    loc.includes('ny') ||
    loc.includes('boston') ||
    loc.includes('miami') ||
    loc.includes('est') ||
    loc.includes('florida')
  ) {
    return 'EST / UTC-5';
  }
  if (
    loc.includes('austin') ||
    loc.includes('texas') ||
    loc.includes('tx') ||
    loc.includes('chicago') ||
    loc.includes('cst')
  ) {
    return 'CST / UTC-6';
  }
  if (loc.includes('london') || loc.includes('uk') || loc.includes('gmt')) {
    return 'GMT / UTC+0';
  }
  return location;
}

function formatAvailabilityText(avail?: string): { text: string; isImmediate: boolean } {
  if (!avail) return { text: 'Contact for Availability', isImmediate: false };
  const lower = avail.toLowerCase().trim();
  if (lower === 'immediate' || lower === 'available now') {
    return { text: 'Available Now', isImmediate: true };
  }
  if (/^\d+$/.test(lower)) {
    return { text: `Available (~${avail} hrs/wk)`, isImmediate: true };
  }
  return { text: `Available: ${avail}`, isImmediate: true };
}

export const AvailabilityCard: React.FC<AvailabilityCardProps> = ({ symbiote }) => {
  const { text: availText, isImmediate } = formatAvailabilityText(symbiote.availability);
  const workingTz = deriveWorkingTimezone(symbiote.location, symbiote.timeZone);

  // Capacity formatting
  let capacityText = 'Flexible / Project-based';
  if (symbiote.availability) {
    if (/^\d+$/.test(symbiote.availability.trim())) {
      capacityText = `${symbiote.availability} hrs / week`;
    } else if (symbiote.availability.toLowerCase().includes('hrs') || symbiote.availability.toLowerCase().includes('hr')) {
      capacityText = symbiote.availability;
    } else if (symbiote.availability.toLowerCase() === 'immediate') {
      capacityText = 'Up to 40 hrs / week';
    }
  }

  return (
    <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <Calendar className="w-4 h-4 text-[var(--color-accent-cyan)]" />
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
          Availability & Capacity
        </h3>
      </div>

      <div className="space-y-3 text-xs">
        {/* AVAILABILITY BADGE BANNER */}
        <div
          className={`p-3 rounded-[8px] border flex items-center justify-between ${
            isImmediate
              ? 'bg-[var(--color-success-green)]/10 border-[var(--color-success-green)]/30 text-[var(--color-success-green)]'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          <div className="flex items-center gap-2 font-mono font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-current animate-ping shrink-0" />
            <span>{availText}</span>
          </div>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>

        {/* DETAILS */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Weekly Capacity:
            </span>
            <span className="font-mono font-bold text-[var(--color-text-primary)]">
              {capacityText}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Zap className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Working Timezone:
            </span>
            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
              {workingTz}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Briefcase className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Contract Terms:
            </span>
            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
              Fixed Milestone & Hourly
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
