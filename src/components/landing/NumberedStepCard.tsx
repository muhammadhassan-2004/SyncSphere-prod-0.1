import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface NumberedStepCardProps {
  stepNumber: string; // e.g. "01", "02"
  title: string;
  description: string;
  className?: string;
  href?: string;
}

export const NumberedStepCard: React.FC<NumberedStepCardProps> = ({
  stepNumber,
  title,
  description,
  className,
  href = '/portal-select',
}) => {
  return (
    <Link to={href} className="block h-full focus:outline-none">
      <Card
        className={cn(
          'p-6 space-y-4 hover:border-[var(--color-accent-cyan)]/50 transition-all duration-200 text-left relative overflow-hidden group h-full flex flex-col justify-between cursor-pointer hover:shadow-lg',
          className
        )}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold font-mono text-accent-gradient tracking-tight">
              {stepNumber}
            </span>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
              Step {stepNumber}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent-cyan)] transition-colors">
              {title}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-cyan)] transition-colors">
          <span>Start Step</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
};
