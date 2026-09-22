import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { FolderKanban, ExternalLink } from 'lucide-react';

interface PortfolioTabProps {
  symbiote: SymbioteProfile;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ symbiote }) => {
  const items = symbiote.portfolio || [];

  if (items.length === 0) {
    return (
      <EmptyStateBlock
        icon={<FolderKanban className="w-6 h-6 text-[var(--color-accent-cyan)]" />}
        title="No Portfolio Projects"
        description="This specialist has not added any portfolio projects to their profile yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Portfolio & Featured Projects
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            Showing {items.length} Project{items.length !== 1 && 's'}
          </span>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                    {item.name}
                  </h4>
                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent-cyan)] hover:underline shrink-0 p-1"
                      title="View Project Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] font-sans leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {item.techTags && item.techTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]">
                  {item.techTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
