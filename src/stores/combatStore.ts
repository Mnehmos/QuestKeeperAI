import { create } from 'zustand';
import { CreatureSize, findNearestOpenTile, getElevationAt } from '../utils/gridHelpers';
import { mcpManager } from '../services/mcpClient';
import { useGameStateStore } from './gameStateStore';
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
  isCurrentTurn?: boolean;
}

export interface GridConfig {
  size: number;
  divisions: number;
}

export interface TerrainFeature {
  id: string;
  type: 'wall' | 'obstacle' | 'difficult' | 'water' | 'elevation' | 'floor' | 'ceiling' | string;
  position: Vector3;
  dimensions: { width: number; height: number; depth: number };
  blocksMovement: boolean;
  coverType?: 'half' | 'three-quarters' | 'full' | 'none';
  color: string;
  // 2.5D layer support (Foundry VTT style)
  elevation?: number;  // Base elevation (0 = ground, 1 = first floor, -1 = basement)
  layer?: number;      // Visual layer for rendering order
  opacity?: number;    // For transparent floors/ceilings
}

/**
 * Structure returned by get_encounter_state (now returns JSON!)
 * Updated to include spatial data from MCP server
 */
interface EncounterStateJson {
  encounterId: string;
  round: number;
  currentTurnIndex: number;
  currentTurn: {
    id: string;
    name: string;
    isEnemy: boolean;
  } | null;
  turnOrder: string[];
  participants: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    initiative: number;
    isEnemy: boolean;
    conditions: string[];
    isDefeated: boolean;
    isCurrentTurn: boolean;
    // New spatial fields from MCP server
    position?: { x: number; y: number; z?: number };
    size?: string;
    movementSpeed?: number;
    movementRemaining?: number;
  }>;
  // Optional terrain data from MCP
  terrain?: {
    obstacles: Array<{ x: number; y: number } | string>;
    difficultTerrain: Array<{ x: number; y: number } | string>;
    water?: Array<{ x: number; y: number } | string>;
  };
  gridBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  // Props - improvised objects (trees, ladders, buildings, etc.)
  props?: Array<{
    id: string;
    position: string;  // "x,y" format
    label: string;
    propType: 'structure' | 'cover' | 'climbable' | 'hazard' | 'interactive' | 'decoration';
    heightFeet?: number;
    cover?: 'none' | 'half' | 'three_quarter' | 'full';
    climbable?: boolean;
    climbDC?: number;
    breakable?: boolean;
    hp?: number;
    currentHp?: number;
    description?: string;
  }>;
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
  // Clicked tile coordinate for display
  clickedTileCoord: { x: number; y: number } | null;
  // Visualizer tools
  showLineOfSight: boolean;
  measureMode: boolean; // If true, clicking tiles sets measureStart/End instead of clickedTileCoord
  measureStart: { x: number; y: number } | null;
  measureEnd: { x: number, y: number } | null;
  cursorPosition: { x: number, y: number } | null; // For dynamic LOS

  addEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateEntityMetadata: (id: string, metadata: Partial<EntityMetadata>) => void;
  selectEntity: (id: string | null) => void;
  selectTerrain: (id: string | null) => void;
  setGridConfig: (config: GridConfig) => void;
  setBattlefieldDescription: (desc: string | null) => void;
  setActiveEncounterId: (id: string | null) => void;
  setShowLineOfSight: (show: boolean) => void;
  setMeasureMode: (enabled: boolean) => void;
  setMeasureStart: (pos: { x: number, y: number } | null) => void;
  setMeasureEnd: (pos: { x: number, y: number } | null) => void;
  setCursorPosition: (pos: { x: number, y: number } | null) => void;
  syncCombatState: () => Promise<void>;
  updateFromStateJson: (stateJson: EncounterStateJson) => void;
  clearCombat: () => void;
  setClickedTileCoord: (coord: { x: number; y: number } | null) => void;
}

const MOCK_ENTITIES: Entity[] = [];

/**
 * Extract embedded JSON from tool response text
 * Looks for <!-- STATE_JSON ... STATE_JSON --> markers
 */
function extractEmbeddedStateJson(text: string): EncounterStateJson | null {
  const match = text.match(/<!-- STATE_JSON\n([\s\S]*?)\nSTATE_JSON -->/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.warn('[extractEmbeddedStateJson] Failed to parse embedded JSON:', e);
      return null;
    }
  }
  return null;
}

/**
 * Determine entity type and color based on isEnemy flag and name
 */
function determineEntityType(_name: string, isEnemy: boolean, isCurrentTurn: boolean): { type: 'character' | 'npc' | 'monster'; color: string } {
  if (isEnemy) {
    return { type: 'monster', color: isCurrentTurn ? '#ff6666' : '#ff4444' }; // Red for monsters
  }
  
  // First non-enemy is usually the player character
  return { type: 'character', color: isCurrentTurn ? '#66ff66' : '#44ff44' }; // Green for players
}

/**
 * Convert EncounterStateJson to Entity array for the battlemap
 * Now uses actual positions from MCP with COLLISION DISPLACEMENT and VERTICALITY
 */
function stateJsonToEntities(data: EncounterStateJson, gridConfig: GridConfig, terrain: TerrainFeature[]): Entity[] {
  const entities: Entity[] = [];
  const participantCount = data.participants.length;
  
  // Fallback: calculate circle positions if MCP doesn't provide positions
  const radius = Math.min(gridConfig.size / 4, 6);
  
  // We allow displacement if we have a valid encounterId (combat is likely active)
  const isCombat = !!data.encounterId;

  data.participants.forEach((p, index) => {
    let mcpX: number, mcpY: number; // Raw MCP coords (Horizontal Grid)
    let mcpElev: number | undefined = p.position?.z; // MCP Elevation (Vertical) if provided
    let wasDisplaced = false;

    // Use actual MCP position if available, otherwise calculate circle position
    if (p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number') {
      mcpX = p.position.x;
      mcpY = p.position.y;
    } else {
      // Fallback: arrange in circle
      const angle = (2 * Math.PI * index) / participantCount - Math.PI / 2;
      mcpX = Math.round(Math.cos(angle) * radius) + 10; // Center at 10,10 for circle
      mcpY = Math.round(Math.sin(angle) * radius) + 10;
    }

    // COLLISION CHECK & VERTICALITY
    // 1. Check if occupied by another ENTITY (Displacement required)
    const isBlockedByEntity = entities.some(e => {
        if (e.id === p.id) return false;
        // Simple 2D overlapping check for now (ignoring vertical stacking for spawning to keep it clean)
        const dx = Math.abs(e.position.x - (mcpX - 10)); // Viz coords comparison
        const dz = Math.abs(e.position.z - (mcpY - 10));
        // Using Entity 1x1 size assumption for spawn check
        return dx < 0.5 && dz < 0.5;
    });

    if (isBlockedByEntity) {
        // Must move!
        const safePos = findNearestOpenTile(mcpX, mcpY, entities, terrain, { ignoreEntityIds: [p.id] });
        if (safePos && (safePos.x !== mcpX || safePos.y !== mcpY)) {
             console.warn(`[stateJsonToEntities] Entity Collision for ${p.name}! Displaced from (${mcpX},${mcpY}) to (${safePos.x},${safePos.y})`);
             mcpX = safePos.x;
             mcpY = safePos.y;
             wasDisplaced = true;
             // Reset manual elevation if we moved (fall to ground logic)
             mcpElev = undefined;
        }
    } else {
        // 2. Check Terrain - Do we stand ON TOP or collide?
        // If terrain exists here, we assume we spawn ON TOP of it.
        // We do NOT displace for terrain unless it's explicitly "unstandable" (not implemented yet).
        // So we just accept the position and let the Verticality Logic below handle the Y-snap.
    }
    
    // Viz coords: mcp - 10
    const x = mcpX - 10;
    const z = mcpY - 10;

    // VERTICALITY & SUPPORT LOGIC
    // Calculate the highest surface at this location (Terrain or other Entities)
    const surfaceHeight = getElevationAt(mcpX, mcpY, terrain, entities);
    
    // Determine logical elevation (feet/units above ground 0)
    let finalElevation = surfaceHeight;
    let isFalling = false;
    let isFlying = false;
    
    if (mcpElev !== undefined) {
      // If MCP specifies an elevation (e.g. Flying or explicitly placed)
      if (mcpElev > surfaceHeight + 0.1) {
        // Higher than support. 
        // Default assumption: specific placement in air = Falling (Gravity exists).
        // UNLESS the creature has a specific condition/tag allowing flight.
        isFalling = true; // Default to falling
        
        const flyingKeywords = ['flying', 'fly', 'levitate', 'levitating', 'hover', 'hovering', 'aerial'];
        const knownFlyingCreatures = ['harpy', 'dragon', 'wyvern', 'bat', 'specter', 'ghost', 'wraith', 'eagle', 'hawk', 'owl', 'pegasus', 'griffon', 'the ace'];
        
        const hasFlightCondition = p.conditions.some(c => flyingKeywords.includes(c.toLowerCase()));
        const hasIntrinsicFlight = knownFlyingCreatures.some(k => p.name.toLowerCase().includes(k));
        
        const hasFlightCapability = hasFlightCondition || hasIntrinsicFlight;

        if (hasFlightCapability) {
            isFalling = false;
            isFlying = true;
        }

        // BUT, if they are incapacitated, physics wins again.
        const incapacitatingConditions = ['Prone', 'Unconscious', 'Incapacitated', 'Paralyzed', 'Stunned', 'Petrified'];
        const isIncapacitated = p.conditions.some(c => incapacitatingConditions.includes(c));
        
        if (isIncapacitated) {
            isFlying = false;
            isFalling = true;
        }

        finalElevation = mcpElev; 
      } else {
        // Lower or equal -> snap to surface (cannot bury inside terrain)
        finalElevation = Math.max(mcpElev, surfaceHeight);
      }
    } else {
        // No explicit elevation -> Snap to surface (Ground or Top of Obstacle)
        finalElevation = surfaceHeight;
    }
    
    // Visual Y Position: Elevation + Half Height (0.4)
    // Assuming standard 0.8 height tokens
    const visualY = finalElevation + 0.4;

    const { type, color } = determineEntityType(p.name, p.isEnemy, p.isCurrentTurn);
    
    // Map MCP size to CreatureSize
    const sizeMap: Record<string, CreatureSize> = {
      'tiny': 'Tiny',
      'small': 'Small', 
      'medium': 'Medium',
      'large': 'Large',
      'huge': 'Huge',
      'gargantuan': 'Gargantuan'
    };
    const creatureSize = sizeMap[p.size?.toLowerCase() || 'medium'] || 'Medium';

    // Add Conditions
    const finalConditions = [...p.conditions];
    if (wasDisplaced && isCombat && !finalConditions.includes('Displaced')) {
      finalConditions.push('Displaced');
    }
    if (isFalling && isCombat && !finalConditions.includes('Falling')) {
      finalConditions.push('Falling');
    }
    if (isFlying && isCombat && !finalConditions.includes('Flying')) {
      finalConditions.push('Flying');
    }

    const entity: Entity = {
      id: p.id,
      name: p.name,
      type,
      size: creatureSize,
      position: { x, y: visualY, z },
      color,
      model: 'box',
      isCurrentTurn: p.isCurrentTurn,
      metadata: {
        hp: {
          current: p.hp,
          max: p.maxHp
        },
        ac: 10, // Default AC
        creatureType: type,
        conditions: finalConditions
      }
    };
    
    entities.push(entity);
  });

  return entities;
}

/**
 * Convert MCP terrain data to TerrainFeature array for 2.5D visualization
 * Supports obstacles, difficult terrain, and multi-layer elevation
 * Handles both string format "x,y" and object format {x,y}
 */
function stateJsonToTerrain(data: EncounterStateJson): TerrainFeature[] {
  const terrain: TerrainFeature[] = [];
  
  if (!data.terrain) {
    // Note: Logging handled by caller if needed
    return terrain;
  }
  
  // Helper to parse position from string "x,y" or object {x,y}
  const parsePos = (pos: string | { x: number; y: number }): { x: number; y: number } | null => {
    if (typeof pos === 'string') {
      const parts = pos.split(',').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { x: parts[0], y: parts[1] };
      }
      console.warn('[stateJsonToTerrain] Invalid position string:', pos);
      return null;
    }
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      return pos;
    }
    console.warn('[stateJsonToTerrain] Invalid position object:', pos);
    return null;
  };
  
  // Convert obstacles to 3D walls/pillars
  data.terrain.obstacles?.forEach((rawPos, i) => {
    const pos = parsePos(rawPos as any);
    if (!pos) return;
    
    console.log(`[stateJsonToTerrain] Obstacle ${i}: MCP (${pos.x},${pos.y}) -> viz (${pos.x - 10},${pos.y - 10})`);
    terrain.push({
      id: `obstacle-${i}`,
      type: 'obstacle',
      // MCP 0-20 → visualizer -10 to +10
      position: { x: pos.x - 10, y: 1, z: pos.y - 10 },
      dimensions: { width: 1, height: 2, depth: 1 },
      blocksMovement: true,
      coverType: 'full',
      color: '#4a4a4a',
      elevation: 0,
      layer: 1
    });
  });
  
  // Convert difficult terrain to ground markers
  data.terrain.difficultTerrain?.forEach((rawPos, i) => {
    const pos = parsePos(rawPos as any);
    if (!pos) return;
    
    console.log(`[stateJsonToTerrain] Difficult ${i}: MCP (${pos.x},${pos.y}) -> viz (${pos.x - 10},${pos.y - 10})`);
    terrain.push({
      id: `difficult-${i}`,
      type: 'difficult',
      position: { x: pos.x - 10, y: 0.05, z: pos.y - 10 },
      dimensions: { width: 1, height: 0.1, depth: 1 },
      blocksMovement: false,
      color: '#8b4513',
      elevation: 0,
      layer: 0,
      opacity: 0.7
    });
  });
  
  // Convert water terrain to blue transparent tiles
  data.terrain.water?.forEach((rawPos, i) => {
    const pos = parsePos(rawPos as any);
    if (!pos) return;
    
    console.log(`[stateJsonToTerrain] Water ${i}: MCP (${pos.x},${pos.y}) -> viz (${pos.x - 10},${pos.y - 10})`);
    terrain.push({
      id: `water-${i}`,
      type: 'water',
      position: { x: pos.x - 10, y: 0.02, z: pos.y - 10 },
      dimensions: { width: 1, height: 0.05, depth: 1 },
      blocksMovement: false,
      color: '#1e90ff',
      elevation: 0,
      layer: 0,
      opacity: 0.6
    });
  });
  
  // Convert props (improvised objects) to terrain features
  data.props?.forEach((prop, i) => {
    const [xStr, yStr] = prop.position.split(',');
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    
    if (isNaN(x) || isNaN(y)) return;
    
    // Calculate height based on propType and heightFeet
    let heightFeet = typeof prop.heightFeet === 'string' ? parseFloat(prop.heightFeet) : prop.heightFeet;
    if (!heightFeet || isNaN(heightFeet) || heightFeet < 5) {
        heightFeet = 5; // Minimum 5ft
    }
    
    // Explicit debug for the "Stone Pillar" issue
    if (prop.label === 'Stone Pillar') {
       console.log(`[stateJsonToTerrain] Stone Pillar heightFeet: ${prop.heightFeet} -> parsed: ${heightFeet}`);
    }

    const heightUnits = heightFeet / 5; // 5ft per unit
    
    // Color based on prop type
    const propColors: Record<string, string> = {
      'structure': '#8B4513',   // Brown (buildings, bridges)
      'cover': '#556B2F',       // Dark olive (barrels, crates)
      'climbable': '#228B22',   // Forest green (trees, ladders)
      'hazard': '#FF4500',      // Orange red (fire, pit)
      'interactive': '#DAA520', // Goldenrod (levers, doors)
      'decoration': '#9370DB'   // Medium purple (statues, fountains)
    };
    
    // Cover type to our format
    const coverMap: Record<string, 'half' | 'three-quarters' | 'full' | 'none'> = {
      'half': 'half',
      'three_quarter': 'three-quarters',
      'full': 'full',
      'none': 'none'
    };
    
    console.log(`[stateJsonToTerrain] Prop ${i}: "${prop.label}" MCP (${x},${y}) -> viz (${x - 10},${y - 10})`);
    terrain.push({
      id: prop.id || `prop-${i}`,
      type: 'prop' as any,  // Extended type
      position: { x: x - 10, y: heightUnits / 2, z: y - 10 },
      dimensions: { width: 1, height: heightUnits, depth: 1 },
      blocksMovement: prop.propType === 'structure' || prop.cover === 'full',
      coverType: coverMap[prop.cover || 'none'] || 'none',
      color: propColors[prop.propType] || '#888888',
      elevation: 0,
      layer: 2,  // Props render above other terrain
      opacity: 1,
      // Store extra prop data for tooltips
    } as TerrainFeature);
  });
  
  console.log(`[stateJsonToTerrain] Created ${terrain.length} terrain features`);
  return terrain;
}

/**
 * Generate battlefield description from state JSON
 */
function generateBattlefieldDescription(data: EncounterStateJson): string {
  if (!data.participants || data.participants.length === 0) {
    return 'No active combat encounter.';
  }

  const lines = [
    `⚔️ Combat Round ${data.round}`,
    `🎯 Current Turn: ${data.currentTurn?.name || 'Unknown'}`,
    `📋 Initiative: ${data.turnOrder.join(' → ')}`,
    '',
    '👥 Combatants:'
  ];
  
  data.participants.forEach(p => {
    const hpPercent = p.maxHp > 0 ? Math.round((p.hp / p.maxHp) * 100) : 0;
    const hpBar = p.isDefeated ? '💀' : hpPercent > 66 ? '🟢' : hpPercent > 33 ? '🟡' : '🔴';
    const conditions = p.conditions.length > 0 
      ? ` [${p.conditions.join(', ')}]` 
      : '';
    const turnMarker = p.isCurrentTurn ? '▶ ' : '  ';
    
    lines.push(`${turnMarker}${hpBar} ${p.name}: ${p.hp}/${p.maxHp} HP${conditions}`);
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
  clickedTileCoord: null,
  showLineOfSight: false,
  measureMode: false,
  measureStart: null,
  measureEnd: null,
  cursorPosition: null,

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
  

  /**
   * Update store from a state JSON object
   * Can be called when parsing tool responses with embedded state
   */
  updateFromStateJson: (stateJson: EncounterStateJson) => {
    const { gridConfig, activeEncounterId, terrain: oldTerrain } = get();
    
    // Generate terrain FIRST so we can check collisions against it
    const newTerrain = stateJsonToTerrain(stateJson);
    
    // SMART TERRAIN UPDATE: 
    // If incoming terrain is empty but we're in the same encounter, KEEP old terrain.
    // This prevents terrain loss when LLM returns partial updates.
    let terrainToUse = newTerrain;
    if (newTerrain.length === 0 && stateJson.encounterId === activeEncounterId && oldTerrain.length > 0) {
        console.warn('[updateFromStateJson] Incoming terrain is empty, preserving existing terrain for same encounter.');
        terrainToUse = oldTerrain;
    }
    
    const entities = stateJsonToEntities(stateJson, gridConfig, terrainToUse);
    const description = generateBattlefieldDescription(stateJson);
    
    set({
      entities,
      terrain: terrainToUse,
      activeEncounterId: stateJson.encounterId,
      currentRound: stateJson.round,
      currentTurnName: stateJson.currentTurn?.name || null,
      turnOrder: stateJson.turnOrder,
      battlefieldDescription: description
    });
    
    console.log('[updateFromStateJson] Updated combat state:', {
      encounterId: stateJson.encounterId,
      round: stateJson.round,
      entityCount: entities.length,
      currentTurn: stateJson.currentTurn?.name
    });
    
    // Sync HP changes back to game state store for party panel
    const gameState = useGameStateStore.getState();
    console.log('[updateFromStateJson] Party state:', gameState.party.map(c => ({ name: c.name, id: c.id, hp: c.hp?.current })));
    console.log('[updateFromStateJson] Combat participants:', stateJson.participants.map(p => ({ name: p.name, id: p.id, hp: p.hp })));
    
    const updatedParty = gameState.party.map(char => {
      // Find matching participant by name or ID
      const participant = stateJson.participants.find(
        p => p.name === char.name || p.id === char.id
      );
      if (participant && participant.hp !== char.hp.current) {
        console.log('[updateFromStateJson] Syncing HP for', char.name, ':', char.hp.current, '->', participant.hp);
        return { ...char, hp: { ...char.hp, current: participant.hp } };
      }
      return char;
    });
    
    // Only update if there were changes
    if (updatedParty.some((char, i) => char.hp.current !== gameState.party[i]?.hp.current)) {
      useGameStateStore.setState({ party: updatedParty });
      // Also update active character if it was affected
      const activeId = gameState.activeCharacterId;
      if (activeId) {
        const updatedActive = updatedParty.find(c => c.id === activeId);
        if (updatedActive) {
          useGameStateStore.setState({ activeCharacter: updatedActive });
        }
      }
    }
  },

  syncCombatState: async () => {
    const { activeEncounterId, isSyncing, lastSyncTime } = get();
    
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

      // NEW: get_encounter_state now returns JSON directly!
      const data = parseMcpResponse<EncounterStateJson | null>(result, null);
      
      if (data && data.participants) {
        console.log('[syncCombatState] Parsed encounter data:', data);
        
        // Use the new updateFromStateJson method
        get().updateFromStateJson(data);
      } else if (typeof data === 'string') {
        // Fallback: check if it's text with embedded JSON
        const embedded = extractEmbeddedStateJson(data);
        if (embedded) {
          get().updateFromStateJson(embedded);
        } else {
          console.warn('[syncCombatState] Response is text without embedded JSON');
        }
      } else {
        console.warn('[syncCombatState] No valid data in response');
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
  },

  clearCombat: () => set({
    entities: [],
    terrain: [],
    activeEncounterId: null,
    currentRound: 0,
    currentTurnName: null,
    turnOrder: [],
    battlefieldDescription: null,
    selectedEntityId: null,
    clickedTileCoord: null,
    showLineOfSight: false,
    measureMode: false,
    measureStart: null,
    measureEnd: null,
    cursorPosition: null
  }),

  setClickedTileCoord: (coord) => set({ clickedTileCoord: coord }),
  setShowLineOfSight: (show) => set({ showLineOfSight: show }),
  setMeasureMode: (enabled) => set({ 
    measureMode: enabled,
    measureStart: null,
    measureEnd: null
  }),
  setMeasureStart: (pos) => set({ measureStart: pos }),
  setMeasureEnd: (pos) => set({ measureEnd: pos }),
  setCursorPosition: (pos) => set({ cursorPosition: pos })
}));

// Export debounced sync for use in components
export const debouncedSyncCombatState = debounce(() => {
  useCombatStore.getState().syncCombatState();
}, 500);

/**
 * Helper to parse combat tool responses and update store
 * Call this after receiving any combat tool response
 */
export function handleCombatToolResponse(responseText: string): void {
  const embedded = extractEmbeddedStateJson(responseText);
  if (embedded) {
    useCombatStore.getState().updateFromStateJson(embedded);
  }
}
