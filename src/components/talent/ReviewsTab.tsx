import React, { useState, useEffect } from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { Review } from '@/src/types/firestore';
import { getReviewsForUser } from '@/src/lib/firestore/reviews';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { Star, ThumbsUp, User } from 'lucide-react';

interface ReviewsTabProps {
  symbiote: SymbioteProfile;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ symbiote }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchReviews() {
      setLoading(true);
      try {
        const firestoreReviews = await getReviewsForUser(symbiote.uid);
        if (isMounted) {
          setReviews(firestoreReviews || []);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
        if (isMounted) {
          setReviews([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [symbiote.uid]);

  if (loading) {
    return (
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] animate-pulse space-y-4">
        <div className="h-6 w-40 bg-[var(--color-background)] rounded" />
        <div className="h-24 bg-[var(--color-background)] rounded" />
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyStateBlock
        icon={<Star className="w-6 h-6 text-amber-400" />}
        title="No Client Reviews Yet"
        description="This specialist has not received any client reviews on SyncSphere yet."
      />
    );
  }

  // MATHEMATICAL RATING DISTRIBUTION CALCULATIONS
  const totalReviewsCount = reviews.length;
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  let sumRatings = 0;
  reviews.forEach((r) => {
    const score = Math.round(r.ratings?.overall || 5);
    const clampedScore = Math.min(5, Math.max(1, score)) as 1 | 2 | 3 | 4 | 5;
    ratingCounts[clampedScore] += 1;
    sumRatings += r.ratings?.overall || 5;
  });

  const averageRating = totalReviewsCount > 0 ? (sumRatings / totalReviewsCount).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Client Feedback & Rating Breakdown
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            Total Reviews: {totalReviewsCount}
          </span>
        </div>

        {/* OVERALL RATING SUMMARY & 5-STAR DISTRIBUTION BARS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)]">
          {/* LEFT: OVERALL SCORE BLOCK */}
          <div className="text-center space-y-1 md:border-r border-[var(--color-border)] md:pr-4">
            <div className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">
              {averageRating}
            </div>
            <div className="flex justify-center text-amber-400 gap-1 text-sm">
              {'★'.repeat(Math.round(Number(averageRating)))}
            </div>
            <p className="text-[11px] font-mono text-[var(--color-text-secondary)] pt-1">
              Based on {totalReviewsCount} verified reviews
            </p>
          </div>

          {/* RIGHT: 5 HORIZONTAL BARS (5★ to 1★) */}
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars as 1 | 2 | 3 | 4 | 5];
              const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;

              return (
                <div key={stars} className="flex items-center gap-3 text-xs font-mono">
                  <span className="w-12 text-[var(--color-text-secondary)] text-right shrink-0">
                    {stars} Stars
                  </span>

                  <div className="flex-1 h-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-12 text-left text-[var(--color-text-secondary)] shrink-0">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* INDIVIDUAL REVIEW CARDS */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
            Recent Work Feedback
          </h4>

          {reviews.map((rev) => {
            const overallScore = rev.ratings?.overall || 5;
            const formattedDate = rev.createdAt
              ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={rev.id}
                className="p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[var(--color-text-primary)]">
                        Verified Enterprise Client
                      </h5>
                      <p className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                        Verified Contract
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400 text-xs justify-end">
                      {'★'.repeat(Math.round(overallScore))}
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-primary)] font-sans leading-relaxed">
                  "{rev.feedback}"
                </p>

                {rev.recommend && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-success-green)] font-semibold pt-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>Recommends this specialist to other clients</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
