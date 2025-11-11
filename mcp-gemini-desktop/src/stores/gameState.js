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

      // Chat History State
      messages: [],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
      })),
      clearMessages: () => set({ messages: [] }),

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
        messages: state.messages
      })
    }
  )
);
