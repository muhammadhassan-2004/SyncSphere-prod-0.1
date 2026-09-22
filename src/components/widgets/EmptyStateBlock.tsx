import React from 'react';
import { Card } from '@/src/components/ui/card';
import { cn } from '@/src/lib/utils';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyStateBlock = React.forwardRef<HTMLDivElement, EmptyStateBlockProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center p-8 md:p-12 space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[10px]',
          className
        )}
        {...props}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-accent-cyan)] flex items-center justify-center shrink-0">
          {icon || <FolderOpen className="w-6 h-6" />}
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-h2 text-[var(--color-text-primary)] font-semibold">{title}</h3>
          {description && (
            <p className="text-caption text-[var(--color-text-secondary)]">{description}</p>
          )}
        </div>

        {action && <div className="pt-2">{action}</div>}
      </Card>
    );
  }
);

EmptyStateBlock.displayName = 'EmptyStateBlock';
