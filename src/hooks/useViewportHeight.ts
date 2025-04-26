import { useEffect } from 'react';

/**
 * Custom Hook for monitoring window size changes and setting viewport height variables
 * Solves the issue of bottom toolbar overlapping content in mobile Safari
 */
export function useViewportHeight() {
  useEffect(() => {
    // Set viewport height variable
    const setViewportHeight = () => {
      // Get actual visible viewport height
      const vh = window.innerHeight * 0.01;
      // Set CSS variable --vh
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initial setup
    setViewportHeight();

    // Listen for window resize events
    window.addEventListener('resize', setViewportHeight);
    
    // Listen for device orientation changes
    window.addEventListener('orientationchange', setViewportHeight);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);
}