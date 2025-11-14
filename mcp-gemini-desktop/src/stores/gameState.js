import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set, get) => ({
      // Character State
      character: null,
      setCharacter: (character) => set({ character }),

      // Inventory State
      inventory: [],
      addInventoryItem: (item) => set((state) => ({
        inventory: [...state.inventory, item]
      })),
      removeInventoryItem: (itemId) => set((state) => ({
        inventory: state.inventory.filter(i => i.id !== itemId)
      })),
      updateInventoryItem: (itemId, updates) => set((state) => ({
        inventory: state.inventory.map(i =>
          i.id === itemId ? { ...i, ...updates } : i
        )
      })),

      // Quest State
      quests: [],
      addQuest: (quest) => set((state) => ({
        quests: [...state.quests, quest]
      })),
      updateQuest: (questId, updates) => set((state) => ({
        quests: state.quests.map(q =>
          q.id === questId ? { ...q, ...updates } : q
        )
      })),
      completeQuest: (questId) => set((state) => ({
        quests: state.quests.map(q =>
          q.id === questId ? { ...q, status: 'completed' } : q
        )
      })),

      // Tool Output State (Roo Code pattern)
      toolOutputs: [],
      addToolOutput: (output) => set((state) => ({
        toolOutputs: [...state.toolOutputs, output]
      })),
      clearToolOutputs: () => set({ toolOutputs: [] }),

      // Combat State
      combatActive: false,
      combatParticipants: [],
      currentTurn: 0,
      startCombat: (participants) => set({
        combatActive: true,
        combatParticipants: participants,
        currentTurn: 0
      }),
      nextTurn: () => set((state) => ({
        currentTurn: (state.currentTurn + 1) % state.combatParticipants.length
      })),
      updateParticipant: (index, updates) => set((state) => ({
        combatParticipants: state.combatParticipants.map((p, i) =>
          i === index ? { ...p, ...updates } : p
        )
      })),
      endCombat: () => set({
        combatActive: false,
        combatParticipants: [],
        currentTurn: 0
      }),

      // ========================================
      // CONVERSATION MANAGEMENT (Phase 2)
      // ========================================

      // Conversation list (summaries)
      conversations: [],
      currentConversationId: null,
      currentMessages: [],
      conversationsLoading: false,
      conversationError: null,

      // Load conversations list
      loadConversations: async (characterId = null) => {
        set({ conversationsLoading: true, conversationError: null });
        try {
          const params = new URLSearchParams();
          if (characterId) params.append('character_id', characterId);

          const response = await fetch(`http://localhost:5001/api/conversations?${params}`);
          const data = await response.json();

          if (data.status === 'success') {
            set({
              conversations: data.conversations,
              conversationsLoading: false
            });
          } else {
            throw new Error(data.error || 'Failed to load conversations');
          }
        } catch (error) {
          console.error('Error loading conversations:', error);
          set({
            conversationError: error.message,
            conversationsLoading: false
          });
        }
      },

      // Switch to different conversation
      switchConversation: async (conversationId) => {
        // CRITICAL: Clear messages immediately to prevent showing stale data
        set({
          currentMessages: [],
          currentConversationId: null,
          conversationsLoading: true,
          conversationError: null
        });

        try {
          const response = await fetch(
            `http://localhost:5001/api/conversations/${conversationId}?include_messages=true&message_limit=100`
          );
          const data = await response.json();

          if (data.status === 'success') {
            console.log(`Switched to conversation ${conversationId}, loaded ${data.messages?.length || 0} messages`);
            set({
              currentConversationId: conversationId,
              currentMessages: data.messages || [],
              conversationsLoading: false
            });
          } else {
            throw new Error(data.error || 'Failed to load conversation');
          }
        } catch (error) {
          console.error('Error switching conversation:', error);
          set({
            conversationError: error.message,
            conversationsLoading: false,
            currentMessages: [] // Keep messages cleared on error
          });
        }
      },

      // Create new conversation
      createConversation: async (title = null, characterId = null) => {
        // CRITICAL: Clear messages when creating new conversation
        set({
          currentMessages: [],
          conversationsLoading: true,
          conversationError: null
        });

        try {
          const response = await fetch('http://localhost:5001/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title || `Chat ${new Date().toLocaleString()}`,
              character_id: characterId
            })
          });
          const data = await response.json();

          if (data.status === 'success') {
            console.log(`Created new conversation ${data.conversation.id}: ${data.conversation.title}`);
            // Add to list and switch to it with empty messages
            set((state) => ({
              conversations: [data.conversation, ...state.conversations],
              currentConversationId: data.conversation.id,
              currentMessages: [], // Ensure messages start empty
              conversationsLoading: false
            }));
            return data.conversation.id;
          } else {
            throw new Error(data.error || 'Failed to create conversation');
          }
        } catch (error) {
          console.error('Error creating conversation:', error);
          set({
            conversationError: error.message,
            conversationsLoading: false,
            currentMessages: [] // Keep messages cleared on error
          });
          return null;
        }
      },

      // Send message in current conversation
      sendMessage: async (message, provider = null, model = null) => {
        const { currentConversationId, character } = get();

        console.log(`Sending message to conversation: ${currentConversationId || '(creating new)'}`);

        // Optimistically add user message
        const userMsg = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        };
        set((state) => ({
          currentMessages: [...state.currentMessages, userMsg]
        }));

        try {
          const response = await fetch('http://localhost:5001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              conversation_id: currentConversationId,
              character_id: character?.id,
              provider,
              model
            })
          });

          const data = await response.json();

          if (data.status === 'success') {
            console.log(`Message sent successfully to conversation: ${data.conversation_id}`);

            // Replace temp user message and add assistant response
            const assistantMsg = {
              id: data.message_id,
              role: 'assistant',
              content: data.reply,
              timestamp: new Date().toISOString(),
              execution_ms: data.execution_ms,
              tool_calls: data.tool_calls
            };

            set((state) => ({
              currentMessages: [
                ...state.currentMessages.filter(m => m.id !== userMsg.id),
                { ...userMsg, id: data.message_id }, // Replace temp with real ID
                assistantMsg
              ],
              currentConversationId: data.conversation_id, // Update if new conversation created
            }));

            // Update conversation in list (update token count, last_modified)
            set((state) => ({
              conversations: state.conversations.map(conv =>
                conv.id === data.conversation_id
                  ? { ...conv, total_tokens: data.total_tokens, last_modified: new Date().toISOString() }
                  : conv
              )
            }));

            return data;
          } else {
            throw new Error(data.error || 'Failed to send message');
          }
        } catch (error) {
          console.error('Error sending message:', error);
          // Remove optimistic message on error
          set((state) => ({
            currentMessages: state.currentMessages.filter(m => m.id !== userMsg.id),
            conversationError: error.message
          }));
          throw error;
        }
      },

      // Delete conversation
      deleteConversation: async (conversationId) => {
        try {
          const response = await fetch(`http://localhost:5001/api/conversations/${conversationId}`, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.status === 'success') {
            set((state) => ({
              conversations: state.conversations.filter(c => c.id !== conversationId),
              currentConversationId: state.currentConversationId === conversationId ? null : state.currentConversationId,
              currentMessages: state.currentConversationId === conversationId ? [] : state.currentMessages
            }));
          } else {
            throw new Error(data.error || 'Failed to delete conversation');
          }
        } catch (error) {
          console.error('Error deleting conversation:', error);
          set({ conversationError: error.message });
          throw error;
        }
      },

      // Archive conversation
      archiveConversation: async (conversationId, archived = true) => {
        try {
          const response = await fetch(`http://localhost:5001/api/conversations/${conversationId}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived })
          });
          const data = await response.json();

          if (data.status === 'success') {
            set((state) => ({
              conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, archived } : c
              )
            }));
          } else {
            throw new Error(data.error || 'Failed to archive conversation');
          }
        } catch (error) {
          console.error('Error archiving conversation:', error);
          set({ conversationError: error.message });
          throw error;
        }
      },

      // Pin conversation
      pinConversation: async (conversationId, pinned = true) => {
        try {
          const response = await fetch(`http://localhost:5001/api/conversations/${conversationId}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned })
          });
          const data = await response.json();

          if (data.status === 'success') {
            set((state) => ({
              conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, pinned } : c
              )
            }));
          } else {
            throw new Error(data.error || 'Failed to pin conversation');
          }
        } catch (error) {
          console.error('Error pinning conversation:', error);
          set({ conversationError: error.message });
          throw error;
        }
      },

      // Update conversation title
      updateConversationTitle: async (conversationId, title) => {
        try {
          const response = await fetch(`http://localhost:5001/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
          });
          const data = await response.json();

          if (data.status === 'success') {
            set((state) => ({
              conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, title } : c
              )
            }));
          } else {
            throw new Error(data.error || 'Failed to update title');
          }
        } catch (error) {
          console.error('Error updating title:', error);
          set({ conversationError: error.message });
          throw error;
        }
      },

      // ========================================
      // LEGACY: Old single-conversation methods
      // (Kept for backward compatibility)
      // ========================================
      messages: [],
      addMessage: (message) => {
        console.warn('addMessage is deprecated, use sendMessage instead');
        set((state) => ({ messages: [...state.messages, message] }));
      },
      clearMessages: () => set({ messages: [], currentMessages: [] }),

      // MCP Server State
      servers: [],
      setServers: (servers) => set({ servers }),
      updateServer: (serverName, updates) => set((state) => ({
        servers: state.servers.map(s =>
          s.name === serverName ? { ...s, ...updates } : s
        )
      })),

      // Available Tools State
      availableTools: [],
      setAvailableTools: (tools) => set({ availableTools: tools })
    }),
    {
      name: 'quest-keeper-storage',
      getStorage: () => localStorage,
      partialize: (state) => ({
        character: state.character,
        inventory: state.inventory,
        quests: state.quests,
        currentConversationId: state.currentConversationId
        // NOTE: messages and currentMessages NOT persisted (loaded from backend)
        // Legacy messages kept in localStorage for migration only
      })
    }
  )
);
