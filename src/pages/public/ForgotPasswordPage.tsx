import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { requestPasswordReset } from '@/src/lib/auth/passwordReset';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // Dispatch custom SMTP OTP email via requestPasswordReset
      const result = await requestPasswordReset(cleanEmail);

      if (!result.success) {
        setError(result.error || 'Failed to send password reset email. Please try again.');
        return;
      }

      navigate('/reset/verify', {
        state: {
          email: cleanEmail,
          uid: result.uid,
          role: result.role,
        },
      });
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err?.message || 'An error occurred while processing your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-8">
        {/* Top Logo & Navigation */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 focus:outline-none">
            <SyncSphereLogo iconSize={32} textSize="lg" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <span>Home</span>
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          {/* Lock Badge & Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] flex items-center justify-center mx-auto border border-[var(--color-accent-cyan)]/20 shadow-md">
              <LockKeyhole className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-h2 font-bold tracking-tight text-[var(--color-text-primary)]">
                Forgot your password?
              </h1>
              <p className="text-caption text-[var(--color-text-secondary)] leading-relaxed max-w-xs mx-auto">
                Enter your registered work email and we will send a real, secure password reset link directly to your inbox.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-lg bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <Input
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!email.trim() || loading}
              className="w-full justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer inside card */}
          <div className="pt-2 text-center text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-[var(--color-accent-cyan)] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
