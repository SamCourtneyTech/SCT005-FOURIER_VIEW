import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to optimize performance for large datasets by implementing
 * virtual scrolling and throttled updates
 */
export function usePerformanceOptimization(
  totalItems: number,
  itemWidth: number = 300, // width including gap
  containerRef: React.RefObject<HTMLElement>
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Calculate visible items based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const scrollLeft = containerRef.current.scrollLeft;
    
    // Calculate which items are visible with buffer
    const visibleStart = Math.floor(scrollLeft / itemWidth);
    const visibleEnd = Math.ceil((scrollLeft + containerWidth) / itemWidth);
    
    // Add buffer items before and after visible range
    const bufferSize = 10;
    const start = Math.max(0, visibleStart - bufferSize);
    const end = Math.min(totalItems, visibleEnd + bufferSize);
    
    setVisibleRange({ start, end });
    setScrollPosition(scrollLeft);
  }, [totalItems, itemWidth, containerRef]);
  
  // Throttled scroll handler to avoid excessive updates
  useEffect(() => {
    if (!containerRef.current) return;
    
    let timeoutId: number;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(updateVisibleRange, 16); // ~60fps
    };
    
    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial calculation
    updateVisibleRange();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [updateVisibleRange]);
  
  // Calculate total width for proper scrollbar sizing
  const totalWidth = totalItems * itemWidth;
  
  return {
    visibleRange,
    scrollPosition,
    totalWidth,
    shouldRenderItem: (index: number) => 
      index >= visibleRange.start && index < visibleRange.end
  };
}