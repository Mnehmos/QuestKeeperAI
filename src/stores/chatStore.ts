import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MessageSender = 'user' | 'ai' | 'system';
export type MessageType = 'text' | 'error' | 'info' | 'success';

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: number;
  type?: MessageType;
  metadata?: Record<string, any>;
  partial?: boolean; // Flag for streaming messages
  isEvent?: boolean; // Flag for autonomous system events

  // Tool call fields
  isToolCall?: boolean;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: Record<string, any>;
  toolResponse?: string;
  toolStatus?: 'pending' | 'completed' | 'error';
  serverName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isTyping: boolean;
  streamingMessageId: string | null;
  prefillInput: string | null; // Text to prefill into chat input from HUD

  // Session Management
  createSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;

  // Message Management (operates on current session)
  addMessage: (message: Message) => void;
  clearHistory: () => void; // Clears current session history
  setTyping: (isTyping: boolean) => void;

  // Input prefill from HUD components
  setPrefillInput: (text: string | null) => void;

  // Streaming support methods - optimized for batched updates
  startStreamingMessage: (id: string, sender: MessageSender) => void;
  updateStreamingMessage: (id: string, content?: string, toolCall?: { id: string; name: string; arguments: Record<string, any> }) => void;
  updateToolStatus: (id: string, status: 'pending' | 'completed' | 'error', response?: string) => void;
  finalizeStreamingMessage: (id: string) => void;
  
  // Computed
  getCurrentSession: () => ChatSession | undefined;
  getMessages: () => Message[];
}

// Batching utilities for streaming updates
let pendingUpdate: { id: string; content: string } | null = null;
let rafId: number | null = null;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isTyping: false,
      streamingMessageId: null,
      prefillInput: null,

      createSession: () => {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }));
        return newSession.id;
      },

      switchSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);
          // If we deleted the current session, switch to the first one or null
          let newCurrentId = state.currentSessionId;
          if (state.currentSessionId === sessionId) {
            newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title } : s
          ),
        }));
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId);
      },

      getMessages: () => {
        const session = get().getCurrentSession();
        return session ? session.messages : [];
      },

      addMessage: (message) =>
        set((state) => {
          // If no session exists, create one
          let sessions = state.sessions;
          let currentSessionId = state.currentSessionId;

          if (!currentSessionId || sessions.length === 0) {
            const newSession: ChatSession = {
              id: Date.now().toString(),
              title: 'New Chat',
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            sessions = [newSession, ...sessions];
            currentSessionId = newSession.id;
          }

          return {
            sessions: sessions.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: [...s.messages, message],
                    updatedAt: Date.now(),
                    // Auto-update title for first user message
                    title:
                      s.messages.length === 0 && message.sender === 'user'
                        ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                        : s.title,
                  }
                : s
            ),
            currentSessionId,
          };
        }),

      clearHistory: () =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === state.currentSessionId ? { ...s, messages: [] } : s
          ),
          streamingMessageId: null,
        })),

      setTyping: (isTyping) => set({ isTyping }),

      setPrefillInput: (text) => set({ prefillInput: text }),

      startStreamingMessage: (id, sender) =>
        set((state) => {
          // Ensure session exists (similar logic to addMessage)
          let sessions = state.sessions;
          let currentSessionId = state.currentSessionId;
          
          if (!currentSessionId || sessions.length === 0) {
            // Should have been created by user message, but just in case
            return state; 
          }

          // Clear any pending batched updates
          pendingUpdate = null;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }

          return {
            streamingMessageId: id,
            sessions: sessions.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        id,
                        sender,
                        content: '',
                        timestamp: Date.now(),
                        type: 'text',
                        partial: true,
                      },
                    ],
                  }
                : s
            ),
          };
        }),

      // Optimized streaming update - batches content updates to reduce re-renders
      updateStreamingMessage: (id, content, toolCall) => {
        // For tool calls, update immediately
        if (toolCall) {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === state.currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((msg) =>
                      msg.id === id
                        ? {
                            ...msg,
                            isToolCall: true,
                            toolCallId: toolCall.id,
                            toolName: toolCall.name,
                            toolArguments: toolCall.arguments,
                            toolStatus: 'pending',
                            serverName: 'rpg-mcp-server',
                          }
                        : msg
                    ),
                  }
                : s
            ),
          }));
          return;
        }

        // For content updates, batch using RAF
        if (content !== undefined) {
          pendingUpdate = { id, content };
          
          if (rafId === null) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              const update = pendingUpdate;
              pendingUpdate = null;
              
              if (update) {
                set((state) => ({
                  sessions: state.sessions.map((s) =>
                    s.id === state.currentSessionId
                      ? {
                          ...s,
                          messages: s.messages.map((msg) =>
                            msg.id === update.id
                              ? { ...msg, content: update.content }
                              : msg
                          ),
                        }
                      : s
                  ),
                }));
              }
            });
          }
        }
      },

      updateToolStatus: (id, status, response) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === state.currentSessionId
              ? {
                  ...s,
                  messages: s.messages.map((msg) =>
                    msg.id === id
                      ? {
                          ...msg,
                          toolStatus: status,
                          toolResponse: response,
                        }
                      : msg
                  ),
                }
              : s
          ),
        })),

      finalizeStreamingMessage: (id) => {
        // Flush any pending updates before finalizing
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        
        // Apply any pending content
        const update = pendingUpdate;
        pendingUpdate = null;

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === state.currentSessionId
              ? {
                  ...s,
                  messages: s.messages.map((msg) =>
                    msg.id === id
                      ? { 
                          ...msg, 
                          partial: false,
                          // Apply pending content if any
                          ...(update && update.id === id ? { content: update.content } : {})
                        }
                      : msg
                  ),
                }
              : s
          ),
          streamingMessageId: null,
        }));
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
