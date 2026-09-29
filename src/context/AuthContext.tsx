import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types/firestore';
import { subscribeToUserProfile } from '@/src/lib/firestore/users';

export type UserRole = 'client' | 'symbiote' | 'admin' | null;

export interface AuthContextType {
  currentRole: UserRole;
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authenticatedUser: UserProfile | null;
  user: UserProfile | FirebaseUser | null;
  loading: boolean;
  login: (role: 'client' | 'symbiote' | 'admin') => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'syncsphere_mock_role';
const SESSION_STORAGE_KEY = 'syncsphere_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  // Read initial stored session & role synchronously to prevent flash of unauthenticated state on page reload
  const getInitialRole = (): UserRole => {
    try {
      const sessionRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed.role === 'client' || parsed.role === 'symbiote' || parsed.role === 'admin') {
          return parsed.role;
        }
      }
    } catch {
      // ignore parse error
    }
    const isDemo = localStorage.getItem('syncsphere_demo_mode') === 'true';
    if (isDemo) {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole;
      if (saved === 'client' || saved === 'symbiote' || saved === 'admin') {
        return saved;
      }
    }
    return null;
  };

  const getInitialProfile = (): UserProfile | null => {
    try {
      const sessionRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed.role) {
          return {
            uid: parsed.uid || 'cached-user',
            email: parsed.email || '',
            displayName: parsed.displayName || 'User',
            role: parsed.role,
            avatarUrl: parsed.avatarUrl,
            createdAt: parsed.createdAt || '2026-01-01T00:00:00.000Z',
            updatedAt: parsed.updatedAt || '2026-01-01T00:00:00.000Z',
          };
        }
      }
    } catch {
      // ignore parse error
    }
    return null;
  };

  const [currentRole, setCurrentRoleState] = useState<UserRole>(getInitialRole);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(getInitialProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let unSubProfile: (() => void) | null = null;
    let isMounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      try {
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
      } catch (err) {
        console.warn('authStateReady error:', err);
      }

      if (!isMounted) return;

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;

        if (user) {
          // Clear any leftover demo mode on real user authentication
          localStorage.removeItem('syncsphere_demo_mode');

          let heartbeatTimer: any = null;
          // Record active login/session timestamp and ensure basic user metadata exists
          const touchActive = async () => {
            try {
              const nameParts = (user.displayName || '').trim().split(' ').filter(Boolean);
              const gFirstName = nameParts[0] || (user.email ? user.email.split('@')[0] : 'User');
              const gLastName = nameParts.slice(1).join(' ') || '';
              const gFullName = user.displayName || `${gFirstName} ${gLastName}`.trim() || 'User';

              const basicData: Record<string, any> = {
                uid: user.uid,
                email: (user.email || '').toLowerCase(),
                displayName: gFullName,
                fullName: gFullName,
                lastActiveAt: serverTimestamp(),
                updatedAt: new Date().toISOString(),
                isOnline: true,
              };
              if (user.photoURL) {
                basicData.avatarUrl = user.photoURL;
              }
              if (typeof user.emailVerified === 'boolean') {
                basicData.emailVerified = user.emailVerified;
              }

              // Ensure createdAt is always present so user is never omitted from timestamp-sorted queries
              const userRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists() || !userSnap.data()?.createdAt) {
                basicData.createdAt = new Date().toISOString();
              }

              await setDoc(userRef, basicData, { merge: true });
            } catch (err) {
              console.warn('Failed to update lastActiveAt on auth:', err);
            }
          };

          touchActive();
          heartbeatTimer = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
              touchActive();
            }
          }, 150000); // Heartbeat every 2.5 minutes

          if (unSubProfile) {
            unSubProfile();
            unSubProfile = null;
          }

          // Subscribe to user profile doc with email fallback search
          unSubProfile = subscribeToUserProfile(
            user.uid,
            (profile) => {
              if (!isMounted) return;
              if (profile && profile.role) {
                const rawRole = profile.role;
                const matchedRole: UserRole =
                  rawRole === 'freelancer'
                    ? 'symbiote'
                    : rawRole === 'client' || rawRole === 'symbiote' || rawRole === 'admin'
                    ? rawRole
                    : null;

                const normalizedProfile: UserProfile = {
                  ...profile,
                  role: matchedRole,
                };

                // Batched atomic update
                setFirebaseUser(user);
                setUserProfileState(normalizedProfile);
                setCurrentRoleState(matchedRole);
                if (matchedRole) {
                  localStorage.setItem(STORAGE_KEY, matchedRole);
                  localStorage.setItem(
                    SESSION_STORAGE_KEY,
                    JSON.stringify({
                      uid: user.uid,
                      email: profile.email || user.email || '',
                      displayName: profile.displayName || user.displayName || 'User',
                      role: matchedRole,
                      avatarUrl: profile.avatarUrl,
                    })
                  );
                }
              } else if (profile) {
                // Document exists but user has not selected a role yet
                setFirebaseUser(user);
                setUserProfileState(profile as UserProfile);
                setCurrentRoleState(null);
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(SESSION_STORAGE_KEY);
              } else {
                // Document doesn't exist yet
                setFirebaseUser(user);
                setUserProfileState(null);
                setCurrentRoleState(null);
              }
              setLoading(false);
            },
            user.email || undefined
          );
        } else {
          // If Firebase user is not authenticated, preserve existing active local session if present
          const storedRole = getInitialRole();
          setFirebaseUser(null);
          if (storedRole) {
            setCurrentRoleState(storedRole);
          } else {
            setCurrentRoleState(null);
            setUserProfileState(null);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unSubProfile) unSubProfile();
    };
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
    if (role) {
      localStorage.setItem(STORAGE_KEY, role);
      try {
        const existingRaw = localStorage.getItem(SESSION_STORAGE_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...existing, role }));
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('syncsphere_demo_mode');
    }
  }, []);

  const login = useCallback((role: 'client' | 'symbiote' | 'admin') => {
    localStorage.setItem('syncsphere_demo_mode', 'true');
    setRole(role);
  }, [setRole]);

  const logout = useCallback(async () => {
    if (firebaseUser?.uid) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), { isOnline: false, lastActiveAt: serverTimestamp() }, { merge: true });
      } catch {
        // Silently ignore if network drops
      }
    }
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('syncsphere_demo_mode');
    setCurrentRoleState(null);
    setUserProfileState(null);
    setFirebaseUser(null);
  }, []);

  // Effective authenticated user with synced role - memoized to prevent infinite renders
  const authenticatedUser: UserProfile | null = useMemo(() => {
    if (userProfile) {
      return {
        ...userProfile,
        role: (userProfile.role === 'freelancer' ? 'symbiote' : userProfile.role) || currentRole,
      };
    }
    if (firebaseUser) {
      const defaultRoleName =
        currentRole === 'symbiote' ? 'Symbiote' : currentRole === 'admin' ? 'Admin' : 'Client';
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || defaultRoleName,
        role: currentRole || 'client',
        createdAt: (firebaseUser.metadata as any)?.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('syncsphere_demo_mode') === 'true';
    if (isDemo && currentRole) {
      return {
        uid: currentRole === 'symbiote' ? 'symbiote-demo' : currentRole === 'client' ? 'client-demo' : 'admin-demo',
        email: '',
        displayName: currentRole === 'symbiote' ? 'Demo Symbiote' : currentRole === 'client' ? 'Demo Client' : 'Demo Admin',
        role: currentRole,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
    }
    return null;
  }, [userProfile, currentRole, firebaseUser]);

  const user = useMemo(() => authenticatedUser || firebaseUser, [authenticatedUser, firebaseUser]);

  const contextValue = useMemo(
    () => ({
      currentRole,
      firebaseUser,
      userProfile,
      authenticatedUser,
      user,
      loading,
      login,
      logout,
      setRole,
    }),
    [currentRole, firebaseUser, userProfile, authenticatedUser, user, loading, login, logout, setRole]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


