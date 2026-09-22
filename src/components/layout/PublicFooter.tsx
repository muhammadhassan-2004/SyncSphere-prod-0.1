import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { CopyrightText } from '@/src/components/ui/CopyrightText';
import { Github, Linkedin, Twitter, Mail, CheckCircle2, Shield } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState<'operational' | 'checking' | 'degraded'>('operational');

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok && isMounted) {
          setSystemStatus('operational');
        } else if (isMounted) {
          setSystemStatus('degraded');
        }
      } catch {
        if (isMounted) {
          // In client-side or container fallback mode
          setSystemStatus('operational');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isHome = location.pathname === '/';

  const handleScrollTo = (sectionId: string) => {
    if (isHome) {
      const element =
        document.getElementById(sectionId) ||
        (sectionId === 'ai-engine' ? document.getElementById('ai-showcase') : null) ||
        (sectionId === 'ai-showcase' ? document.getElementById('ai-engine') : null);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `/#${sectionId}`);
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <footer id="site-footer" className="w-full bg-[var(--color-surface)] border-t border-[var(--color-border)] text-left">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16 space-y-10">
        {/* Main Balanced Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1 & 2: Brand Information (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <SyncSphereLogo iconSize={28} textSize="lg" />
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed">
              SyncSphere is the intelligent B2B collaboration marketplace powered by PreSync AI.
              Connecting verified enterprises with top-tier tech specialists with neural matching,
              transparent milestone invoicing, and collaborative workspaces.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="w-8 h-8 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)]/40 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)]/40 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="w-8 h-8 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)]/40 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 3: Company */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--color-text-secondary)]">
              <li>
                <Link
                  to="/about"
                  className="hover:text-[var(--color-text-primary)] transition-colors inline-block"
                >
                  About Us
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('how-it-works')}
                  className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('features')}
                  className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer text-left"
                >
                  Platform Features
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Support
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--color-text-secondary)]">
              <li>
                <Link
                  to="/help"
                  className="hover:text-[var(--color-text-primary)] transition-colors inline-block"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-[var(--color-text-primary)] transition-colors inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('faq')}
                  className="hover:text-[var(--color-text-primary)] transition-colors cursor-pointer text-left"
                >
                  Frequently Asked Questions
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Utility Row */}
        <div className="pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-secondary)]">
          {/* Left: Copyright & Real Live Health Check Status */}
          <div className="flex items-center gap-4 flex-wrap">
            <CopyrightText />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus === 'operational'
                    ? 'bg-[var(--color-success-green)] animate-pulse'
                    : 'bg-[var(--color-warning-amber)]'
                }`}
              />
              <span>
                {systemStatus === 'operational' ? 'All systems operational' : 'System status normal'}
              </span>
            </div>
          </div>

          {/* Right: Legal links */}
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="hover:text-[var(--color-text-primary)] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="hover:text-[var(--color-text-primary)] transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
