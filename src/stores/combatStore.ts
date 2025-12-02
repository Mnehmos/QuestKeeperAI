import { create } from 'zustand';
import { CreatureSize } from '../utils/gridHelpers';
import { mcpManager } from '../services/mcpClient';
import { parseMcpResponse, debounce } from '../utils/mcpUtils';

export type Vector3 = { x: number; y: number; z: number };

export interface EntityMetadata {
  hp: {
    current: number;
    max: number;
    temp?: number;
  };
  ac: number;
  creatureType: string;
  conditions: string[];
  stats?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  description?: string;
  notes?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: 'character' | 'npc' | 'monster';
  size: CreatureSize;
  position: Vector3;
  color: string;
  model?: string;
  metadata: EntityMetadata;
}

export interface GridConfig {
  size: number;
  divisions: number;
}

export interface TerrainFeature {
  id: string;
  type: string;
  position: Vector3;
  dimensions: { width: number; height: number; depth: number };
  blocksMovement: boolean;
  coverType?: 'half' | 'three-quarters' | 'full' | 'none';
  color: string;
}

interface CombatState {
  entities: Entity[];
  terrain: TerrainFeature[];
  selectedEntityId: string | null;
  selectedTerrainId: string | null;
  gridConfig: GridConfig;
  battlefieldDescription: string | null;
  
  // rpg-mcp encounter tracking
  activeEncounterId: string | null;
  currentRound: number;
  currentTurnName: string | null;
  turnOrder: string[];
  isSyncing: boolean;
  lastSyncTime: number;

  addEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateEntityMetadata: (id: string, metadata: Partial<EntityMetadata>) => void;
  selectEntity: (id: string | null) => void;
  selectTerrain: (id: string | null) => void;
  setGridConfig: (config: GridConfig) => void;
  setBattlefieldDescription: (desc: string | null) => void;
  setActiveEncounterId: (id: string | null) => void;
  syncCombatState: () => Promise<void>;
  clearCombat: () => void;
}

const MOCK_ENTITIES: Entity[] = [];

// Monster name patterns for entity type detection
const MONSTER_PATTERNS = [
  'goblin', 'orc', 'dragon', 'skeleton', 'zombie', 'wolf', 'bandit',
  'troll', 'giant', 'demon', 'devil', 'undead', 'beast', 'spider',
  'kobold', 'gnoll', 'ogre', 'vampire', 'werewolf', 'lich', 'elemental'
];

/**
 * Determine entity type and color based on name and position in turn order
 */
function determineEntityType(name: string, index: number): { type: 'character' | 'npc' | 'monster'; color: string } {
  const lowerName = name.toLowerCase();
  
  // Check for monster patterns
  for (const pattern of MONSTER_PATTERNS) {
    if (lowerName.includes(pattern)) {
      return { type: 'monster', color: '#ff4444' }; // Red for monsters
    }
  }
  
  // First participant is usually the player character
  if (index === 0) {
    return { type: 'character', color: '#44ff44' }; // Green for player
  }
  
  // Others default to NPC (could be allies)
  return { type: 'npc', color: '#ffaa44' }; // Orange for NPCs
}

/**
 * Parse rpg-mcp encounter state into entities
 */
function parseEncounterState(data: any, gridConfig: GridConfig): { 
  entities: Entity[]; 
  currentRound: number;
  currentTurnName: string | null;
  turnOrder: string[];
} {
  const entities: Entity[] = [];
  
  if (!data || !data.participants) {
    return { entities, currentRound: 0, currentTurnName: null, turnOrder: [] };
  }

  const participants = data.participants;
  const participantCount = participants.length;
  
  // Position participants in a circle around the center
  const radius = Math.min(gridConfig.size / 4, 6);
  
  participants.forEach((p: any, index: number) => {
    // Calculate position in a circle
    const angle = (2 * Math.PI * index) / participantCount - Math.PI / 2; // Start from top
    
    const x = Math.round(Math.cos(angle) * radius);
    const z = Math.round(Math.sin(angle) * radius);
    
    const { type, color } = determineEntityType(p.name || '', index);

    const entity: Entity = {
      id: p.id,
      name: p.name,
      type,
      size: 'Medium' as CreatureSize,
      position: { x, y: 0, z },
      color,
      model: 'box',
      metadata: {
        hp: {
          current: p.hp || 0,
          max: p.maxHp || p.hp || 0
        },
        ac: p.ac || 10,
        creatureType: type,
        conditions: p.conditions || []
      }
    };
    
    entities.push(entity);
  });

  return {
    entities,
    currentRound: data.round || 1,
    currentTurnName: data.currentTurn?.participantName || data.currentTurn?.name || null,
    turnOrder: data.turnOrder || []
  };
}

/**
 * Generate battlefield description from parsed state
 */
function generateBattlefieldDescription(
  entities: Entity[], 
  round: number, 
  currentTurn: string | null,
  turnOrder: string[]
): string {
  if (entities.length === 0) {
    return 'No active combat encounter.';
  }

  const lines = [
    `⚔️ Combat Round ${round}`,
    `🎯 Current Turn: ${currentTurn || 'Unknown'}`,
    `📋 Initiative: ${turnOrder.join(' → ')}`,
    '',
    '👥 Combatants:'
  ];
  
  entities.forEach(e => {
    const hpPercent = Math.round((e.metadata.hp.current / e.metadata.hp.max) * 100);
    const hpBar = hpPercent > 66 ? '🟢' : hpPercent > 33 ? '🟡' : '🔴';
    const conditions = e.metadata.conditions.length > 0 
      ? ` [${e.metadata.conditions.join(', ')}]` 
      : '';
    
    lines.push(`  ${hpBar} ${e.name}: ${e.metadata.hp.current}/${e.metadata.hp.max} HP${conditions}`);
  });

  return lines.join('\n');
}

export const useCombatStore = create<CombatState>((set, get) => ({
  entities: MOCK_ENTITIES,
  terrain: [],
  selectedEntityId: null,
  selectedTerrainId: null,
  gridConfig: { size: 20, divisions: 20 },
  battlefieldDescription: null,
  
  // rpg-mcp encounter tracking
  activeEncounterId: null,
  currentRound: 0,
  currentTurnName: null,
  turnOrder: [],
  isSyncing: false,
  lastSyncTime: 0,

  addEntity: (entity) => set((state) => ({
    entities: [...state.entities, entity]
  })),

  removeEntity: (id) => set((state) => ({
    entities: state.entities.filter((ent) => ent.id !== id),
    selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId
  })),

  updateEntity: (id, updates) => set((state) => ({
    entities: state.entities.map((ent) =>
      ent.id === id ? { ...ent, ...updates } : ent
    )
  })),

  updateEntityMetadata: (id, metadata) => set((state) => ({
    entities: state.entities.map((ent) => {
      if (ent.id !== id) return ent;
      const newMetadata = { ...ent.metadata, ...metadata };

      if (metadata.hp) {
        newMetadata.hp = { ...ent.metadata.hp, ...metadata.hp };
      }

      if (metadata.stats) {
        newMetadata.stats = { ...(ent.metadata.stats || {}), ...metadata.stats } as any;
      }

      return { ...ent, metadata: newMetadata };
    })
  })),

  selectEntity: (id) => set({ selectedEntityId: id, selectedTerrainId: null }),

  selectTerrain: (id) => set({ selectedTerrainId: id, selectedEntityId: null }),

  setGridConfig: (config) => set({ gridConfig: config }),

  setBattlefieldDescription: (desc) => set({ battlefieldDescription: desc }),
  
  setActiveEncounterId: (id) => set({ activeEncounterId: id }),
  
  clearCombat: () => set({
    entities: [],
    terrain: [],
    activeEncounterId: null,
    currentRound: 0,
    currentTurnName: null,
    turnOrder: [],
    battlefieldDescription: null,
    selectedEntityId: null
  }),

  syncCombatState: async () => {
    const { activeEncounterId, gridConfig, isSyncing, lastSyncTime } = get();
    
    // Prevent concurrent syncs and rate limit
    if (isSyncing) {
      return;
    }
    
    const now = Date.now();
    if (now - lastSyncTime < 1000) {
      return;
    }
    
    // If no active encounter, nothing to sync
    if (!activeEncounterId) {
      console.log('[syncCombatState] No active encounter. Use create_encounter via LLM to start combat.');
      return;
    }

    set({ isSyncing: true, lastSyncTime: now });

    try {
      console.log('[syncCombatState] Fetching encounter state for:', activeEncounterId);
      
      const result = await mcpManager.combatClient.callTool('get_encounter_state', {
        encounterId: activeEncounterId
      });

      console.log('[syncCombatState] Raw result:', result);

      // Parse using utility - handles both MCP wrapper and direct JSON
      const data = parseMcpResponse<any>(result, null);
      
      if (data) {
        console.log('[syncCombatState] Parsed encounter data:', data);
        
        const parsed = parseEncounterState(data, gridConfig);
        
        console.log('[syncCombatState] Generated', parsed.entities.length, 'entities');
        console.log('[syncCombatState] Round:', parsed.currentRound, 'Turn:', parsed.currentTurnName);
        
        const description = generateBattlefieldDescription(
          parsed.entities,
          parsed.currentRound,
          parsed.currentTurnName,
          parsed.turnOrder
        );
        
        set({
          entities: parsed.entities,
          currentRound: parsed.currentRound,
          currentTurnName: parsed.currentTurnName,
          turnOrder: parsed.turnOrder,
          battlefieldDescription: description
        });
      } else {
        console.warn('[syncCombatState] No data in response');
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      
      // If encounter not found, clear the active encounter
      if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
        console.log('[syncCombatState] Encounter not found, clearing combat state');
        set({ 
          activeEncounterId: null,
          entities: [],
          battlefieldDescription: 'No active encounter.',
          currentRound: 0,
          currentTurnName: null,
          turnOrder: []
        });
      } else {
        console.warn('[syncCombatState] Failed to sync combat state:', e);
      }
    } finally {
      set({ isSyncing: false });
    }
  }
}));

// Export debounced sync for use in components
export const debouncedSyncCombatState = debounce(() => {
  useCombatStore.getState().syncCombatState();
}, 500);
