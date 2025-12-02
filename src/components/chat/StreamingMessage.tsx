import React, { memo } from 'react';
import { SpoilerRenderer } from './Spoiler';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  renderMarkdown: (text: string) => React.ReactNode;
}

// Lightweight streaming text display - no markdown parsing during stream
const StreamingText = memo(({ content }: { content: string }) => {
  return (
    <div className="streaming-text whitespace-pre-wrap">
      {content}
      <span className="streaming-cursor">▌</span>
    </div>
  );
});

StreamingText.displayName = 'StreamingText';

// Full markdown rendering - only used when stream is complete
const CompleteMarkdown = memo(({ 
  content, 
  renderMarkdown 
}: { 
  content: string; 
  renderMarkdown: (text: string) => React.ReactNode;
}) => {
  return (
    <div className="markdown-content prose prose-invert prose-sm max-w-none">
      <SpoilerRenderer content={content} renderMarkdown={renderMarkdown} />
    </div>
  );
});

CompleteMarkdown.displayName = 'CompleteMarkdown';

/**
 * Optimized streaming message component.
 * 
 * During streaming: Shows raw text with cursor (no markdown parsing)
 * After complete: Renders full markdown with syntax highlighting
 * 
 * This prevents expensive markdown re-parsing on every character update.
 */
export const StreamingMessage = memo(({ 
  content, 
  isStreaming, 
  renderMarkdown 
}: StreamingMessageProps) => {
  // Only compute markdown when streaming is complete
  if (isStreaming) {
    return <StreamingText content={content} />;
  }
  
  return <CompleteMarkdown content={content} renderMarkdown={renderMarkdown} />;
});

StreamingMessage.displayName = 'StreamingMessage';

// CSS for the streaming cursor animation
export const streamingStyles = `
  .streaming-cursor {
    animation: blink 0.7s infinite;
    color: var(--terminal-green, #00ff41);
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .streaming-text {
    font-family: inherit;
    line-height: 1.6;
    /* Prevent layout shifts during streaming */
    contain: content;
    /* Smooth text appearance */
    will-change: contents;
  }
`;
