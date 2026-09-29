import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Route wrapper that redirects already-authenticated users to their role-based dashboard.
 * Used for /login, /signup, /portal-select.
 */
export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { firebaseUser, authenticatedUser, userProfile, currentRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E14] text-[#FFFFFF]">
        <div className="flex items-center gap-3 bg-[#111827] px-5 py-3 rounded-full border border-[#1F2937]">
          <Loader2 className="w-5 h-5 animate-spin text-[#22D3EE]" />
          <span className="text-xs font-medium text-[#94A3B8]">Verifying session...</span>
        </div>
      </div>
    );
  }

  const activeUser = authenticatedUser || userProfile;
  
  // Only redirect if user has an active, verified session, assigned role, and completed onboarding
  const isFullyAuthenticated = Boolean(
    (firebaseUser?.emailVerified || activeUser?.emailVerified) &&
    activeUser &&
    Boolean(activeUser.role) &&
    activeUser.onboardingCompleted === true
  );

  if (isFullyAuthenticated) {
    const rawRole = activeUser?.role || currentRole || 'client';
    const rolePath = rawRole === 'freelancer' ? 'symbiote' : rawRole;
    return <Navigate to={`/${rolePath}/dashboard`} replace />;
  }

  return <>{children}</>;

};
