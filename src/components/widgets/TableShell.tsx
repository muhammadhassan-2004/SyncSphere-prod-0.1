import React from 'react';
import { cn } from '@/src/lib/utils';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableShellProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  emptyStateCustom?: React.ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
  renderActions?: (row: T, index: number) => React.ReactNode;
}

export function TableShell<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  loadingRows = 4,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display at this time.',
  emptyAction,
  emptyStateCustom,
  className,
  onRowClick,
  renderActions,
}: TableShellProps<T>) {
  const hasActions = Boolean(renderActions);

  return (
    <div className={cn('w-full border border-[var(--color-border)] rounded-[10px] overflow-hidden bg-[var(--color-surface)]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50 text-[var(--color-text-secondary)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'py-3 px-4 text-[11px] font-semibold uppercase tracking-wider select-none',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {hasActions && (
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-right select-none w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading ? (
              Array.from({ length: loadingRows }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-cell-${cIdx}`} className="py-3.5 px-4">
                      <div className="h-4 bg-[var(--color-border)]/60 rounded-[4px] w-3/4" />
                    </td>
                  ))}
                  {hasActions && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-6 bg-[var(--color-border)]/60 rounded-[4px] ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="p-0 border-none">
                  {emptyStateCustom || (
                    <EmptyStateBlock
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                      className="border-none bg-transparent py-10"
                    />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors duration-150 text-[var(--color-text-primary)] hover:bg-[var(--color-background)]/40',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => {
                    const rawVal = (row as Record<string, unknown>)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'py-3.5 px-4 text-sm font-normal align-middle',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {col.render ? col.render(row, index) : String(rawVal ?? '')}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className="py-3.5 px-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                      {renderActions(row, index)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
