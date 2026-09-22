import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { auth, db } from '@/src/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { verifyResetCode, extractOobCode } from '@/src/lib/auth/passwordReset';

export const AuthActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const rawCode = searchParams.get('oobCode') || searchParams.get('code') || searchParams.get('token') || '';
  const oobCode = extractOobCode(rawCode);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleAction = async () => {
      if (!mode || !oobCode) {
        if (isMounted) {
          setError('Missing authentication parameters in the reset link.');
          setProcessing(false);
        }
        return;
      }

      switch (mode) {
        case 'resetPassword': {
          const result = await verifyResetCode(oobCode);
          if (!isMounted) return;

          if (result.valid && result.email) {
            navigate('/reset/new-password', {
              state: {
                email: result.email,
                oobCode: oobCode,
                role: result.role,
              },
              replace: true,
            });
          } else {
            setError(
              result.error ||
                'This password reset link is invalid, expired, or has already been used. Please request a new link.'
            );
            setProcessing(false);
          }
          break;
        }

        case 'verifyEmail': {
          try {
            await applyActionCode(auth, oobCode);
            if (auth.currentUser) {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                emailVerified: true,
                updatedAt: new Date().toISOString(),
                lastActiveAt: serverTimestamp(),
              });
            }
            navigate('/verify-email', { state: { verified: true }, replace: true });
          } catch (err: any) {
            console.warn('Email verification check notice:', err?.code || err?.message);
            if (isMounted) {
              setError('This email verification link is invalid or has expired.');
              setProcessing(false);
            }
          }
          break;
        }

        default: {
          if (isMounted) {
            setError(`Unsupported authentication action: ${mode}`);
            setProcessing(false);
          }
        }
      }
    };

    handleAction();

    return () => {
      isMounted = false;
    };
  }, [mode, oobCode, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <SyncSphereLogo iconSize={36} textSize="xl" className="justify-center mb-4" />
          <Card className="p-8 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent-cyan)] mx-auto" />
            <div className="space-y-1">
              <h2 className="text-h3 font-bold text-[var(--color-text-primary)]">Verifying Authentication...</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Securely validating your request with Firebase Authentication.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 focus:outline-none">
            <SyncSphereLogo iconSize={32} textSize="lg" />
          </Link>
          <Link
            to="/login"
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Login</span>
          </Link>
        </div>

        <Card className="p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger-red)]/10 text-[var(--color-danger-red)] flex items-center justify-center mx-auto border border-[var(--color-danger-red)]/20 shadow-md">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-h2 font-bold text-[var(--color-text-primary)]">
              Authentication Link Error
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link to="/forgot-password" className="block w-full">
              <Button variant="primary" className="w-full justify-center">
                Request New Reset Link
              </Button>
            </Link>
            <Link to="/login" className="block w-full">
              <Button variant="secondary" className="w-full justify-center">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
