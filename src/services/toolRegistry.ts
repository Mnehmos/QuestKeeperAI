import { useCombatStore, Entity, Vector3, EntityMetadata } from '../stores/combatStore';
import { CreatureSize } from '../utils/gridHelpers';
import { v4 as uuidv4 } from 'uuid';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema definition
  execute: (args: any) => void;
}

// Helper to generate unique IDs
const generateId = () => uuidv4();

export const tools: Record<string, ToolDefinition> = {
  spawn_entity: {
    name: 'spawn_entity',
    description: 'Spawns a new entity (character, monster, or NPC) on the battlemap.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the entity' },
        type: { type: 'string', enum: ['character', 'npc', 'monster'], description: 'Type of entity' },
        color: { type: 'string', description: 'Hex color code for the token' },
        size: { type: 'string', enum: ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'], description: 'Size category' },
        hp: { 
          type: 'object', 
          properties: {
            current: { type: 'number' },
            max: { type: 'number' }
          },
          required: ['current', 'max']
        },
        ac: { type: 'number', description: 'Armor Class' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        }
      },
      required: ['name', 'type', 'color', 'size', 'hp', 'ac', 'position']
    },
    execute: (args: {
      name: string;
      type: 'character' | 'npc' | 'monster';
      color: string;
      size: CreatureSize;
      hp: { current: number; max: number };
      ac: number;
      position: Vector3;
    }) => {
      const store = useCombatStore.getState();
      
      const newEntity: Entity = {
        id: generateId(),
        name: args.name,
        type: args.type,
        size: args.size,
        position: args.position,
        color: args.color,
        model: 'box', // Default model
        metadata: {
          hp: args.hp,
          ac: args.ac,
          creatureType: 'Unknown', // Default
          conditions: []
        }
      };

      store.addEntity(newEntity);
      console.log(`[Tool] Spawned entity ${newEntity.id} (${newEntity.name}) at`, newEntity.position);
    }
  },

  move_entity: {
    name: 'move_entity',
    description: 'Moves an existing entity to a new position.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the entity to move' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' }
          },
          required: ['x', 'y', 'z']
        }
      },
      required: ['id', 'position']
    },
    execute: (args: { id: string; position: Vector3 }) => {
      const store = useCombatStore.getState();
      const entity = store.entities.find(e => e.id === args.id);
      
      if (entity) {
        store.updateEntity(args.id, { position: args.position });
        console.log(`[Tool] Moved entity ${args.id} to`, args.position);
      } else {
        console.warn(`[Tool] move_entity failed: Entity ${args.id} not found`);
      }
    }
  },

  update_stats: {
    name: 'update_stats',
    description: 'Updates the stats (HP, AC, conditions) of an entity.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the entity' },
        hp: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            max: { type: 'number' },
            temp: { type: 'number' }
          }
        },
        ac: { type: 'number', description: 'Armor Class' },
        conditions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of active conditions'
        }
      },
      required: ['id']
    },
    execute: (args: {
      id: string;
      hp?: Partial<{ current: number; max: number; temp: number }>;
      ac?: number;
      conditions?: string[];
    }) => {
      const store = useCombatStore.getState();
      const entity = store.entities.find(e => e.id === args.id);

      if (entity) {
        const metadataUpdates: Partial<EntityMetadata> = {};
        if (args.hp) metadataUpdates.hp = { ...entity.metadata.hp, ...args.hp };
        if (args.ac !== undefined) metadataUpdates.ac = args.ac;
        if (args.conditions) metadataUpdates.conditions = args.conditions;

        store.updateEntityMetadata(args.id, metadataUpdates);
        console.log(`[Tool] Updated stats for entity ${args.id}`, metadataUpdates);
      } else {
        console.warn(`[Tool] update_stats failed: Entity ${args.id} not found`);
      }
    }
  },

  delete_entity: {
    name: 'delete_entity',
    description: 'Removes an entity from the battlemap.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the entity to delete' }
      },
      required: ['id']
    },
    execute: (args: { id: string }) => {
      const store = useCombatStore.getState();
      const entity = store.entities.find(e => e.id === args.id);

      if (entity) {
        store.removeEntity(args.id);
        console.log(`[Tool] Deleted entity ${args.id}`);
      } else {
        console.warn(`[Tool] delete_entity failed: Entity ${args.id} not found`);
      }
    }
  }
};

export const executeTool = (toolName: string, args: any) => {
  const tool = tools[toolName];
  if (!tool) {
    console.error(`[ToolRegistry] Unknown tool: ${toolName}`);
    return;
  }
  
  try {
    // In a real app, we might validate args against tool.parameters JSON schema here
    tool.execute(args);
  } catch (error) {
    console.error(`[ToolRegistry] Error executing ${toolName}:`, error);
  }
};