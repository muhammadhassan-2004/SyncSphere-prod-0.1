import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Loader2 } from 'lucide-react';

export function RequireAdmin() {
  const { authenticatedUser, userProfile, currentRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <div className="flex items-center gap-3 bg-[var(--color-surface)] px-5 py-3 rounded-full border border-[var(--color-border)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-danger-red)]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Authenticating admin console access...</span>
        </div>
      </div>
    );
  }

  const activeUser = authenticatedUser || userProfile;
  const activeRole = activeUser?.role === 'freelancer' ? 'symbiote' : (activeUser?.role || currentRole);

  if (!activeUser || !activeRole || activeRole !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
