import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeStyle?: string;
  className?: string;
  href?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  badgeStyle = 'bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/30',
  className,
  href = '/portal-select',
}) => {
  return (
    <Link to={href} className="block h-full focus:outline-none">
      <Card
        className={cn(
          'p-6 space-y-4 hover:border-[var(--color-accent-cyan)]/50 transition-all duration-200 text-left group h-full flex flex-col justify-between cursor-pointer hover:shadow-lg',
          className
        )}
      >
        <div className="space-y-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-200 group-hover:scale-105',
              badgeStyle
            )}
          >
            {icon}
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
          <span>Explore Feature</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
};
