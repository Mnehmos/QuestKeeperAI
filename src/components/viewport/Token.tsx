import React, { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { Mesh } from 'three';
import { Entity, useCombatStore } from '../../stores/combatStore';
import { calculateGridPosition, CREATURE_SIZE_MAP } from '../../utils/gridHelpers';
import { EntityTooltip } from './EntityTooltip';

interface TokenProps {
  entity: Entity;
  isSelected: boolean;
}

export const Token: React.FC<TokenProps> = ({ entity, isSelected }) => {
  const meshRef = useRef<Mesh>(null);
  const selectEntity = useCombatStore((state) => state.selectEntity);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEntity(entity.id);
  };

  // Calculate position based on grid snapping rules
  const position = calculateGridPosition(entity.position.x, entity.position.z, entity.size);
  
  // Calculate dimensions based on size category
  const units = CREATURE_SIZE_MAP[entity.size];
  let height: number;
  let geometry: React.ReactElement;
  const emissiveIntensity = isSelected ? 0.3 : 0;

  switch (entity.size) {
    case 'Tiny':
    case 'Small':
      // Small creatures: short cylinders
      height = 0.6;
      geometry = <cylinderGeometry args={[units / 2, units / 2, height, 16]} />;
      break;
    
    case 'Medium':
    case 'Large':
      // Humanoid-like: capsule shapes (cylinder)
      height = entity.size === 'Medium' ? 1.2 : 1.6;
      const radius = units / 3;
      geometry = <cylinderGeometry args={[radius, radius, height * 0.6, 12]} />;
      break;
    
    case 'Huge':
    case 'Gargantuan':
      // Massive creatures: hexagonal prisms
      height = entity.size === 'Huge' ? 2.0 : 3.0;
      const hexRadius = units / 2.2;
      geometry = <cylinderGeometry args={[hexRadius, hexRadius, height, 6]} />;
      break;
    
    default:
      // Fallback to medium
      height = 1.2;
      geometry = <cylinderGeometry args={[units / 3, units / 3, height * 0.6, 12]} />;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial
        color={entity.color}
        roughness={0.6}
        metalness={0.2}
        emissive={entity.color}
        emissiveIntensity={emissiveIntensity}
      />
      {isSelected && (
        <>
          <Edges
            scale={1.05}
            threshold={15}
            color="yellow"
          />
          <group position={[0, height / 2 + 0.5, 0]}>
            <EntityTooltip entity={entity} />
          </group>
        </>
      )}
    </mesh>
  );
};