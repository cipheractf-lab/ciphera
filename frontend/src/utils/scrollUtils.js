/**
 * Scroll Utilities
 * 
 * Collection of utility functions for handling scroll behavior
 * throughout the application.
 */

/**
 * Scrolls to the top of the page
 * @param {boolean} smooth - Whether to use smooth scrolling (default: true)
 */
export const scrollToTop = (smooth = true) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: (smooth && !prefersReducedMotion) ? 'smooth' : 'auto'
  });
};

/**
 * Scrolls to a specific element by ID
 * @param {string} elementId - The ID of the element to scroll to
 * @param {boolean} smooth - Whether to use smooth scrolling (default: true)
 * @param {number} offset - Offset from the top in pixels (default: 0)
 */
export const scrollToElement = (elementId, smooth = true, offset = 0) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID "${elementId}" not found`);
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elementPosition = element.offsetTop - offset;

  window.scrollTo({
    top: elementPosition,
    left: 0,
    behavior: (smooth && !prefersReducedMotion) ? 'smooth' : 'auto'
  });
};

/**
 * Scrolls to a specific position on the page
 * @param {number} position - The Y position to scroll to
 * @param {boolean} smooth - Whether to use smooth scrolling (default: true)
 */
export const scrollToPosition = (position, smooth = true) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  window.scrollTo({
    top: position,
    left: 0,
    behavior: (smooth && !prefersReducedMotion) ? 'smooth' : 'auto'
  });
};

/**
 * Gets the current scroll position
 * @returns {number} Current Y scroll position
 */
export const getCurrentScrollPosition = () => {
  return window.pageYOffset || document.documentElement.scrollTop;
};

/**
 * Checks if the user is at the top of the page
 * @param {number} threshold - Threshold in pixels (default: 0)
 * @returns {boolean} True if at the top
 */
export const isAtTop = (threshold = 0) => {
  return getCurrentScrollPosition() <= threshold;
};

/**
 * Checks if the user is at the bottom of the page
 * @param {number} threshold - Threshold in pixels (default: 0)
 * @returns {boolean} True if at the bottom
 */
export const isAtBottom = (threshold = 0) => {
  const scrollPosition = getCurrentScrollPosition();
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  
  return scrollPosition + windowHeight >= documentHeight - threshold;
};

/**
 * Adds smooth scroll behavior to anchor links
 * This function can be called to enhance existing anchor links
 */
export const enhanceAnchorLinks = () => {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      
      const targetElement = document.querySelector(href);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
};

/**
 * Hook for scroll position tracking
 * @param {function} callback - Callback function to call on scroll
 * @param {number} throttle - Throttle delay in milliseconds (default: 100)
 */
export const addScrollListener = (callback, throttle = 100) => {
  let timeoutId = null;
  
  const handleScroll = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback(getCurrentScrollPosition());
    }, throttle);
  };
  
  window.addEventListener('scroll', handleScroll);
  
  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    window.removeEventListener('scroll', handleScroll);
  };
};
