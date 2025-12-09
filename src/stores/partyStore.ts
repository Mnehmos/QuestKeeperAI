import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseMcpResponse, debounce } from '../utils/mcpUtils';
import type { CharacterCondition } from './gameStateStore'; // Type-only import to avoid cycles

// ============================================
// Types
// ============================================

export type PartyStatus = 'active' | 'dormant' | 'archived';
export type MemberRole = 'leader' | 'member' | 'companion' | 'hireling' | 'prisoner' | 'mount';
export type CharacterType = 'pc' | 'npc' | 'enemy' | 'neutral';

export interface PartyPosition {
  x: number;
  y: number;
  locationName: string;
  poiId?: string;
}

export interface Party {
  id: string;
  name: string;
  description?: string;
  worldId?: string;
  status: PartyStatus;
  currentLocation?: string;
  currentQuestId?: string;
  formation: string;
  // Position fields for world map
  positionX?: number;
  positionY?: number;
  currentPOI?: string;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt?: string;
}

export interface PartyMember {
  id: string;
  partyId: string;
  characterId: string;
  role: MemberRole;
  isActive: boolean;
  position?: number;
  sharePercentage: number;
  joinedAt: string;
  notes?: string;
}

export interface SpellSlot {
  current: number;
  max: number;
}

export interface SpellSlots {
  level1: SpellSlot;
  level2: SpellSlot;
  level3: SpellSlot;
  level4: SpellSlot;
  level5: SpellSlot;
  level6: SpellSlot;
  level7: SpellSlot;
  level8: SpellSlot;
  level9: SpellSlot;
}

export interface PactMagicSlots {
  current: number;
  max: number;
  slotLevel: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  class: string;
  race?: string;
  hp: number;
  maxHp: number;
  ac?: number;
  characterType: CharacterType;
  conditions?: CharacterCondition[];
  // Spellcasting
  spellSlots?: SpellSlots;
  pactMagicSlots?: PactMagicSlots;
  knownSpells?: string[];
  preparedSpells?: string[];
  cantripsKnown?: string[];
  spellcastingAbility?: string;
  spellSaveDC?: number;
  spellAttackBonus?: number;
}

export interface PartyMemberWithCharacter extends PartyMember {
  character: CharacterSummary;
}

export interface PartyWithMembers extends Party {
  members: PartyMemberWithCharacter[];
}

export interface PartyContext {
  partyId: string;
  partyName: string;
  memberCount: number;
  leader?: string;
  activeCharacter?: string;
  summary: string;
  members: Array<{
    name: string;
    role: string;
    class: string;
    level: number;
    hp: string;
    isActive: boolean;
  }>;
}

export interface CharacterUpdates {
  name?: string;
  race?: string;
  class?: string;
  level?: number;
  hp?: number;
  maxHp?: number;
  ac?: number;
  stats?: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  // Spellcasting
  spellSlots?: SpellSlots;
  pactMagicSlots?: PactMagicSlots;
  knownSpells?: string[];
  preparedSpells?: string[];
  cantripsKnown?: string[];
  spellcastingAbility?: string;
  // Conditions
  conditions?: CharacterCondition[];
  addConditions?: CharacterCondition[];
  removeConditions?: string[];
}

// ============================================
// Store Interface
// ============================================

interface PartyState {
  // State
  activePartyId: string | null;
  parties: Party[];
  partyDetails: Record<string, PartyWithMembers>;
  unassignedCharacters: CharacterSummary[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  isInitialized: boolean;

  // Error handling
  error: string | null;

  // Basic setters
  setActivePartyId: (partyId: string | null) => void;
  setError: (error: string | null) => void;

  // Party CRUD
  createParty: (
    name: string,
    description?: string,
    worldId?: string,
    initialMembers?: { characterId: string; role?: MemberRole }[]
  ) => Promise<string | null>;
  updateParty: (partyId: string, updates: Partial<Pick<Party, 'name' | 'description' | 'formation' | 'status' | 'currentLocation'>>) => Promise<boolean>;
  deleteParty: (partyId: string) => Promise<boolean>;

  // Membership management
  addMember: (partyId: string, characterId: string, role?: MemberRole) => Promise<boolean>;
  removeMember: (partyId: string, characterId: string) => Promise<boolean>;
  updateMember: (partyId: string, characterId: string, updates: Partial<Pick<PartyMember, 'role' | 'position' | 'notes'>>) => Promise<boolean>;
  setLeader: (partyId: string, characterId: string) => Promise<boolean>;
  setActiveCharacter: (partyId: string, characterId: string) => Promise<boolean>;

  // Character CRUD
  deleteCharacter: (characterId: string) => Promise<boolean>;
  updateCharacter: (characterId: string, updates: CharacterUpdates) => Promise<boolean>;

  // Sync operations
  syncParties: () => Promise<void>;
  syncPartyDetails: (partyId: string) => Promise<void>;
  syncUnassignedCharacters: () => Promise<void>;
  
  // Initialize - call on app start after MCP is ready
  initialize: () => Promise<void>;

  // Context for LLM
  getPartyContext: (partyId: string, verbosity?: 'minimal' | 'standard' | 'detailed') => Promise<PartyContext | null>;

  // Party Movement
  moveParty: (partyId: string, targetX: number, targetY: number, locationName: string, poiId?: string) => Promise<boolean>;
  getPartyPosition: (partyId: string) => Promise<PartyPosition | null>;

  // Selectors (computed from state)
  getActiveParty: () => PartyWithMembers | null;
  getActivePartyPosition: () => PartyPosition | null;
  getLeader: () => PartyMemberWithCharacter | null;
  getActiveCharacterMember: () => PartyMemberWithCharacter | null;
}

// ============================================
// Helper Functions
// ============================================

function parseParty(data: any): Party | null {
  if (!data || !data.id) return null;

  return {
    id: data.id,
    name: data.name || 'Unnamed Party',
    description: data.description,
    worldId: data.worldId || data.world_id,
    status: data.status || 'active',
    currentLocation: data.currentLocation || data.current_location,
    currentQuestId: data.currentQuestId || data.current_quest_id,
    formation: data.formation || 'standard',
    // Position fields
    positionX: data.positionX ?? data.position_x,
    positionY: data.positionY ?? data.position_y,
    currentPOI: data.currentPOI || data.current_poi,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    lastPlayedAt: data.lastPlayedAt || data.last_played_at,
  };
}

function parseCharacterSummary(data: any): CharacterSummary | null {
  if (!data || !data.id) return null;

  // content may be deeply nested depending on API return
  
  // Parse conditions
  const conditions: CharacterCondition[] = [];
  if (Array.isArray(data.conditions)) {
    data.conditions.forEach((c: any) => {
      if (typeof c === 'string') {
        conditions.push({ name: c });
      } else if (c && c.name) {
        conditions.push({
          name: c.name,
          duration: c.duration,
          source: c.source
        });
      }
    });
  }

  return {
    id: data.id,
    name: data.name || 'Unknown',
    level: data.level || 1,
    class: data.class || data.characterClass || 'Adventurer',
    race: data.race,
    hp: data.hp || 0,
    maxHp: data.maxHp || data.max_hp || data.hp || 1,
    ac: data.ac || data.armorClass,
    characterType: data.characterType || data.character_type || 'pc',
    conditions,
    // Spellcasting
    spellSlots: data.spellSlots,
    pactMagicSlots: data.pactMagicSlots,
    knownSpells: data.knownSpells,
    preparedSpells: data.preparedSpells,
    cantripsKnown: data.cantripsKnown,
    spellcastingAbility: data.spellcastingAbility,
    spellSaveDC: data.spellSaveDC,
    spellAttackBonus: data.spellAttackBonus,
  };
}

function parsePartyMember(data: any): PartyMember | null {
  if (!data || !data.characterId) return null;

  return {
    id: data.id || data.characterId,
    partyId: data.partyId || data.party_id || '',
    characterId: data.characterId || data.character_id,
    role: data.role || 'member',
    isActive: data.isActive ?? data.is_active ?? false,
    position: data.position,
    sharePercentage: data.sharePercentage ?? data.share_percentage ?? 100,
    joinedAt: data.joinedAt || data.joined_at || new Date().toISOString(),
    notes: data.notes,
  };
}

function parsePartyWithMembers(data: any): PartyWithMembers | null {
  const party = parseParty(data);
  if (!party) return null;

  const members: PartyMemberWithCharacter[] = [];

  if (Array.isArray(data.members)) {
    for (const memberData of data.members) {
      const member = parsePartyMember(memberData);
      const character = parseCharacterSummary(memberData.character || memberData);

      if (member && character) {
        members.push({
          ...member,
          character,
        });
      }
    }
  }

  return {
    ...party,
    members,
  };
}

/**
 * Sync the active character from party to gameStateStore
 * This ensures inventory, character sheet, etc. show the POV character
 */
async function syncActiveCharacterToGameState(characterId: string | null) {
  try {
    const { useGameStateStore } = await import('./gameStateStore');
    const gameState = useGameStateStore.getState();
    
    if (characterId && characterId !== gameState.activeCharacterId) {
      console.log('[PartyStore] Syncing POV character to gameStateStore:', characterId);
      gameState.setActiveCharacterId(characterId, true);
      // Trigger a sync to load inventory/quests for this character
      await gameState.syncState(true);
    }
  } catch (error) {
    console.error('[PartyStore] Failed to sync active character to gameState:', error);
  }
}

// ============================================
// Store Implementation
// ============================================

export const usePartyStore = create<PartyState>()(
  persist(
    (set, get) => ({
      // Initial state
      activePartyId: null,
      parties: [],
      partyDetails: {},
      unassignedCharacters: [],
      isLoading: false,
      isSyncing: false,
      lastSyncTime: 0,
      isInitialized: false,
      error: null,

      // Basic setters
      setActivePartyId: (partyId) => set({ activePartyId: partyId }),
      setError: (error) => set({ error }),

      // ============================================
      // Initialize - call after MCP is ready
      // ============================================
      
      initialize: async () => {
        const { isInitialized } = get();
        
        if (isInitialized) {
          console.log('[PartyStore] Already initialized');
          return;
        }

        console.log('[PartyStore] Initializing...');
        set({ isInitialized: true });

        // Sync parties from backend
        await get().syncParties();

        // If we have a persisted activePartyId, sync its details and active character
        const currentActivePartyId = get().activePartyId;
        if (currentActivePartyId) {
          const partyDetails = get().partyDetails[currentActivePartyId];
          if (partyDetails) {
            // Find the active character in the party and sync to gameStateStore
            const activeCharMember = partyDetails.members.find(m => m.isActive);
            if (activeCharMember) {
              await syncActiveCharacterToGameState(activeCharMember.characterId);
            }
          }
        }

        console.log('[PartyStore] Initialization complete');
      },

      // ============================================
      // Party CRUD Operations
      // ============================================

      createParty: async (name, description, worldId, initialMembers) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          const args: any = { name };
          if (description) args.description = description;
          if (worldId) args.worldId = worldId;
          if (initialMembers && initialMembers.length > 0) {
            args.initialMembers = initialMembers;
          }

          console.log('[PartyStore] Creating party:', args);
          const result = await mcpManager.gameStateClient.callTool('create_party', args);
          const data = parseMcpResponse<any>(result, null);

          if (data?.id || data?.party?.id) {
            const partyId = data.id || data.party.id;
            console.log('[PartyStore] Party created:', partyId);

            // Refresh parties list
            await get().syncParties();

            // Set as active and fetch details
            set({ activePartyId: partyId });
            await get().syncPartyDetails(partyId);

            return partyId;
          }

          throw new Error('Failed to create party - no ID returned');
        } catch (error: any) {
          console.error('[PartyStore] Create party error:', error);
          set({ error: error.message || 'Failed to create party' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      updateParty: async (partyId, updates) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Updating party:', partyId, updates);
          const result = await mcpManager.gameStateClient.callTool('update_party', {
            partyId,
            ...updates,
          });

          const data = parseMcpResponse<any>(result, null);

          if (data && !data.error) {
            // Refresh party details
            await get().syncPartyDetails(partyId);
            return true;
          }

          throw new Error(data?.error || 'Failed to update party');
        } catch (error: any) {
          console.error('[PartyStore] Update party error:', error);
          set({ error: error.message || 'Failed to update party' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteParty: async (partyId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Deleting party:', partyId);
          await mcpManager.gameStateClient.callTool('delete_party', { partyId });

          // Clear from local state
          set((state) => ({
            parties: state.parties.filter(p => p.id !== partyId),
            partyDetails: Object.fromEntries(
              Object.entries(state.partyDetails).filter(([id]) => id !== partyId)
            ),
            activePartyId: state.activePartyId === partyId ? null : state.activePartyId,
          }));

          // Refresh unassigned characters
          await get().syncUnassignedCharacters();

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Delete party error:', error);
          set({ error: error.message || 'Failed to delete party' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // ============================================
      // Membership Management
      // ============================================

      addMember: async (partyId, characterId, role = 'member') => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Adding member:', characterId, 'to party:', partyId);
          await mcpManager.gameStateClient.callTool('add_party_member', {
            partyId,
            characterId,
            role,
          });

          // Refresh party details and unassigned characters
          await Promise.all([
            get().syncPartyDetails(partyId),
            get().syncUnassignedCharacters(),
          ]);

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Add member error:', error);
          set({ error: error.message || 'Failed to add member' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      removeMember: async (partyId, characterId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Removing member:', characterId, 'from party:', partyId);
          await mcpManager.gameStateClient.callTool('remove_party_member', {
            partyId,
            characterId,
          });

          // Refresh party details and unassigned characters
          await Promise.all([
            get().syncPartyDetails(partyId),
            get().syncUnassignedCharacters(),
          ]);

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Remove member error:', error);
          set({ error: error.message || 'Failed to remove member' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      updateMember: async (partyId, characterId, updates) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Updating member:', characterId, updates);
          await mcpManager.gameStateClient.callTool('update_party_member', {
            partyId,
            characterId,
            ...updates,
          });

          // Refresh party details
          await get().syncPartyDetails(partyId);

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Update member error:', error);
          set({ error: error.message || 'Failed to update member' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      setLeader: async (partyId, characterId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Setting leader:', characterId, 'for party:', partyId);
          await mcpManager.gameStateClient.callTool('set_party_leader', {
            partyId,
            characterId,
          });

          // Refresh party details
          await get().syncPartyDetails(partyId);

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Set leader error:', error);
          set({ error: error.message || 'Failed to set leader' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      setActiveCharacter: async (partyId, characterId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Setting active character (POV):', characterId, 'for party:', partyId);
          await mcpManager.gameStateClient.callTool('set_active_character', {
            partyId,
            characterId,
          });

          // Refresh party details
          await get().syncPartyDetails(partyId);

          // *** KEY FIX: Sync to gameStateStore so inventory/character sheet update ***
          await syncActiveCharacterToGameState(characterId);

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Set active character error:', error);
          set({ error: error.message || 'Failed to set active character' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // ============================================
      // Character CRUD Operations
      // ============================================

      deleteCharacter: async (characterId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Deleting character:', characterId);
          await mcpManager.gameStateClient.callTool('delete_character', { id: characterId });

          // If this was the active character, clear it
          const { useGameStateStore } = await import('./gameStateStore');
          const gameState = useGameStateStore.getState();
          if (gameState.activeCharacterId === characterId) {
            gameState.setActiveCharacterId(null, false);
          }

          // Refresh all party details to remove the character from any parties
          const { activePartyId } = get();
          if (activePartyId) {
            await get().syncPartyDetails(activePartyId);
          }
          await get().syncUnassignedCharacters();

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Delete character error:', error);
          set({ error: error.message || 'Failed to delete character' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      updateCharacter: async (characterId, updates) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Updating character:', characterId, updates);
          await mcpManager.gameStateClient.callTool('update_character', {
            id: characterId,
            ...updates,
          });

          // Refresh party details to reflect changes
          const { activePartyId } = get();
          if (activePartyId) {
            await get().syncPartyDetails(activePartyId);
          }

          // Also refresh gameState if this is the active character
          const { useGameStateStore } = await import('./gameStateStore');
          const gameState = useGameStateStore.getState();
          if (gameState.activeCharacterId === characterId) {
            await gameState.syncState(true);
          }

          return true;
        } catch (error: any) {
          console.error('[PartyStore] Update character error:', error);
          set({ error: error.message || 'Failed to update character' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      // ============================================
      // Sync Operations
      // ============================================

      syncParties: async () => {
        const { isSyncing, lastSyncTime } = get();

        // Rate limit to max once per 2 seconds
        const now = Date.now();
        if (isSyncing || now - lastSyncTime < 2000) {
          console.log('[PartyStore] Sync skipped (rate limited or already syncing)');
          return;
        }

        set({ isSyncing: true, lastSyncTime: now });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Syncing parties list...');
          const result = await mcpManager.gameStateClient.callTool('list_parties', {});
          const data = parseMcpResponse<{ parties: any[]; count: number }>(result, { parties: [], count: 0 });

          const parties: Party[] = [];
          for (const partyData of data.parties || []) {
            const party = parseParty(partyData);
            if (party) parties.push(party);
          }

          console.log('[PartyStore] Loaded', parties.length, 'parties');

          // Check if persisted activePartyId is still valid
          const { activePartyId } = get();
          let newActivePartyId = activePartyId;

          if (!activePartyId || !parties.find(p => p.id === activePartyId)) {
            const activeParty = parties.find(p => p.status === 'active') || parties[0];
            newActivePartyId = activeParty?.id || null;
          }

          set({ parties, activePartyId: newActivePartyId });

          // Fetch details for active party
          if (newActivePartyId) {
            await get().syncPartyDetails(newActivePartyId);
          }

          // Also sync unassigned characters
          await get().syncUnassignedCharacters();

        } catch (error: any) {
          console.error('[PartyStore] Sync parties error:', error);
          set({ error: error.message || 'Failed to sync parties' });
        } finally {
          set({ isSyncing: false });
        }
      },

      syncPartyDetails: async (partyId) => {
        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Fetching party details:', partyId);
          const result = await mcpManager.gameStateClient.callTool('get_party', { partyId });
          const data = parseMcpResponse<any>(result, null);

          if (data) {
            const partyWithMembers = parsePartyWithMembers(data.party || data);

            if (partyWithMembers) {
              console.log('[PartyStore] Loaded party with', partyWithMembers.members.length, 'members');

              set((state) => ({
                partyDetails: {
                  ...state.partyDetails,
                  [partyId]: partyWithMembers,
                },
              }));

              // If this is the active party, sync the active character to gameState
              const { activePartyId } = get();
              if (partyId === activePartyId) {
                const activeMember = partyWithMembers.members.find(m => m.isActive);
                if (activeMember) {
                  // Don't await - let it run in background to avoid blocking
                  syncActiveCharacterToGameState(activeMember.characterId);
                }
              }
            }
          }
        } catch (error: any) {
          console.error('[PartyStore] Sync party details error:', error);
        }
      },

      syncUnassignedCharacters: async () => {
        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Fetching unassigned characters...');
          const result = await mcpManager.gameStateClient.callTool('get_unassigned_characters', {});
          const data = parseMcpResponse<{ characters: any[]; count: number }>(result, { characters: [], count: 0 });

          const characters: CharacterSummary[] = [];
          for (const charData of data.characters || []) {
            const char = parseCharacterSummary(charData);
            if (char) characters.push(char);
          }

          console.log('[PartyStore] Found', characters.length, 'unassigned characters');
          set({ unassignedCharacters: characters });

        } catch (error: any) {
          console.error('[PartyStore] Sync unassigned characters error:', error);
        }
      },

      // ============================================
      // LLM Context
      // ============================================

      getPartyContext: async (partyId, verbosity = 'standard') => {
        try {
          const { mcpManager } = await import('../services/mcpClient');

          const result = await mcpManager.gameStateClient.callTool('get_party_context', {
            partyId,
            verbosity,
          });

          const data = parseMcpResponse<any>(result, null);

          if (data) {
            return {
              partyId: data.partyId || partyId,
              partyName: data.partyName || data.name || 'Unknown Party',
              memberCount: data.memberCount || data.members?.length || 0,
              leader: data.leader,
              activeCharacter: data.activeCharacter,
              summary: data.summary || '',
              members: data.members || [],
            };
          }

          return null;
        } catch (error: any) {
          console.error('[PartyStore] Get party context error:', error);
          return null;
        }
      },

      // ============================================
      // Party Movement
      // ============================================

      moveParty: async (partyId, targetX, targetY, locationName, poiId) => {
        set({ isLoading: true, error: null });

        try {
          const { mcpManager } = await import('../services/mcpClient');

          console.log('[PartyStore] Moving party:', partyId, 'to', targetX, targetY, locationName);
          const result = await mcpManager.gameStateClient.callTool('move_party', {
            partyId,
            targetX,
            targetY,
            locationName,
            poiId,
          });

          const data = parseMcpResponse<any>(result, null);

          if (data?.success) {
            console.log('[PartyStore] Party moved successfully:', data);

            // Update local party data with new position
            set((state) => {
              const updatedPartyDetails = { ...state.partyDetails };
              if (updatedPartyDetails[partyId]) {
                updatedPartyDetails[partyId] = {
                  ...updatedPartyDetails[partyId],
                  positionX: targetX,
                  positionY: targetY,
                  currentLocation: locationName,
                  currentPOI: poiId,
                };
              }
              return { partyDetails: updatedPartyDetails };
            });

            // Refresh party details to ensure sync with backend
            await get().syncPartyDetails(partyId);

            return true;
          }

          throw new Error(data?.error || 'Failed to move party');
        } catch (error: any) {
          console.error('[PartyStore] Move party error:', error);
          set({ error: error.message || 'Failed to move party' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      getPartyPosition: async (partyId) => {
        try {
          const { mcpManager } = await import('../services/mcpClient');

          const result = await mcpManager.gameStateClient.callTool('get_party_position', { partyId });
          const data = parseMcpResponse<any>(result, null);

          if (data?.success && data?.position) {
            return {
              x: data.position.x,
              y: data.position.y,
              locationName: data.position.locationName || 'Unknown',
              poiId: data.position.poiId,
            };
          }

          return null;
        } catch (error: any) {
          console.error('[PartyStore] Get party position error:', error);
          return null;
        }
      },

      // ============================================
      // Selectors
      // ============================================

      getActiveParty: () => {
        const { activePartyId, partyDetails } = get();
        if (!activePartyId) return null;
        return partyDetails[activePartyId] || null;
      },

      getActivePartyPosition: () => {
        const activeParty = get().getActiveParty();
        if (!activeParty || activeParty.positionX === undefined || activeParty.positionY === undefined) {
          return null;
        }
        return {
          x: activeParty.positionX,
          y: activeParty.positionY,
          locationName: activeParty.currentLocation || 'Unknown',
          poiId: activeParty.currentPOI,
        };
      },

      getLeader: () => {
        const activeParty = get().getActiveParty();
        if (!activeParty) return null;
        return activeParty.members.find(m => m.role === 'leader') || null;
      },

      getActiveCharacterMember: () => {
        const activeParty = get().getActiveParty();
        if (!activeParty) return null;
        return activeParty.members.find(m => m.isActive) || null;
      },
    }),
    {
      name: 'quest-keeper-party-store',
      // Only persist these fields
      partialize: (state) => ({
        activePartyId: state.activePartyId,
      }),
    }
  )
);

// ============================================
// Debounced Sync Export
// ============================================

export const debouncedSyncParties = debounce(() => {
  usePartyStore.getState().syncParties();
}, 1000);
