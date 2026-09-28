import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Review } from '@/src/types/firestore';
import { subscribeToUserReviews, markReviewHelpful } from '@/src/lib/firestore/reviews';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  CheckCheck,
  Award,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export const SymbioteReviewsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid || '';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [helpfulClicked, setHelpfulClicked] = useState<Record<string, boolean>>({});

  // Subscribe to real-time reviews for this symbiote
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsub = subscribeToUserReviews(uid, (revList) => {
      setReviews(revList || []);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. OVERALL COMPUTATIONS & RATING DISTRIBUTION (5★ down to 1★)
  const totalReviewsCount = reviews.length;

  const { averageScore, ratingCounts } = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) {
      return { averageScore: '0.0', ratingCounts: counts };
    }

    let sum = 0;
    reviews.forEach((r) => {
      const score = Math.min(5, Math.max(1, Math.round(r.ratings?.overall || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[score] += 1;
      sum += r.ratings?.overall || 5;
    });

    const avg = (sum / reviews.length).toFixed(1);
    return { averageScore: avg, ratingCounts: counts };
  }, [reviews]);

  // 2. CATEGORY SCORES COMPUTATION
  const categoryScores = useMemo(() => {
    if (reviews.length === 0) {
      return {
        communication: 0,
        qualityOfWork: 0,
        expertise: 0,
        deadlines: 0,
        wouldRehirePct: 0,
      };
    }

    let sumComm = 0;
    let sumQuality = 0;
    let sumExpertise = 0;
    let sumDeadlines = 0;
    let recommendCount = 0;

    reviews.forEach((r) => {
      sumComm += r.ratings?.communication || 5;
      sumQuality += r.ratings?.workQuality || 5;
      sumExpertise += r.ratings?.technicalSkills || 5;
      sumDeadlines += r.ratings?.timeliness || 5;
      if (r.recommend) recommendCount += 1;
    });

    const count = reviews.length;
    return {
      communication: +(sumComm / count).toFixed(1),
      qualityOfWork: +(sumQuality / count).toFixed(1),
      expertise: +(sumExpertise / count).toFixed(1),
      deadlines: +(sumDeadlines / count).toFixed(1),
      wouldRehirePct: Math.round((recommendCount / count) * 100),
    };
  }, [reviews]);

  // HELPFUL INCREMENT HANDLER
  const handleMarkHelpful = async (reviewId?: string, currentCount: number = 0) => {
    if (!reviewId) return;
    if (helpfulClicked[reviewId]) {
      showToast('You already found this review helpful');
      return;
    }

    setHelpfulClicked((prev) => ({ ...prev, [reviewId]: true }));
    const success = await markReviewHelpful(reviewId, currentCount);
    if (success) {
      showToast('Thank you! Marked review as helpful.');
    } else {
      showToast('Feedback recorded.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-500 text-white font-semibold text-caption rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCheck className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="border-b border-[var(--color-border)] pb-4">
        <h1 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          <span>Reviews & Ratings</span>
        </h1>
        <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
          Verified client performance metrics, rating distributions, and milestone feedback.
        </p>
      </div>

      {/* 2-COLUMN METRICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMN 1: OVERALL SCORE CARD */}
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
            <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Overall Rating</span>
            </h2>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="text-4xl font-mono font-bold text-[var(--color-text-primary)] tracking-tight">
              {averageScore}
            </div>

            {/* 5-STAR VISUAL DISPLAY */}
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(Number(averageScore))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-[var(--color-border)] fill-transparent'
                  }`}
                />
              ))}
            </div>

            <p className="text-caption text-[var(--color-text-secondary)] font-mono text-center">
              {totalReviewsCount > 0 ? `Based on ${totalReviewsCount} verified client reviews` : 'No reviews recorded yet'}
            </p>
          </div>

          {/* RATING DISTRIBUTION BARS (5★ down to 1★) */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingCounts[stars as 1 | 2 | 3 | 4 | 5];
              const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;

              return (
                <div key={stars} className="flex items-center gap-3 text-caption">
                  <span className="w-6 font-mono font-semibold text-[var(--color-text-secondary)] text-right">
                    {stars}★
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="w-10 font-mono text-[11px] text-[var(--color-text-secondary)] text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* COLUMN 2: CATEGORY SCORES */}
        <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
            <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Category Scores</span>
            </h2>
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              5 Key Dimensions
            </span>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* 1. COMMUNICATION */}
            <div className="space-y-1">
              <div className="flex justify-between text-caption font-semibold text-[var(--color-text-primary)]">
                <span>Communication</span>
                <span className="font-mono text-emerald-400">{categoryScores.communication} / 5.0</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(categoryScores.communication / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 2. QUALITY OF WORK */}
            <div className="space-y-1">
              <div className="flex justify-between text-caption font-semibold text-[var(--color-text-primary)]">
                <span>Quality of Work</span>
                <span className="font-mono text-cyan-400">{categoryScores.qualityOfWork} / 5.0</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${(categoryScores.qualityOfWork / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 3. EXPERTISE */}
            <div className="space-y-1">
              <div className="flex justify-between text-caption font-semibold text-[var(--color-text-primary)]">
                <span>Expertise & Technical Skills</span>
                <span className="font-mono text-teal-400">{categoryScores.expertise} / 5.0</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${(categoryScores.expertise / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 4. DEADLINES */}
            <div className="space-y-1">
              <div className="flex justify-between text-caption font-semibold text-[var(--color-text-primary)]">
                <span>Deadlines & Timeliness</span>
                <span className="font-mono text-amber-400">{categoryScores.deadlines} / 5.0</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${(categoryScores.deadlines / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 5. WOULD REHIRE */}
            <div className="space-y-1">
              <div className="flex justify-between text-caption font-semibold text-[var(--color-text-primary)]">
                <span>Would Rehire</span>
                <span className="font-mono text-emerald-400">{categoryScores.wouldRehirePct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${categoryScores.wouldRehirePct}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* BOTTOM SECTION: CLIENT REVIEWS LIST */}
      <Card className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-[12px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-body font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Client Reviews</span>
            </h2>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Verified feedback submitted by clients upon milestone completion and approval.
            </p>
          </div>

          <span className="text-caption font-mono text-[var(--color-text-secondary)]">
            {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>

        {/* REVIEWS LIST DISPLAY */}
        {loading ? (
          <div className="py-12 text-center text-caption text-[var(--color-text-secondary)]">
            Loading client reviews...
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const clientName = rev.clientName || 'Enterprise Client';
              const projName = rev.projectName || 'Enterprise AI Milestone';
              const score = rev.ratings?.overall || 5;
              const dateStr = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recently';

              return (
                <div
                  key={rev.id || Math.random().toString()}
                  className="p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-3 transition-colors hover:border-[var(--color-text-secondary)]/30"
                >
                  {/* REVIEW HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={clientName} size="sm" className="border border-[var(--color-border)]" />

                      <div>
                        <h3 className="text-body font-bold text-[var(--color-text-primary)]">
                          {clientName}
                        </h3>
                        <p className="text-[11px] text-[var(--color-text-secondary)]">
                          Project: <span className="text-[var(--color-text-primary)] font-medium">{projName}</span> • {dateStr}
                        </p>
                      </div>
                    </div>

                    {/* RATING BADGE */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2.5 py-1 rounded-full text-caption font-mono font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* REVIEW BODY / TEXT */}
                  <p className="text-caption text-[var(--color-text-primary)] leading-relaxed">
                    "{rev.feedback}"
                  </p>

                  {/* FOOTER & HELPFUL BUTTON */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Client Project Completion</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkHelpful(rev.id, rev.helpfulCount || 0)}
                      className={`h-7 px-2.5 text-[11px] flex items-center gap-1.5 rounded-lg border transition-colors ${
                        helpfulClicked[rev.id || '']
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>
                        Helpful ({ (rev.helpfulCount || 0) + (helpfulClicked[rev.id || ''] ? 1 : 0) })
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateBlock
            icon={<Star className="w-6 h-6 text-amber-400" />}
            title="No Reviews Yet"
            description="Client reviews and ratings will appear here as completed project milestones are approved."
          />
        )}
      </Card>
    </div>
  );
};
