import { create } from 'zustand';
import { dnd5eItems } from '../data/dnd5eItems';
import { parseMcpResponse, executeBatchToolCalls, debounce } from '../utils/mcpUtils';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type: string;
  weight?: number;
  value?: number;
  equipped?: boolean;
}

export interface EnvironmentState {
  time_of_day?: string | any;
  weather?: string | any;
  temperature?: string | any;
  season?: string | any;
  date?: string | any;
  moon_phase?: string | any;
  lighting?: string | any;
  sunrise?: string | any;
  sunset?: string | any;
  forecast?: string | any;
  wind?: string | any;
  visibility?: string | any;
  atmospheric_pressure?: string | any;
  hazards?: string[];
  [key: string]: any;
}

export interface WorldState {
  location: string;
  time: string;
  weather: string;
  date: string;
  environment?: EnvironmentState;
  npcs?: { [key: string]: any };
  events?: { [key: string]: any };
  lastUpdated?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  author: 'player' | 'ai';
  timestamp: number;
}

export interface CharacterStats {
  id?: string;
  name: string;
  level: number;
  class: string;
  hp: { current: number; max: number };
  xp: { current: number; max: number };
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  equipment: {
    armor: string;
    weapons: string[];
    other: string[];
  };
}

interface GameState {
  inventory: InventoryItem[];
  world: WorldState;
  notes: Note[];
  activeCharacter: CharacterStats | null;
  party: CharacterStats[];
  isSyncing: boolean;
  lastSyncTime: number;

  setInventory: (items: InventoryItem[]) => void;
  setWorldState: (state: WorldState) => void;
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setActiveCharacter: (char: CharacterStats | null) => void;
  syncState: () => Promise<void>;
}

/**
 * Parse rpg-mcp character JSON into CharacterStats format
 */
function parseCharacterFromJson(char: any): CharacterStats | null {
  try {
    if (!char || !char.name) return null;

    const level = char.level || 1;
    const xpForNextLevel = level * 1000;

    return {
      id: char.id,
      name: char.name,
      level: level,
      class: char.class || 'Adventurer',
      hp: {
        current: char.hp || 0,
        max: char.maxHp || char.hp || 0
      },
      xp: {
        current: char.experience || 0,
        max: xpForNextLevel
      },
      stats: {
        str: char.stats?.str || 10,
        dex: char.stats?.dex || 10,
        con: char.stats?.con || 10,
        int: char.stats?.int || 10,
        wis: char.stats?.wis || 10,
        cha: char.stats?.cha || 10
      },
      equipment: {
        armor: 'None',
        weapons: [],
        other: []
      }
    };
  } catch (error) {
    console.error('[parseCharacterFromJson] Failed to parse character:', error);
    return null;
  }
}

/**
 * Parse inventory data from rpg-mcp response
 */
function parseInventoryFromJson(inventoryData: any): InventoryItem[] {
  const items: InventoryItem[] = [];
  
  if (!inventoryData?.items || !Array.isArray(inventoryData.items)) {
    return items;
  }

  inventoryData.items.forEach((item: any, index: number) => {
    // Look up item details in reference database
    const itemName = item.name || item.itemId || '';
    const refItemKey = Object.keys(dnd5eItems).find(
      k => k.toLowerCase() === itemName.toLowerCase()
    );
    const refItem = refItemKey ? dnd5eItems[refItemKey] : null;

    items.push({
      id: item.id || item.itemId || `item-${index}`,
      name: refItem?.name || itemName || 'Unknown Item',
      description: refItem?.description || item.description || '',
      quantity: item.quantity || 1,
      type: refItem?.type || item.type || 'misc',
      weight: refItem?.weight || item.weight,
      value: refItem ? parseFloat(refItem.value?.replace(/[^0-9.]/g, '') || '0') : item.value,
      equipped: item.equipped || false
    });
  });

  return items;
}

/**
 * Parse quest data from rpg-mcp response into notes
 */
function parseQuestsToNotes(questData: any): Note[] {
  const notes: Note[] = [];

  if (!questData) return notes;

  // Handle activeQuests array
  const activeQuests = questData.activeQuests || questData.quests || [];
  
  if (Array.isArray(activeQuests)) {
    activeQuests.forEach((quest: any, index: number) => {
      if (typeof quest === 'string') {
        // Just a quest ID/name
        notes.push({
          id: `quest-${quest}`,
          title: `Quest: ${quest}`,
          content: `Active quest: ${quest}`,
          author: 'ai',
          timestamp: Date.now()
        });
      } else if (quest && typeof quest === 'object') {
        // Full quest object
        notes.push({
          id: `quest-${quest.id || index}`,
          title: quest.name || quest.title || 'Quest',
          content: `${quest.description || ''}\n\nStatus: ${quest.status || 'Active'}`,
          author: 'ai',
          timestamp: Date.now()
        });
      }
    });
  }

  return notes;
}

export const useGameStateStore = create<GameState>((set, get) => ({
  inventory: [],
  world: {
    time: 'Unknown',
    location: 'Unknown',
    weather: 'Unknown',
    date: 'Unknown',
    environment: {},
    npcs: {},
    events: {}
  },
  notes: [],
  activeCharacter: null,
  party: [],
  isSyncing: false,
  lastSyncTime: 0,

  setInventory: (items) => set({ inventory: items }),
  setWorldState: (state) => set({ world: state }),
  setNotes: (notes) => set({ notes }),
  setActiveCharacter: (char) => set({ activeCharacter: char }),

  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes]
  })),

  updateNote: (id, content) => set((state) => ({
    notes: state.notes.map(n => n.id === id ? { ...n, content, timestamp: Date.now() } : n)
  })),

  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  })),

  syncState: async () => {
    const { isSyncing, lastSyncTime } = get();
    
    // Prevent concurrent syncs and rate limit to max once per 2 seconds
    if (isSyncing) {
      console.log('[GameStateStore] Sync already in progress, skipping');
      return;
    }
    
    const now = Date.now();
    if (now - lastSyncTime < 2000) {
      console.log('[GameStateStore] Rate limited, skipping sync');
      return;
    }

    set({ isSyncing: true, lastSyncTime: now });

    try {
      const { mcpManager } = await import('../services/mcpClient');

      // Active character ID (string UUID in rpg-mcp)
      let activeCharId: string | null = null;

      // ============================================
      // 1. Fetch Characters from rpg-mcp
      // ============================================
      try {
        console.log('[GameStateStore] Listing characters...');

        const listResult = await mcpManager.gameStateClient.callTool('list_characters', {});
        console.log('[GameStateStore] Raw list_characters result:', listResult);

        // Parse using utility - handles both MCP wrapper and direct JSON
        const listData = parseMcpResponse<{ characters: any[]; count: number }>(
          listResult, 
          { characters: [], count: 0 }
        );
        
        console.log('[GameStateStore] Parsed characters data:', listData);
        console.log('[GameStateStore] Found', listData.count || listData.characters?.length || 0, 'characters');

        const characters = listData.characters || [];

        if (characters.length > 0) {
          // Parse all characters
          const allCharacters: CharacterStats[] = [];
          
          for (const char of characters) {
            const charData = parseCharacterFromJson(char);
            if (charData) {
              allCharacters.push(charData);
            }
          }

          console.log('[GameStateStore] Loaded', allCharacters.length, 'valid characters');

          if (allCharacters.length > 0) {
            // Use existing active character if still valid, otherwise use first
            const currentActive = get().activeCharacter;
            const stillExists = currentActive?.id && allCharacters.find(c => c.id === currentActive.id);
            
            const newActive = stillExists ? currentActive : allCharacters[0];
            
            set({
              activeCharacter: newActive,
              party: allCharacters
            });
            activeCharId = newActive?.id || null;
          }
        } else {
          console.log('[GameStateStore] No characters found in database');
        }
      } catch (e) {
        console.warn('[GameStateStore] Failed to fetch character list:', e);
      }

      // If we don't have an active character ID, we can't fetch inventory or quests
      if (!activeCharId) {
        console.log('[GameStateStore] No active character ID, skipping inventory/quest sync');
        set({ isSyncing: false });
        return;
      }

      console.log('[GameStateStore] Syncing data for character ID:', activeCharId);

      // ============================================
      // 2. Batch fetch inventory and quests in parallel
      // ============================================
      const batchResults = await executeBatchToolCalls(mcpManager.gameStateClient, [
        { name: 'get_inventory', args: { characterId: activeCharId } },
        { name: 'get_quest_log', args: { characterId: activeCharId } }
      ]);

      // Process inventory result
      const inventoryResult = batchResults.find(r => r.name === 'get_inventory');
      if (inventoryResult && !inventoryResult.error) {
        const inventoryData = parseMcpResponse<any>(inventoryResult.result, null);
        
        if (inventoryData) {
          const items = parseInventoryFromJson(inventoryData);
          console.log('[GameStateStore] Parsed', items.length, 'inventory items');
          
          set((state) => {
            // Update equipment from inventory if available
            let newActiveCharacter = state.activeCharacter;
            
            if (newActiveCharacter && inventoryData.equipment) {
              const equipment = inventoryData.equipment;
              newActiveCharacter = {
                ...newActiveCharacter,
                equipment: {
                  armor: equipment.armor || 'None',
                  weapons: [equipment.mainhand, equipment.offhand].filter(Boolean),
                  other: [equipment.head, equipment.feet, equipment.accessory].filter(Boolean)
                }
              };
            }
            
            return {
              inventory: items,
              activeCharacter: newActiveCharacter
            };
          });
        }
      } else if (inventoryResult?.error) {
        console.warn('[GameStateStore] Inventory fetch error:', inventoryResult.error);
      }

      // Process quest result
      const questResult = batchResults.find(r => r.name === 'get_quest_log');
      if (questResult && !questResult.error) {
        const questData = parseMcpResponse<any>(questResult.result, null);
        
        if (questData) {
          const questNotes = parseQuestsToNotes(questData);
          console.log('[GameStateStore] Parsed', questNotes.length, 'quest notes');
          
          if (questNotes.length > 0) {
            set({ notes: questNotes });
          }
        }
      } else if (questResult?.error) {
        console.warn('[GameStateStore] Quest fetch error:', questResult.error);
      }

      console.log('[GameStateStore] Sync complete');

    } catch (error) {
      console.error('[GameStateStore] Error syncing game state:', error);
    } finally {
      set({ isSyncing: false });
    }
  }
}));

// Export debounced sync for use in components
export const debouncedSyncState = debounce(() => {
  useGameStateStore.getState().syncState();
}, 1000);
