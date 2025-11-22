import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChatStore } from '../../stores/chatStore';
import { ToolCallDisplay } from '../chat/ToolCallDisplay';
import 'highlight.js/styles/atom-one-dark.css';

const EMPTY_MESSAGES: any[] = [];

export const ChatHistory: React.FC = () => {
  const messages = useChatStore((state) => {
    const session = state.sessions.find((s) => s.id === state.currentSessionId);
    return session ? session.messages : EMPTY_MESSAGES;
  });
  
  console.log('[ChatHistory] Render, messages count:', messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-grow overflow-y-auto p-4 space-y-4 font-mono">
      {messages.map((msg) => {
        // Render tool calls separately
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

        // Regular message rendering
        return (
          <div
            key={msg.id}
            className={`p-2 max-w-[90%] ${msg.sender === 'user'
                ? 'ml-auto text-right border-r-2 border-terminal-amber pr-4'
                : msg.sender === 'system'
                  ? 'mx-auto text-center text-sm border-y border-terminal-green-dim py-2'
                  : 'mr-auto border-l-2 border-terminal-green pl-4'
              }`}
          >
            <div
              className={`text-xs opacity-75 mb-1 uppercase tracking-widest ${msg.sender === 'user'
                  ? 'text-terminal-amber'
                  : msg.sender === 'system'
                    ? 'text-terminal-cyan'
                    : 'text-terminal-green'
                }`}
            >
              {msg.sender === 'user'
                ? 'USER_INPUT'
                : msg.sender === 'ai'
                  ? 'SYSTEM_RESPONSE'
                  : 'SYSTEM_NOTICE'}
            </div>
            <div
              className={`${msg.sender === 'user'
                  ? 'text-terminal-amber'
                  : msg.sender === 'system'
                    ? 'text-terminal-cyan'
                    : 'text-terminal-green'
                }`}
            >
              {msg.sender === 'ai' ? (
                <div className="markdown-content prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
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
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
