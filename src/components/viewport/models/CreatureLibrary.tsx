/**
 * CreatureLibrary.tsx
 * 25 specific creature visual components mapped to modelRegistry tags.
 * Each component customizes the procedural archetypes with creature-specific styling.
 */
import React from 'react';
import { MODEL_REGISTRY, ModelDefinition } from './modelRegistry';
import { ProceduralCreature, CreatureSize } from './ProceduralCreature';

export interface CreatureComponentProps {
  size?: CreatureSize;
  color?: string;
  isSelected?: boolean;
  isEnemy?: boolean;
}

/**
 * Factory to create creature components from modelRegistry definitions
 */
function createCreatureComponent(modelTag: string, def: ModelDefinition): React.FC<CreatureComponentProps> {
  const Component: React.FC<CreatureComponentProps> = ({
    size = def.defaultSize,
    color = def.defaultColor,
    isSelected = false,
    isEnemy = false,
  }) => (
    <ProceduralCreature
      archetype={def.baseArchetype}
      size={size}
      color={color}
      isSelected={isSelected}
      isEnemy={isEnemy}
    />
  );
  Component.displayName = `Creature_${modelTag}`;
  return Component;
}

/**
 * Map of all 25 creature components keyed by modelTag
 */
export const CREATURE_COMPONENTS: Record<string, React.FC<CreatureComponentProps>> = {};

// Generate components for all registry entries
for (const [tag, def] of Object.entries(MODEL_REGISTRY)) {
  CREATURE_COMPONENTS[tag] = createCreatureComponent(tag, def);
}

/**
 * Get a creature component by modelTag
 * Returns null if tag not found
 */
export function getCreatureComponent(modelTag: string): React.FC<CreatureComponentProps> | null {
  return CREATURE_COMPONENTS[modelTag.toLowerCase()] || null;
}

// Named exports for convenience (optional direct imports)
export const Knight = CREATURE_COMPONENTS.knight;
export const Wizard = CREATURE_COMPONENTS.wizard;
export const Rogue = CREATURE_COMPONENTS.rogue;
export const Cleric = CREATURE_COMPONENTS.cleric;
export const Goblin = CREATURE_COMPONENTS.goblin;
export const Orc = CREATURE_COMPONENTS.orc;
export const Wolf = CREATURE_COMPONENTS.wolf;
export const Bear = CREATURE_COMPONENTS.bear;
export const Horse = CREATURE_COMPONENTS.horse;
export const Boar = CREATURE_COMPONENTS.boar;
export const GiantRat = CREATURE_COMPONENTS.giant_rat;
export const Dragon = CREATURE_COMPONENTS.dragon;
export const Skeleton = CREATURE_COMPONENTS.skeleton;
export const Zombie = CREATURE_COMPONENTS.zombie;
export const Spider = CREATURE_COMPONENTS.spider;
export const Slime = CREATURE_COMPONENTS.slime;
export const Troll = CREATURE_COMPONENTS.troll;
export const Beholder = CREATURE_COMPONENTS.beholder;
export const Mimic = CREATURE_COMPONENTS.mimic;
export const FireElemental = CREATURE_COMPONENTS.fire_elemental;
export const WaterElemental = CREATURE_COMPONENTS.water_elemental;
export const EarthElemental = CREATURE_COMPONENTS.earth_elemental;
export const AirElemental = CREATURE_COMPONENTS.air_elemental;
export const Treant = CREATURE_COMPONENTS.treant;
export const Ghost = CREATURE_COMPONENTS.ghost;
