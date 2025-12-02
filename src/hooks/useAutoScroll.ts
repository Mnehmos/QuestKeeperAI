import { useRef, useCallback, useEffect } from 'react';

interface UseAutoScrollOptions {
  /** Threshold in pixels - if user is within this distance of bottom, auto-scroll continues */
  threshold?: number;
  /** Whether auto-scroll is enabled */
  enabled?: boolean;
}

interface UseAutoScrollReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to attach to the scroll anchor element at the bottom */
  anchorRef: React.RefObject<HTMLDivElement | null>;
  /** Call this when new content is added to trigger scroll check */
  scrollToBottomIfNeeded: () => void;
  /** Force scroll to bottom regardless of position */
  scrollToBottom: () => void;
  /** Check if user is currently near the bottom */
  isNearBottom: () => boolean;
}

/**
 * Smart auto-scroll hook that only scrolls when the user is already near the bottom.
 * This prevents the annoying "fighting" behavior when users try to scroll up while
 * new content is being added.
 */
export function useAutoScroll(options: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const { threshold = 100, enabled = true } = options;
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const rafIdRef = useRef<number | null>(null);

  const isNearBottom = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    
    // Cancel any pending scroll
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Use requestAnimationFrame for smooth scrolling that doesn't fight layout
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      anchor.scrollIntoView({ behavior: 'instant', block: 'end' });
    });
  }, []);

  const scrollToBottomIfNeeded = useCallback(() => {
    if (!enabled) return;
    
    // Check if we should scroll
    if (wasAtBottomRef.current || isNearBottom()) {
      scrollToBottom();
      wasAtBottomRef.current = true;
    }
  }, [enabled, isNearBottom, scrollToBottom]);

  // Track scroll position to update wasAtBottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      wasAtBottomRef.current = isNearBottom();
    };

    // Use passive listener for better scroll performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isNearBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    anchorRef,
    scrollToBottomIfNeeded,
    scrollToBottom,
    isNearBottom,
  };
}
