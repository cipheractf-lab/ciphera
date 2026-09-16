import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 *
 * This component automatically scrolls the page to the top whenever the route changes.
 * It's essential for good UX as it ensures users always start at the top of a new page
 * instead of maintaining the scroll position from the previous page.
 *
 * Features:
 * - Scrolls to top on route change
 * - Handles hash/anchor links properly
 * - Smooth scrolling behavior
 * - Respects user's reduced motion preferences
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // If there's a hash, try to scroll to that element
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
        return;
      }
    }

    // Otherwise, scroll to top
    // Use both methods for maximum browser compatibility (especially Firefox)
    // Immediate scroll for Firefox
    window.scrollTo(0, 0);
    
    // Then smooth scroll for browsers that support it
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'instant'
      });
      
      // Force document scroll as well
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [pathname, hash]);

  // This component doesn't render anything
  return null;
}

export default ScrollToTop;
