import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { useAuth } from '@/src/context/AuthContext';
import {
  Menu,
  X,
  LogOut,
} from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const { firebaseUser, authenticatedUser, userProfile, currentRole, logout } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const activeUser = authenticatedUser || userProfile;
  const isAuthenticated = Boolean(firebaseUser || activeUser || currentRole);

  const rawRole = activeUser?.role || currentRole || 'client';
  const effectiveRole = (rawRole === 'freelancer' ? 'symbiote' : rawRole) as 'client' | 'symbiote' | 'admin';

  const dashboardPath = `/${effectiveRole}/dashboard`;

  const roleMeta = {
    client: {
      name: 'Client',
      badgeClass: 'bg-[var(--color-info-blue)]/10 text-[var(--color-info-blue)] border-[var(--color-info-blue)]/20',
    },
    symbiote: {
      name: 'Symbiote',
      badgeClass: 'bg-[var(--color-success-green)]/10 text-[var(--color-success-green)] border-[var(--color-success-green)]/20',
    },
    admin: {
      name: 'Admin',
      badgeClass: 'bg-[var(--color-danger-red)]/10 text-[var(--color-danger-red)] border-[var(--color-danger-red)]/20',
    },
  }[effectiveRole];

  const displayName = activeUser?.displayName || firebaseUser?.displayName || activeUser?.email?.split('@')[0] || firebaseUser?.email?.split('@')[0] || 'User';
  const displayEmail = activeUser?.email || firebaseUser?.email || '';

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el =
        document.getElementById(sectionId) ||
        (sectionId === 'ai-engine' ? document.getElementById('ai-showcase') : null) ||
        (sectionId === 'ai-showcase' ? document.getElementById('ai-engine') : null);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `/#${sectionId}`);
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setShowSignOutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowSignOutConfirm(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[72px] bg-[var(--color-background)]/90 backdrop-blur-md border-b border-[var(--color-border)] transition-colors">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
        {/* Left: SyncSphere Logo */}
        <Link to="/" id="nav-logo" className="flex items-center gap-2 focus:outline-none flex-shrink-0">
          <SyncSphereLogo iconSize={30} textSize="lg" />
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden xl:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/about"
            id="nav-about"
            className={`transition-colors py-1 ${
              location.pathname === '/about'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            About Us
          </Link>
          <button
            type="button"
            id="nav-how-it-works"
            onClick={() => handleNavClick('how-it-works')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            How It Works
          </button>
          <button
            type="button"
            id="nav-features"
            onClick={() => handleNavClick('features')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            Features
          </button>
          <button
            type="button"
            id="nav-ai-engine"
            onClick={() => handleNavClick('ai-engine')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            AI Engine
          </button>
          <Link
            to="/help"
            id="nav-help"
            className={`transition-colors py-1 ${
              location.pathname === '/help'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Help Center
          </Link>
          <Link
            to="/contact"
            id="nav-contact"
            className={`transition-colors py-1 ${
              location.pathname === '/contact'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Contact
          </Link>
          <button
            type="button"
            id="nav-faq"
            onClick={() => handleNavClick('faq')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            FAQ
          </button>
        </div>

        {/* Tablet / Medium Screen Nav (Compact items) */}
        <div className="hidden md:flex xl:hidden items-center gap-4 text-sm font-medium">
          <Link
            to="/about"
            className={`transition-colors py-1 ${
              location.pathname === '/about'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            About
          </Link>
          <button
            type="button"
            onClick={() => handleNavClick('how-it-works')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('features')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('ai-engine')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            AI Engine
          </button>
          <Link
            to="/help"
            className={`transition-colors py-1 ${
              location.pathname === '/help'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Help
          </Link>
          <Link
            to="/contact"
            className={`transition-colors py-1 ${
              location.pathname === '/contact'
                ? 'text-[var(--color-accent-cyan)] font-semibold'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Contact
          </Link>
          <button
            type="button"
            onClick={() => handleNavClick('faq')}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer py-1"
          >
            FAQ
          </button>
        </div>

        {/* Right Action Buttons & Mobile Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {isAuthenticated ? (
            /* AUTHENTICATED STATE HEADER ACTIONS (Restored Clean 2-Button Layout) */
            <>
              <Button
                type="button"
                variant="text-link"
                size="sm"
                id="nav-logout-btn"
                onClick={handleLogout}
                className="text-sm font-semibold px-2.5 sm:px-3 inline-flex items-center gap-1.5 cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-danger-red)] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </Button>
              <Link to={dashboardPath} id="nav-dashboard-btn">
                <Button variant="primary" size="sm" className="font-semibold px-3.5 sm:px-4 text-xs sm:text-sm">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            /* GUEST STATE HEADER ACTIONS */
            <>
              <Link to="/login" id="nav-login-btn">
                <Button variant="text-link" size="sm" className="text-sm font-semibold px-2.5 sm:px-3">
                  Log In
                </Button>
              </Link>
              <Link to="/portal-select" id="nav-get-started-btn">
                <Button variant="primary" size="sm" className="font-semibold px-3.5 sm:px-4 text-xs sm:text-sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            id="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Authenticated User Banner on Mobile */}
          {isAuthenticated && (
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] font-bold text-xs flex items-center justify-center flex-shrink-0 border border-[var(--color-accent-cyan)]/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{displayName}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{displayEmail}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${roleMeta.badgeClass}`}>
                {roleMeta.name}
              </span>
            </div>
          )}

          {/* Main Navigation links */}
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-lg transition-colors ${
                location.pathname === '/about'
                  ? 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              About Us
            </Link>
            <button
              type="button"
              onClick={() => handleNavClick('how-it-works')}
              className="w-full text-left py-2 px-3 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('features')}
              className="w-full text-left py-2 px-3 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('ai-engine')}
              className="w-full text-left py-2 px-3 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              AI Engine
            </button>
            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-lg transition-colors ${
                location.pathname === '/help'
                  ? 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Help Center
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-lg transition-colors ${
                location.pathname === '/contact'
                  ? 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-semibold'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={() => handleNavClick('faq')}
              className="w-full text-left py-2 px-3 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action CTAs in Mobile Dropdown */}
          <div className="pt-2 border-t border-[var(--color-border)]/60 flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  id="mobile-nav-logout-btn"
                  onClick={handleLogout}
                  className="w-full justify-center font-medium gap-1.5 text-xs text-[var(--color-danger-red)] hover:bg-[var(--color-danger-red)]/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </Button>
                <Link
                  to={dashboardPath}
                  id="mobile-nav-dashboard-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="sm" className="w-full justify-center font-bold">
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  id="mobile-nav-login-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="secondary" size="sm" className="w-full justify-center font-medium">
                    Log In
                  </Button>
                </Link>
                <Link
                  to="/portal-select"
                  id="mobile-nav-get-started-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="sm" className="w-full justify-center font-bold">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIGN OUT CONFIRMATION MODAL */}
      <ConfirmDialog
        open={showSignOutConfirm}
        title="Are You Sure You Want To Sign Out"
        description="You will need to sign in again to access your active workspace, projects, and messages."
        confirmLabel="Sign Out"
        destructive={true}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />
    </header>
  );
};

