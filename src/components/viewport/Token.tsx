import React, { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { Mesh } from 'three';
import { Entity, useCombatStore } from '../../stores/combatStore';
import { calculateGridPosition, CREATURE_SIZE_MAP, getElevationAt } from '../../utils/gridHelpers';
import { EntityTooltip } from './EntityTooltip';
import { ProceduralCreature, CreatureArchetype } from './models';
import { getCreatureComponent } from './models/CreatureLibrary';
import { getModelDefinition, inferModelTagFromName } from './models/modelRegistry';

interface TokenProps {
  entity: Entity;
  isSelected: boolean;
}

/**
 * Infer creature archetype from name patterns if not explicitly set
 */
function inferArchetype(name: string): CreatureArchetype {
  const lowerName = name.toLowerCase();
  
  // Quadrupeds
  if (/\b(wolf|dog|horse|deer|elk|boar|bear|lion|tiger|panther|cat|hound|steed|mount)\b/.test(lowerName)) {
    return 'quadruped';
  }
  
  // Serpents
  if (/\b(snake|serpent|worm|eel|naga|wyrm|basilisk)\b/.test(lowerName)) {
    return 'serpent';
  }
  
  // Avians
  if (/\b(dragon|wyvern|harpy|eagle|hawk|owl|raven|crow|griffon|pegasus|bat|bird|drake)\b/.test(lowerName)) {
    return 'avian';
  }
  
  // Arachnids
  if (/\b(spider|scorpion|crab|beetle|insect|ant|centipede)\b/.test(lowerName)) {
    return 'arachnid';
  }
  
  // Beasts (hunched/bulky)
  if (/\b(troll|ogre|giant|ape|yeti|sasquatch|gorilla|minotaur)\b/.test(lowerName)) {
    return 'beast';
  }
  
  // Amorphous
  if (/\b(ooze|slime|blob|jelly|elemental|pudding|cube)\b/.test(lowerName)) {
    return 'amorphous';
  }
  
  // Default to humanoid for most creatures
  return 'humanoid';
}

export const Token: React.FC<TokenProps> = ({ entity, isSelected }) => {
  const meshRef = useRef<Mesh>(null);
  const selectEntity = useCombatStore((state) => state.selectEntity);
  const measureMode = useCombatStore((state) => state.measureMode);
  const measureStart = useCombatStore((state) => state.measureStart);
  const measureEnd = useCombatStore((state) => state.measureEnd);
  const setMeasureStart = useCombatStore((state) => state.setMeasureStart);
  const setMeasureEnd = useCombatStore((state) => state.setMeasureEnd);
  const setCursorPosition = useCombatStore((state) => state.setCursorPosition);
  const setClickedTileCoord = useCombatStore((state) => state.setClickedTileCoord);

  const handlePointerMove = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const vizX = Math.floor(entity.position.x);
    const vizZ = Math.floor(entity.position.z);
    setCursorPosition({ x: vizX, y: vizZ });
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    
    if (measureMode) {
      // Use entity's grid position for measurement
      const vizX = Math.floor(entity.position.x);
      const vizZ = Math.floor(entity.position.z);
      
      if (!measureStart) {
        setMeasureStart({ x: vizX, y: vizZ });
      } else if (!measureEnd) {
        setMeasureEnd({ x: vizX, y: vizZ });
      } else {
        // Reset and start new measurement
        setMeasureStart({ x: vizX, y: vizZ });
        setMeasureEnd(null);
      }
      return;
    }

    // Update clicked tile for consistency (highlighting)
    const mcpX = Math.floor(entity.position.x) + 10;
    const mcpZ = Math.floor(entity.position.z) + 10;
    setClickedTileCoord({ x: mcpX, y: mcpZ });

    // Toggle: if already selected, deselect; otherwise select
    selectEntity(isSelected ? null : entity.id);
  };

  // Calculate position based on grid snapping rules
  // For procedural models, we pass y=0 since they have feet at ground level
  // For fallback cylinders, use the default STANDARD_HEIGHT/2 centering
  const useProceduralModel = true; // Set to false to revert to cylinders
  
  // Get terrain elevation at this entity's grid position
  // This handles standing on difficult terrain, obstacles, etc.
  const terrain = useCombatStore((state) => state.terrain);
  const entities = useCombatStore((state) => state.entities);
  const mcpX = Math.floor(entity.position.x) + 10;
  const mcpZ = Math.floor(entity.position.z) + 10;
  
  // Calculate surface height at this position (terrain + stacked entities)
  const surfaceY = getElevationAt(mcpX, mcpZ, terrain, entities, { ignoreEntityIds: [entity.id] });
  
  // Procedural models have feet at y=0, so we use the surface elevation
  const yPosition = useProceduralModel ? surfaceY : undefined;
  
  const position = calculateGridPosition(entity.position.x, entity.position.z, entity.size, yPosition);
  
  // Determine archetype for model rendering
  const archetype: CreatureArchetype = entity.archetype || inferArchetype(entity.name);
  
  // Calculate dimensions based on size category for fallback/hitbox
  const units = CREATURE_SIZE_MAP[entity.size];
  let height: number;

  switch (entity.size) {
    case 'Tiny':
    case 'Small':
      height = 0.6;
      break;
    case 'Medium':
    case 'Large':
      height = entity.size === 'Medium' ? 1.2 : 1.6;
      break;
    case 'Huge':
    case 'Gargantuan':
      height = entity.size === 'Huge' ? 2.0 : 3.0;
      break;
    default:
      height = 1.2;
  }

  return (
    <group
      ref={meshRef as any}
      position={position}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
    >
      {useProceduralModel ? (
        (() => {
          // Priority 1: explicit modelTag
          // Priority 2: infer from name using registry
          // Priority 3: fallback to archetype-based ProceduralCreature
          const modelTag = entity.modelTag || inferModelTagFromName(entity.name);
          const SpecificComponent = modelTag ? getCreatureComponent(modelTag) : null;
          const modelDef = modelTag ? getModelDefinition(modelTag) : null;
          
          if (SpecificComponent) {
            return (
              <SpecificComponent
                size={entity.size}
                color={entity.color || modelDef?.defaultColor}
                isSelected={isSelected}
                isEnemy={entity.type === 'monster'}
              />
            );
          }
          
          // Fallback to archetype-based rendering
          return (
            <ProceduralCreature
              archetype={archetype}
              size={entity.size}
              color={entity.color}
              isSelected={isSelected}
              isEnemy={entity.type === 'monster'}
            />
          );
        })()
      ) : (
        // Fallback: Original cylinder geometry
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[units / 3, units / 3, height * 0.6, 12]} />
          <meshStandardMaterial
            color={entity.color}
            roughness={0.6}
            metalness={0.2}
            emissive={entity.color}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
          {isSelected && (
            <Edges
              scale={1.05}
              threshold={15}
              color="yellow"
            />
          )}
        </mesh>
      )}
      
      {/* Tooltip always shown when selected */}
      {isSelected && (
        <group position={[0, height / 2 + 0.5, 0]}>
          <EntityTooltip entity={entity} />
        </group>
      )}
    </group>
  );
};