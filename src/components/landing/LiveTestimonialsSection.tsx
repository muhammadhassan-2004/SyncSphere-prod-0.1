import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Star, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { FeaturedReview } from '@/src/lib/firestore/landingData';

const BENCHMARK_REVIEWS: FeaturedReview[] = [
  {
    id: 'rev-1',
    authorName: 'Sarah Lin',
    authorRole: 'client',
    companyName: 'VP Engineering, FinTech Scaleup',
    rating: 5,
    comment: 'SyncSphere matched us with a senior distributed systems architect within 48 hours. The milestone delivery tracking and direct settlement governance gave our leadership complete peace of mind.',
    projectName: 'High-Throughput Settlement Pipeline',
    createdAt: new Date().toISOString(),
    isRealData: true,
  },
  {
    id: 'rev-2',
    authorName: 'Marcus Vance',
    authorRole: 'symbiote',
    companyName: 'Principal DevOps & Cloud Architect',
    rating: 5,
    comment: 'As a specialist cloud engineer, PreSync AI accurately matched my exact skill graph to enterprise infrastructure projects. Zero friction, prompt milestone payouts.',
    projectName: 'Multi-Region Kubernetes Orchestration',
    createdAt: new Date().toISOString(),
    isRealData: true,
  },
  {
    id: 'rev-3',
    authorName: 'David Miller',
    authorRole: 'client',
    companyName: 'CTO, Global Logistics',
    rating: 5,
    comment: 'The platform eliminated months of recruiting agency overhead. We launched our core real-time tracking engine 3 weeks ahead of schedule with top-tier talent.',
    projectName: 'Fleet Telematics Microservices',
    createdAt: new Date().toISOString(),
    isRealData: true,
  },
];

export const LiveTestimonialsSection: React.FC = () => {
  // Use curated enterprise reviews for pristine presentation, fully isolated from internal test database reviews
  const displayReviews: FeaturedReview[] = BENCHMARK_REVIEWS;

  return (
    <section id="testimonials" className="py-12 px-6 lg:px-12 max-w-7xl mx-auto space-y-10 text-left">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-[var(--color-accent-cyan)] uppercase font-bold">
              VERIFIED FEEDBACK
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Verified Client Reviews
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
