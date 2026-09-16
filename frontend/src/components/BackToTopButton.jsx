import React, { useState, useEffect } from 'react';
import { scrollToTop, addScrollListener } from '../utils/scrollUtils';
import './BackToTopButton.css';

/**
 * BackToTopButton Component
 *
 * A floating button that appears when the user scrolls down and allows
 * them to quickly return to the top of the page with smooth scrolling.
 */
function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Handle scroll to top
  const handleScrollToTop = () => {
    scrollToTop(true);
  };

  useEffect(() => {
    // Use our scroll utility for better performance
    const cleanup = addScrollListener((scrollPosition) => {
      setIsVisible(scrollPosition > 300);
    }, 100);

    // Cleanup
    return cleanup;
  }, []);

  return (
    <>
      {isVisible && (
        <button
          className="back-to-top-button"
          onClick={handleScrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 19V5M5 12L12 5L19 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </>
  );
}

export default BackToTopButton;
