import { auth, db } from '@/src/lib/firebase';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { UserRole } from '@/src/context/AuthContext';
import { UserProfile } from '@/src/types/firestore';

export interface RequestResetResult {
  success: boolean;
  uid?: string;
  email?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Initiates the password reset flow using custom SMTP dispatch and Firebase Auth:
 * Sends a single branded email containing both the 6-digit numeric OTP code and direct reset link,
 * and ensures Firebase Auth action code is generated.
 */
export async function requestPasswordReset(email: string): Promise<RequestResetResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return {
        success: false,
        error: 'Please enter a valid email address.',
      };
    }

    // 1. Dispatch custom branded email with 6-digit OTP code via backend API (Custom SMTP)
    const response = await fetch('/api/auth/send-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const resData = await response.json();

    if (!resData.success) {
      return {
        success: false,
        error: resData.error || 'Failed to send password reset email. Please check the email address and try again.',
      };
    }

    return {
      success: true,
      email: cleanEmail,
      uid: resData.uid,
      role: resData.role === 'freelancer' ? 'symbiote' : resData.role,
    };
  } catch (err: any) {
    console.error('requestPasswordReset error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to send password reset email. Please try again.',
    };
  }
}

/**
 * Sanitizes and extracts the Firebase OOB code from raw user input,
 * which can be a pure oobCode, a full URL with query parameters,
 * an angle-bracketed URL from an email client (<https://...>),
 * or a URL-encoded string.
 */
export function extractOobCode(rawInput: string): string {
  if (!rawInput) return '';
  let cleaned = rawInput.trim();

  // Strip enclosing quotes or angle brackets commonly added by email apps
  cleaned = cleaned.replace(/^[<"']+|[>"']+$/g, '').trim();

  // If input contains full URL or query string
  if (cleaned.includes('http://') || cleaned.includes('https://') || cleaned.includes('?')) {
    try {
      const urlObj = cleaned.startsWith('http') ? new URL(cleaned) : new URL(cleaned, 'https://example.com');
      const paramCode =
        urlObj.searchParams.get('oobCode') ||
        urlObj.searchParams.get('code') ||
        urlObj.searchParams.get('token');
      if (paramCode) {
        return paramCode.trim();
      }
      if (urlObj.hash) {
        const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
        const hashCode =
          hashParams.get('oobCode') ||
          hashParams.get('code') ||
          hashParams.get('token');
        if (hashCode) return hashCode.trim();
      }
    } catch {
      // Fallback to regex
    }
  }

  // Regex fallback in case URL parsing failed or text was wrapped
  const match =
    cleaned.match(/[?&]oobCode=([^&\s]+)/i) ||
    cleaned.match(/[?&]code=([^&\s]+)/i) ||
    cleaned.match(/oobCode=([^&\s]+)/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].trim());
    } catch {
      return match[1].trim();
    }
  }

  return cleaned;
}

export interface VerifyCodeResult {
  valid: boolean;
  email?: string;
  uid?: string;
  role?: UserRole;
  userProfile?: UserProfile;
  error?: string;
}

/**
 * Validates a password reset code (either a Firebase action code or 6-digit OTP)
 * Uses backend API or Firebase Auth verifyPasswordResetCode without unauthenticated Firestore queries.
 */
export async function verifyResetCode(rawOobCode: string, email?: string): Promise<VerifyCodeResult> {
  const oobCode = extractOobCode(rawOobCode);
  if (!oobCode) {
    return {
      valid: false,
      error: 'Password reset link or code is missing. Please check your email or request a new code.',
    };
  }

  const cleanCode = oobCode.trim();

  // 1. If it's a 6-digit numeric OTP code or email is provided, verify via server-side API
  if (/^\d{6}$/.test(cleanCode) || email) {
    try {
      const resp = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, email: email || '' }),
      });
      const data = await resp.json();
      if (data.success && data.email) {
        const cleanEmail = data.email.toLowerCase().trim();
        const resolvedRole: UserRole = data.role === 'freelancer' ? 'symbiote' : (data.role || 'client');

        return {
          valid: true,
          email: cleanEmail,
          uid: data.uid || '',
          role: resolvedRole,
        };
      } else if (/^\d{6}$/.test(cleanCode)) {
        return {
          valid: false,
          error: data.error || 'Invalid or expired 6-digit verification code.',
        };
      }
    } catch (apiErr) {
      console.warn('Backend verify-reset-code check error:', apiErr);
    }
  }

  // 2. Validate Firebase native action code with Firebase Auth
  try {
    const verifiedEmail = await verifyPasswordResetCode(auth, cleanCode);
    const cleanEmail = verifiedEmail.toLowerCase().trim();

    let resolvedRole: UserRole = 'client';
    let resolvedUid = '';

    // Check if role is stored for this email via server verification endpoint
    try {
      const resp = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, email: cleanEmail }),
      });
      const data = await resp.json();
      if (data?.role) {
        resolvedRole = data.role === 'freelancer' ? 'symbiote' : data.role;
      }
      if (data?.uid) {
        resolvedUid = data.uid;
      }
    } catch {}

    return {
      valid: true,
      email: cleanEmail,
      role: resolvedRole,
      uid: resolvedUid,
    };
  } catch (err: any) {
    console.warn('verifyResetCode check notice:', err?.code || err?.message);
    if (err?.code === 'auth/invalid-action-code') {
      return {
        valid: false,
        error: 'This password reset link is invalid or has already been used. Please request a new link.',
      };
    } else if (err?.code === 'auth/expired-action-code') {
      return {
        valid: false,
        error: 'This password reset link has expired. Please request a new link.',
      };
    }
    return {
      valid: false,
      error: err?.message || 'Invalid or expired password reset link.',
    };
  }
}

export interface CompleteResetResult {
  success: boolean;
  role: UserRole;
  userProfile?: UserProfile;
  uid?: string;
  error?: string;
}

/**
 * Checks if the candidate new password is the same as the user's current password.
 * Returns true if it matches current password, false otherwise.
 */
export async function checkIfPasswordIsSame(email: string, candidatePassword: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !candidatePassword) return false;

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, candidatePassword);
    if (cred.user) {
      // Successfully authenticated with this password, meaning it is the current password!
      await auth.signOut();
      return true;
    }
    return false;
  } catch (err: any) {
    // If sign in fails (auth/wrong-password or auth/invalid-credential), it is NOT the existing password
    return false;
  }
}

/**
 * Completes the password reset process directly in Firebase Auth:
 * 1. Verifies that the new password is NOT identical to the previous password
 * 2. Supports Firebase Auth action codes AND server-side Admin SDK reset for OTP codes
 * 3. Signs the user in with the newly updated credentials
 * 4. Safely updates non-sensitive Firestore metadata in authenticated state
 */
export async function completePasswordReset(
  oobCode: string,
  email: string,
  newPassword: string
): Promise<CompleteResetResult> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOobCode = oobCode.trim();

    if (!cleanOobCode && !cleanEmail) {
      return {
        success: false,
        role: 'client',
        error: 'Missing password reset authorization code. Please click the link in your email.',
      };
    }

    // 0. Check if the user is trying to reuse their previous password
    const isSamePassword = await checkIfPasswordIsSame(cleanEmail, newPassword);
    if (isSamePassword) {
      return {
        success: false,
        role: 'client',
        error: 'New password cannot be the same as your old password. Please choose a different password.',
      };
    }

    let passwordUpdated = false;
    let serverRole: UserRole = 'client';
    let serverUid: string | undefined = undefined;

    // 1. If cleanOobCode is NOT a 6-digit OTP, attempt native Firebase Auth client reset
    if (!/^\d{6}$/.test(cleanOobCode)) {
      try {
        await confirmPasswordReset(auth, cleanOobCode, newPassword);
        passwordUpdated = true;
        console.log('[PasswordReset] Confirmed password reset via Firebase client SDK');
      } catch (clientResetErr: any) {
        console.warn('[PasswordReset] Client confirmPasswordReset notice:', clientResetErr?.code);
        if (clientResetErr?.code === 'auth/weak-password') {
          return {
            success: false,
            role: 'client',
            error: 'The password is too weak. Please include uppercase letters, numbers, and at least 8 characters.',
          };
        }
      }
    }

    // 2. If client reset didn't succeed or code was 6-digit OTP, update via server Admin SDK
    let serverCustomToken: string | undefined = undefined;
    if (!passwordUpdated) {
      const serverResp = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanOobCode,
          newPassword,
        }),
      });
      const serverData = await serverResp.json();
      if (!serverData.success) {
        return {
          success: false,
          role: 'client',
          error: serverData.error || 'Failed to update password. Please try again.',
        };
      }
      passwordUpdated = true;
      if (serverData.role) {
        serverRole = serverData.role === 'freelancer' ? 'symbiote' : serverData.role;
      }
      if (serverData.uid) {
        serverUid = serverData.uid;
      }
      if (serverData.customToken) {
        serverCustomToken = serverData.customToken;
      }
      console.log('[PasswordReset] Updated password via Server Admin SDK');
    }

    // 3. Sign in the user with their new credentials
    let resolvedRole: UserRole = serverRole;
    let userUid = serverUid || '';
    let userProfile: UserProfile | undefined = undefined;

    // Purge any stale mock/demo keys before session establishment
    localStorage.removeItem('syncsphere_mock_role');
    localStorage.removeItem('syncsphere_demo_mode');

    try {
      let userCred: any = null;

      // Method A: Sign in instantly with Custom Token if returned by backend
      if (serverCustomToken) {
        try {
          userCred = await signInWithCustomToken(auth, serverCustomToken);
          console.log('[PasswordReset] Successfully auto-authenticated via Firebase Custom Token');
        } catch (tokenSignErr: any) {
          console.warn('[PasswordReset] Custom token sign-in notice, falling back to password sign-in:', tokenSignErr?.message);
        }
      }

      // Method B: Fallback to direct Email & Password sign-in
      if (!userCred || !userCred.user) {
        userCred = await signInWithEmailAndPassword(auth, cleanEmail, newPassword);
        console.log('[PasswordReset] Successfully auto-authenticated via Firebase Password sign-in');
      }

      if (userCred?.user) {
        userUid = userCred.user.uid;

        // Now that user is authenticated, fetching or updating their own document is allowed
        try {
          const userDocRef = doc(db, 'users', userUid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            if (data.role) {
              const rawRole = data.role;
              resolvedRole = rawRole === 'freelancer' ? 'symbiote' : (rawRole as UserRole);
            }
            userProfile = {
              ...data,
              uid: userUid,
              email: cleanEmail,
              role: resolvedRole,
            };
          }

          const now = new Date().toISOString();
          await updateDoc(userDocRef, {
            passwordUpdatedAt: now,
            updatedAt: now,
            lastActiveAt: serverTimestamp(),
            emailVerified: true,
          });
        } catch (metaErr) {
          console.warn('[PasswordReset] Authenticated metadata update notice:', metaErr);
        }

        const existingOnboarding = userProfile?.onboardingCompleted !== undefined ? userProfile.onboardingCompleted : true;

        localStorage.setItem(
          'syncsphere_user_session',
          JSON.stringify({
            uid: userCred.user.uid,
            email: cleanEmail,
            displayName: userProfile?.displayName || userCred.user.displayName || cleanEmail.split('@')[0],
            role: resolvedRole,
            avatarUrl: userProfile?.avatarUrl,
            onboardingCompleted: existingOnboarding,
          })
        );
        localStorage.setItem('syncsphere_role', resolvedRole);
      }
    } catch (signErr: any) {
      console.warn('[PasswordReset] Automatic sign-in after password update note:', signErr?.code || signErr?.message);
      // Even if automatic sign-in fails, the password was successfully reset on the backend
      return {
        success: true,
        role: resolvedRole,
        uid: userUid,
      };
    }

    return {
      success: true,
      role: resolvedRole,
      uid: userUid,
      userProfile,
    };
  } catch (err: any) {
    console.error('completePasswordReset error:', err);
    if (err?.code === 'auth/invalid-action-code') {
      return {
        success: false,
        role: 'client',
        error: 'This password reset link is invalid or has already been used. Please request a new link.',
      };
    } else if (err?.code === 'auth/expired-action-code') {
      return {
        success: false,
        role: 'client',
        error: 'This password reset link has expired. Please request a new link.',
      };
    } else if (err?.code === 'auth/weak-password') {
      return {
        success: false,
        role: 'client',
        error: 'The password is too weak. Please include uppercase letters, numbers, and at least 8 characters.',
      };
    }
    return {
      success: false,
      role: 'client',
      error: err?.message || 'Failed to update password. Please try again.',
    };
  }
}


