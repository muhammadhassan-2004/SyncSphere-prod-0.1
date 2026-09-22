import React from 'react';
import { cn } from '@/src/lib/utils';
import { StatusPill } from '@/src/components/ui/badge';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  disabled?: boolean;
}

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  size = 'md',
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-6 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative inline-flex items-center gap-2 pb-3 pt-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none whitespace-nowrap select-none',
              size === 'sm' && 'text-xs pb-2',
              isActive
                ? 'text-transparent bg-clip-text bg-[var(--accent-gradient)] font-bold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              tab.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
            )}
          >
            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <StatusPill
                variant={isActive ? 'blue' : 'gray'}
                className={cn('text-[10px] px-1.5 py-0.2', size === 'sm' && 'text-[9px] px-1')}
              >
                {tab.count}
              </StatusPill>
            )}

            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-gradient)] rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
