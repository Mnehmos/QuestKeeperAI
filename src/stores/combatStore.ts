import { create } from 'zustand';
import { CreatureSize } from '../utils/gridHelpers';

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

  addEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateEntityMetadata: (id: string, metadata: Partial<EntityMetadata>) => void;
  selectEntity: (id: string | null) => void;
  selectTerrain: (id: string | null) => void;
  setGridConfig: (config: GridConfig) => void;
  setBattlefieldDescription: (desc: string | null) => void;
  syncCombatState: () => Promise<void>;
}

const MOCK_ENTITIES: Entity[] = [];

function parseBattlefieldText(text: string): { entities: Entity[]; terrain: TerrainFeature[]; gridConfig: GridConfig } {
  const entities: Entity[] = [];
  const terrain: TerrainFeature[] = [];
  let gridConfig: GridConfig = { size: 20, divisions: 20 };
  
  console.log('[parseBattlefieldText] Raw text:', text);
  
  try {
    const battlefieldMatch = text.match(/⚔️\s+\*\*BATTLEFIELD\*\*:\s+(\d+)×(\d+)\s+squares/);
    if (battlefieldMatch) {
      const width = parseInt(battlefieldMatch[1]);
      const height = parseInt(battlefieldMatch[2]);
      gridConfig = { size: Math.max(width, height), divisions: Math.max(width, height) };
    }
    
    // Parse terrain section
    const terrainSectionMatch = text.match(/🏗️\s+\*\*TERRAIN\*\*:([\s\S]*?)(?=👥\s+\*\*COMBATANTS\*\*:|$)/);
    if (terrainSectionMatch) {
      const terrainSection = terrainSectionMatch[1];
      console.log('[parseBattlefieldText] Terrain section found:', terrainSection);
      
      // Split by bullet point '•' to handle both newline and inline formatting
      const terrainItems = terrainSection.split('•')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      console.log('[parseBattlefieldText] Found', terrainItems.length, 'terrain items');
      
      terrainItems.forEach((item, index) => {
        try {
          // Example: Wall at (5,3) - 1×1×5ft [blocks movement]
          const posMatch = item.match(/at\s+\((\d+),(\d+)\)\s*-\s*(\d+)×(\d+)×(\d+)ft/);
          const typeMatch = item.match(/^([^\s]+)/);
          
          if (posMatch && typeMatch) {
            const mcpX = parseInt(posMatch[1]);
            const mcpY = parseInt(posMatch[2]);
            const widthFt = parseInt(posMatch[3]);
            const lengthFt = parseInt(posMatch[4]); // 2D depth/length
            const heightFt = parseInt(posMatch[5]); // Vertical height
            const terrainType = typeMatch[1].toLowerCase();
            
            const blocksMovement = item.includes('[blocks movement]');
            let coverType: 'half' | 'three-quarters' | 'full' | 'none' = 'none';
            if (item.includes('[half cover]')) coverType = 'half';
            else if (item.includes('[three-quarters cover]')) coverType = 'three-quarters';
            else if (item.includes('[full cover]')) coverType = 'full';
            
            let color = '#808080';
            if (terrainType === 'wall') color = '#555555';
            else if (terrainType === 'pillar') color = '#666666';
            else if (terrainType.includes('difficult')) color = '#8b4513';
            
            // Convert dimensions (5ft = 1 grid unit)
            const width = widthFt / 5;
            const depth = lengthFt / 5; // Z-axis dimension
            let height = heightFt / 5;  // Y-axis dimension
            
            // Flatten difficult terrain if it's not blocking movement or explicitly tall
            if (terrainType.includes('difficult') && !blocksMovement) {
               height = 0.1;
            }

            // Transform MCP coords (0-20) to visualizer coords (centered at 0,0)
            // Add 0.5 to center features within their grid square
            const visualizerX = mcpX - (gridConfig.size / 2) + 0.5;
            const visualizerZ = mcpY - (gridConfig.size / 2) + 0.5;
            
            terrain.push({
              id: `terrain-${index}-${terrainType}`,
              type: terrainType,
              position: { x: visualizerX, y: height / 2, z: visualizerZ },
              dimensions: { width, height, depth },
              blocksMovement,
              coverType,
              color
            });
            
            console.log(`[parseBattlefieldText] Parsed terrain: ${terrainType} at MCP(${mcpX},${mcpY}) => Vis(${visualizerX},${visualizerZ})`);
          }
        } catch (err) {
          console.warn('[parseBattlefieldText] Failed to parse terrain item:', item, err);
        }
      });
    }
    
    const combatantsSection = text.split('👥 **COMBATANTS**:')[1];
    
    if (combatantsSection) {
      const creatureLines = combatantsSection.split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.trim().substring(1).trim());
      
      console.log('[parseBattlefieldText] Found', creatureLines.length, 'creature lines');
      
      creatureLines.forEach((line, index) => {
        try {
          console.log('[parseBattlefieldText] Parsing line:', line);
          const nameMatch = line.match(/^(.+?)\s+at\s+\((\d+),(\d+),(\d+)\)/);
          if (!nameMatch) {
            console.warn('[parseBattlefieldText] No name match for line:', line);
            return;
          }
          
          const name = nameMatch[1].trim();
          const mcpX = parseInt(nameMatch[2]);
          const mcpY = parseInt(nameMatch[3]);
          const mcpZ = parseInt(nameMatch[4]);
          
          console.log(`[parseBattlefieldText] MCP coords: (${mcpX}, ${mcpY}, ${mcpZ})`);
          
          const sizeMatch = line.match(/(tiny|small|medium|large|huge|gargantuan)\s+creature/i);
          const sizeLower = (sizeMatch ? sizeMatch[1].toLowerCase() : 'medium');
          const size = (sizeLower.charAt(0).toUpperCase() + sizeLower.slice(1)) as CreatureSize;
          
          let color = '#00ff00';
          let type: 'character' | 'npc' | 'monster' = 'character';
          
          const lowerName = name.toLowerCase();
          if (lowerName.includes('goblin') || lowerName.includes('orc') || lowerName.includes('dragon')) {
            color = '#ff0000';
            type = 'monster';
          } else if (index === 0) {
            color = '#00ff00';
            type = 'character';
          } else {
            color = '#ffaa00';
            type = 'npc';
          }
          
          // Transform MCP coords (0-20) to visualizer coords (centered at 0,0)
          // Token.tsx handles the centering offset via calculateGridPosition, so we pass the base integer coord here
          const visualizerX = mcpX - (gridConfig.size / 2);
          const visualizerZ = mcpY - (gridConfig.size / 2);
          
          const entity = {
            id: `creature-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name,
            type,
            size,
            position: { x: visualizerX, y: mcpZ, z: visualizerZ },
            color,
            model: (size === 'Small' || size === 'Tiny') ? 'sphere' : 'box',
            metadata: {
              hp: { current: 20, max: 20 },
              ac: 15,
              creatureType: 'Unknown',
              conditions: []
            }
          };
          
          console.log(`[parseBattlefieldText] Created entity at MCP(${mcpX},${mcpY}) => Vis(${visualizerX},${visualizerZ})`);
          entities.push(entity);
        } catch (err) {
          console.warn('[parseBattlefieldText] Failed to parse creature line:', line, err);
        }
      });
    }
    
  } catch (error) {
    console.error('[parseBattlefieldText] Error parsing battlefield text:', error);
  }
  
  return { entities, terrain, gridConfig };
}

export const useCombatStore = create<CombatState>((set) => ({
  entities: MOCK_ENTITIES,
  terrain: [],
  selectedEntityId: null,
  selectedTerrainId: null,
  gridConfig: { size: 10, divisions: 10 },
  battlefieldDescription: null,

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

  syncCombatState: async () => {
    try {
      const { mcpManager } = await import('../services/mcpClient');
      
      try {
        console.log('[syncCombatState] Calling describe_battlefield...');
        const result = await mcpManager.combatClient.callTool('describe_battlefield', {});
        
        if (result && result.content && result.content[0].text) {
             const text = result.content[0].text;
             console.log('[syncCombatState] Received battlefield text');
             set({ battlefieldDescription: text });
             
             const parsedState = parseBattlefieldText(text);
             
             console.log('[syncCombatState] Parsed', parsedState.entities.length, 'entities');
             console.log('[syncCombatState] Parsed', parsedState.terrain.length, 'terrain features');
             
             if (parsedState.entities.length > 0 || parsedState.terrain.length > 0) {
               set({ 
                 entities: parsedState.entities,
                 terrain: parsedState.terrain,
                 gridConfig: parsedState.gridConfig
               });
             } else {
               console.warn('[syncCombatState] No entities/terrain parsed, keeping current state');
             }
        }
      } catch (e) {
        console.warn('[syncCombatState] Failed to sync combat state:', e);
      }
    } catch (error) {
      console.error('[syncCombatState] Error syncing combat state:', error);
    }
  }
}));