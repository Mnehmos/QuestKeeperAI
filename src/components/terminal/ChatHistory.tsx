import React, { useEffect, useCallback, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChatStore, Message } from '../../stores/chatStore';
import { ToolCallDisplay } from '../chat/ToolCallDisplay';
import { StreamingMessage, streamingStyles } from '../chat/StreamingMessage';
import { useAutoScroll } from '../../hooks';
import { getRandomTip } from '../../data/tips';
import { PLAYER_GUIDE, shouldShowPlayerGuide, incrementSessionCount } from '../../data/playerGuide';
import 'highlight.js/styles/atom-one-dark.css';

const EMPTY_MESSAGES: Message[] = [];

// Inject streaming styles
if (typeof document !== 'undefined') {
  const styleId = 'streaming-message-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = streamingStyles;
    document.head.appendChild(style);
  }
}

// Markdown component configuration - shared across renders
const markdownComponents = {
  code({ inline, className, children, ...props }: any) {
    return inline ? (
      <code
        className="bg-terminal-black/50 px-1 rounded text-terminal-amber"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold text-terminal-green mb-2 border-b border-terminal-green-dim pb-1">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-bold text-terminal-green mb-2">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-md font-bold text-terminal-green mb-1">
      {children}
    </h3>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-1 ml-2">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-1 ml-2">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-terminal-green">{children}</li>
  ),
  p: ({ children }: any) => <p className="mb-2">{children}</p>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-terminal-amber pl-4 italic opacity-80">
      {children}
    </blockquote>
  ),
  strong: ({ children }: any) => (
    <strong className="font-bold text-terminal-amber">
      {children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-terminal-cyan">{children}</em>
  ),
};

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ 
  msg, 
  renderMarkdown 
}: { 
  msg: Message; 
  renderMarkdown: (text: string) => React.ReactNode;
}) => {
  // Tool call rendering
  if (msg.isToolCall) {
    return (
      <ToolCallDisplay
        key={msg.id}
        toolName={msg.toolName || 'Unknown'}
        serverName={msg.serverName}
        arguments={msg.toolArguments || {}}
        response={msg.toolResponse}
        status={msg.toolStatus || 'pending'}
      />
    );
  }

  const isUser = msg.sender === 'user';
  const isSystem = msg.sender === 'system';
  const isAI = msg.sender === 'ai';
  const isStreaming = msg.partial === true;

  return (
    <div
      className={`p-2 max-w-[90%] ${
        isUser
          ? 'ml-auto text-right border-r-2 border-terminal-amber pr-4'
          : isSystem
          ? 'mx-auto text-center text-sm border-y border-terminal-green-dim py-2'
          : 'mr-auto border-l-2 border-terminal-green pl-4'
      }`}
    >
      <div
        className={`text-xs opacity-75 mb-1 uppercase tracking-widest ${
          isUser
            ? 'text-terminal-amber'
            : isSystem
            ? 'text-terminal-cyan'
            : 'text-terminal-green'
        }`}
      >
        {isUser ? 'USER_INPUT' : isAI ? 'SYSTEM_RESPONSE' : 'SYSTEM_NOTICE'}
      </div>
      <div
        className={`${
          isUser
            ? 'text-terminal-amber'
            : isSystem
            ? 'text-terminal-cyan'
            : 'text-terminal-green'
        }`}
      >
        {isAI ? (
          <StreamingMessage
            content={msg.content}
            isStreaming={isStreaming}
            renderMarkdown={renderMarkdown}
          />
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

// Session selector component
const SessionSelector = memo(() => {
  const sessions = useChatStore((state) => state.sessions);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const createSession = useChatStore((state) => state.createSession);
  const switchSession = useChatStore((state) => state.switchSession);
  const deleteSession = useChatStore((state) => state.deleteSession);
  const clearHistory = useChatStore((state) => state.clearHistory);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-green-dim bg-terminal-black/50">
      <span className="text-xs text-terminal-green/60 uppercase tracking-wider">Session:</span>
      <select
        value={currentSessionId || ''}
        onChange={(e) => switchSession(e.target.value)}
        className="flex-1 bg-black border border-terminal-green text-terminal-green text-sm px-2 py-1 rounded focus:outline-none focus:border-terminal-green-bright"
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.title} ({session.messages.length})
          </option>
        ))}
      </select>
      <button
        onClick={createSession}
        className="px-3 py-1 bg-terminal-green/10 border border-terminal-green text-terminal-green text-sm rounded hover:bg-terminal-green/20 transition-colors"
        title="New Chat"
      >
        ✨ New
      </button>
      <button
        onClick={clearHistory}
        className="px-3 py-1 bg-terminal-amber/10 border border-terminal-amber text-terminal-amber text-sm rounded hover:bg-terminal-amber/20 transition-colors"
        title="Clear Current Chat"
      >
        🗑️
      </button>
      {sessions.length > 1 && (
        <button
          onClick={() => currentSessionId && deleteSession(currentSessionId)}
          className="px-3 py-1 bg-red-900/20 border border-red-500 text-red-500 text-sm rounded hover:bg-red-900/30 transition-colors"
          title="Delete Current Session"
        >
          ❌
        </button>
      )}
    </div>
  );
});

SessionSelector.displayName = 'SessionSelector';

export const ChatHistory: React.FC = () => {
  // Get messages from the current session
  const messages = useChatStore((state) => {
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    return session ? session.messages : EMPTY_MESSAGES;
  });
  
  const currentSessionId = useChatStore((state) => state.currentSessionId);

  // Random tip for empty state (refreshes when session changes)
  const currentTip = useMemo(() => getRandomTip(), [currentSessionId]);
  
  // Check if this is a new player (first 100 sessions)
  const showPlayerGuide = useMemo(() => {
    if (messages.length === 0) {
      return shouldShowPlayerGuide();
    }
    return false;
  }, [messages.length]);
  
  // Track session creation for guide
  useEffect(() => {
    if (currentSessionId) {
      incrementSessionCount();
    }
  }, [currentSessionId]);

  // Smart auto-scroll that doesn't fight user scrolling
  const { containerRef, anchorRef, scrollToBottomIfNeeded } = useAutoScroll({
    threshold: 150,
    enabled: true,
  });

  // Scroll when messages change
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages, scrollToBottomIfNeeded]);

  // Memoized markdown renderer function for the SpoilerRenderer
  const renderMarkdown = useCallback(
    (text: string) => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    ),
    []
  );

  // Empty state when no messages
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-8">
      {showPlayerGuide ? (
        // Show player guide for new users
        <div className="max-w-2xl text-left bg-terminal-black/30 border border-terminal-green/30 rounded-lg p-6 overflow-y-auto max-h-[80vh]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {PLAYER_GUIDE}
          </ReactMarkdown>
        </div>
      ) : (
        // Show tip for returning users
        <>
          <div className="text-terminal-green/60 text-6xl">⚔️</div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-terminal-green">Ready for Adventure</h2>
            <p className="text-terminal-green/70 max-w-md">
              Tell the Dungeon Master what you'd like to do. Describe your character's actions, ask questions, or begin your quest!
            </p>
          </div>
          <div className="bg-terminal-black/50 border border-terminal-green/20 rounded-lg p-4 max-w-lg">
            <p className="text-terminal-amber text-sm">{currentTip}</p>
          </div>
          <div className="text-terminal-green/40 text-xs mt-4">
            Press <kbd className="px-2 py-1 bg-terminal-green/10 border border-terminal-green/30 rounded">Enter</kbd> to send • 
            <kbd className="px-2 py-1 bg-terminal-green/10 border border-terminal-green/30 rounded ml-1">Shift+Enter</kbd> for new line
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Chat Session Management Header */}
      <SessionSelector />

      {/* Messages Area - with CSS containment for performance */}
      <div
        ref={containerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 font-mono"
        style={{
          // CSS containment improves scroll performance
          contain: 'strict',
          // Smooth scrolling with GPU acceleration
          scrollBehavior: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} msg={msg} renderMarkdown={renderMarkdown} />
          ))
        )}
        
        {/* Scroll anchor - always at the bottom */}
        <div ref={anchorRef} className="h-px" />
      </div>
    </div>
  );
};
