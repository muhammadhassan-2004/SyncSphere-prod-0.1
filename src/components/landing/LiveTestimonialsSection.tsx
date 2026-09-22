import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Star, CheckCircle2, MessageSquare, Database, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { getLivePublicReviews, FeaturedReview } from '@/src/lib/firestore/landingData';

export const LiveTestimonialsSection: React.FC = () => {
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const liveRevs = await getLivePublicReviews();
        if (isMounted) {
          setReviews(liveRevs);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }
    loadReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasLiveReviews = reviews.length > 0;

  const displayReviews: FeaturedReview[] = reviews;

  return (
    <section id="testimonials" className="py-12 px-6 lg:px-12 max-w-7xl mx-auto space-y-10 text-left">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-[var(--color-accent-cyan)] uppercase font-bold">
              VERIFIED FEEDBACK
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              <Database className="w-3 h-3 text-[var(--color-accent-cyan)]" />
              {hasLiveReviews ? 'Live Firestore Collection' : 'Platform Benchmark (No Reviews Logged Yet)'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Trusted by engineering teams and <br />
            <span className="text-accent-gradient">specialist builders</span>
          </h2>
        </div>

        <Link to="/portal-select">
          <Button variant="secondary" size="sm" className="font-semibold gap-2">
            Join Platform & Hire <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayReviews.map((rev) => (
          <Card
            key={rev.id}
            className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md hover:border-[var(--color-accent-cyan)]/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Star Rating & Source Flag */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${idx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                  <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] ml-1">
                    {rev.rating}.0
                  </span>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-tertiary)] flex items-center gap-1">
                  {rev.isRealData ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[var(--color-success-green)]" />
                      <span>Verified Client</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 text-[var(--color-info-blue)]" />
                      <span>Benchmark</span>
                    </>
                  )}
                </span>
              </div>

              {/* Review Text */}
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic">
                "{rev.comment}"
              </p>
            </div>

            {/* Author Meta */}
            <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--color-text-primary)]">
                  {rev.authorName}
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[180px]">
                  {rev.companyName}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20 capitalize">
                {rev.authorRole}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
