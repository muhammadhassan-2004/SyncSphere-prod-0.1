import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredRole: 'client' | 'symbiote' | 'admin';
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { authenticatedUser, userProfile, firebaseUser, currentRole, loading } = useAuth();
  const location = useLocation();

  // Explicitly block rendering of any protected components before authentication status is verified
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E14] text-[#FFFFFF]">
        <div className="flex items-center gap-3 bg-[#111827] px-5 py-3 rounded-full border border-[#1F2937] shadow-none">
          <Loader2 className="w-5 h-5 animate-spin text-[#22D3EE]" />
          <span className="text-xs font-medium text-[#94A3B8]">Authenticating portal access...</span>
        </div>
      </div>
    );
  }

  // Determine user's effective role and user object
  const activeUser = authenticatedUser || userProfile;
  const activeRole = activeUser?.role === 'freelancer' ? 'symbiote' : (activeUser?.role || currentRole);

  // Strictly check for role matching requiredRole (e.g. authenticatedUser.role === 'symbiote')
  // Redirects to /login if role is missing or incorrect
  if (!activeUser || !activeRole || activeRole !== requiredRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strictly enforce email verification across all roles (Client, Freelancer/Symbiote, Admin)
  // If email is not verified, user cannot access any dashboard or portal route
  const isEmailUnverified =
    activeUser.emailVerified === false ||
    (firebaseUser && firebaseUser.emailVerified === false && activeUser.emailVerified !== true);

  if (isEmailUnverified && location.pathname !== '/verify-email') {
    return (
      <Navigate
        to={`/verify-email?email=${encodeURIComponent(activeUser.email || firebaseUser?.email || '')}&role=${activeRole}`}
        state={{
          email: activeUser.email || firebaseUser?.email,
          uid: activeUser.uid || firebaseUser?.uid,
          role: activeRole,
        }}
        replace
      />
    );
  }

  // If a brand new user explicitly has not completed onboarding, redirect to onboarding screen
  if (activeUser.onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to={`/onboarding?role=${activeRole}`} replace />;
  }

  return <>{children}</>;
};

