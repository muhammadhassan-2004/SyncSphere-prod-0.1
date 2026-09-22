import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures:
 * 1. Every route navigation (without a hash) instantly scrolls to the top (0, 0) of the target page.
 * 2. Anchor navigations (with a hash, e.g. #how-it-works, #features, #ai-engine, #faq) smoothly scroll to the designated section,
 *    both when navigated from within the same page or from an external sub-page.
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);

  useEffect(() => {
    const hash = location.hash ? location.hash.replace(/^#/, '') : '';

    if (hash) {
      // Helper to find target element, including section aliases
      const getTargetElement = () => {
        let el = document.getElementById(hash);
        if (!el && hash === 'ai-engine') {
          el = document.getElementById('ai-showcase');
        } else if (!el && hash === 'ai-showcase') {
          el = document.getElementById('ai-engine');
        }
        return el;
      };

      const scrollToTarget = () => {
        const target = getTargetElement();
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      // Try scrolling immediately
      if (!scrollToTarget()) {
        // If the page is still mounting or rendering, retry after frame/timeout
        const timer1 = setTimeout(() => {
          if (!scrollToTarget()) {
            const timer2 = setTimeout(scrollToTarget, 200);
            return () => clearTimeout(timer2);
          }
        }, 80);

        return () => clearTimeout(timer1);
      }
    } else {
      // Standard page navigation: Always reset scroll position to the very top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }

    prevPathRef.current = location.pathname;
  }, [location.pathname, location.hash]);

  return null;
};
