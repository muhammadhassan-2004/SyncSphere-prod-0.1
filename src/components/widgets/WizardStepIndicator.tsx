import React from 'react';
import { cn } from '@/src/lib/utils';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface WizardStepIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number; // 0-indexed
  className?: string;
  onStepClick?: (index: number) => void;
  allowStepNavigation?: boolean;
}

export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  steps,
  currentStepIndex,
  className,
  onStepClick,
  allowStepNavigation = false,
}) => {
  return (
    <div className={cn('w-full py-4', className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;
          const isPending = index > currentStepIndex;
          const isLast = index === steps.length - 1;

          const isClickable = allowStepNavigation && onStepClick && (isCompleted || isActive);

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle & Details */}
              <div
                className={cn(
                  'flex flex-col items-center relative z-10 group select-none',
                  isClickable && 'cursor-pointer'
                )}
                onClick={() => isClickable && onStepClick(index)}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border',
                    isCompleted &&
                      'bg-gradient-to-r from-[#22D3EE] to-[#34D399] border-transparent text-white font-bold shadow-none',
                    isActive &&
                      'bg-[var(--color-surface)] border-[var(--color-accent-cyan)] text-transparent bg-clip-text bg-gradient-to-r from-[#22D3EE] to-[#34D399] font-bold ring-2 ring-[var(--color-accent-cyan)]/20',
                    isPending &&
                      'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : index + 1}
                </div>

                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={cn(
                      'text-xs font-semibold tracking-tight transition-colors',
                      isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#22D3EE] to-[#34D399] font-bold' : isCompleted ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[10.5px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-[2px] mx-2 -mt-6 bg-[var(--color-border)] relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#22D3EE] to-[#34D399] transition-all duration-300"
                    style={{
                      width: isCompleted ? '100%' : '0%',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
