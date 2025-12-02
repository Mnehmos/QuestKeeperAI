import { useState, useRef, useCallback, useEffect } from 'react';

interface UseStreamingTextOptions {
  /** How often to flush accumulated text to state (ms) */
  flushInterval?: number;
  /** Callback when streaming completes */
  onComplete?: (finalText: string) => void;
}

interface UseStreamingTextReturn {
  /** The current displayed text */
  displayText: string;
  /** Whether streaming is active */
  isStreaming: boolean;
  /** Append a chunk of text (call this from onChunk) */
  appendChunk: (chunk: string) => void;
  /** Start a new stream (resets state) */
  startStream: () => void;
  /** End the stream and flush any remaining text */
  endStream: () => void;
  /** Reset to empty state */
  reset: () => void;
}

/**
 * A hook that batches streaming text updates to reduce re-renders.
 * Instead of updating state on every character, it buffers chunks
 * and flushes them at regular intervals using requestAnimationFrame.
 */
export function useStreamingText(options: UseStreamingTextOptions = {}): UseStreamingTextReturn {
  const { flushInterval = 32, onComplete } = options; // ~30fps default
  
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Use refs to avoid stale closures and unnecessary re-renders
  const bufferRef = useRef('');
  const fullTextRef = useRef('');
  const rafIdRef = useRef<number | null>(null);
  const lastFlushRef = useRef(0);
  const isStreamingRef = useRef(false);

  // Flush buffer to display state using requestAnimationFrame
  const flush = useCallback(() => {
    if (bufferRef.current) {
      fullTextRef.current += bufferRef.current;
      bufferRef.current = '';
      setDisplayText(fullTextRef.current);
    }
    lastFlushRef.current = performance.now();
  }, []);

  // Schedule a flush if enough time has passed
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current !== null) return; // Already scheduled
    
    const elapsed = performance.now() - lastFlushRef.current;
    
    if (elapsed >= flushInterval) {
      // Enough time passed, flush immediately on next frame
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        flush();
      });
    } else {
      // Schedule for later
      const delay = flushInterval - elapsed;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setTimeout(() => {
          if (isStreamingRef.current || bufferRef.current) {
            flush();
          }
        }, delay);
      });
    }
  }, [flush, flushInterval]);

  const appendChunk = useCallback((chunk: string) => {
    bufferRef.current += chunk;
    scheduleFlush();
  }, [scheduleFlush]);

  const startStream = useCallback(() => {
    // Cancel any pending flush
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    bufferRef.current = '';
    fullTextRef.current = '';
    lastFlushRef.current = performance.now();
    isStreamingRef.current = true;
    
    setDisplayText('');
    setIsStreaming(true);
  }, []);

  const endStream = useCallback(() => {
    isStreamingRef.current = false;
    
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Final flush with any remaining buffer
    if (bufferRef.current) {
      fullTextRef.current += bufferRef.current;
      bufferRef.current = '';
    }
    
    const finalText = fullTextRef.current;
    setDisplayText(finalText);
    setIsStreaming(false);
    
    onComplete?.(finalText);
  }, [onComplete]);

  const reset = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    bufferRef.current = '';
    fullTextRef.current = '';
    isStreamingRef.current = false;
    setDisplayText('');
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    displayText,
    isStreaming,
    appendChunk,
    startStream,
    endStream,
    reset,
  };
}
