/**
 * ProceduralCreature.tsx
 * Low-poly procedural creature generation using Three.js primitives
 * 
 * Archetypes are built from capsules, spheres, boxes, and cones
 * to create silhouettes recognizable at game scale.
 */
import React, { useMemo } from 'react';

// Creature archetypes determine body construction
export type CreatureArchetype = 
  | 'humanoid'      // Bipedal - humans, elves, goblins, orcs
  | 'quadruped'     // 4 legs - wolves, horses, deer
  | 'beast'         // Hunched/ape-like - bears, apes, trolls
  | 'serpent'       // Elongated - snakes, worms, eels
  | 'avian'         // Winged - birds, harpies, dragons
  | 'arachnid'      // Multi-legged - spiders, scorpions
  | 'amorphous';    // Blob-like - oozes, elementals, slimes

// Size category affects scale
export type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

interface ProceduralCreatureProps {
  archetype: CreatureArchetype;
  size: CreatureSize;
  color: string;
  isSelected?: boolean;
  isEnemy?: boolean;
}

// Size multipliers for consistent scaling
const SIZE_SCALE: Record<CreatureSize, { radius: number; height: number }> = {
  Tiny:       { radius: 0.15, height: 0.3 },
  Small:      { radius: 0.25, height: 0.5 },
  Medium:     { radius: 0.35, height: 1.0 },
  Large:      { radius: 0.7,  height: 1.5 },
  Huge:       { radius: 1.2,  height: 2.5 },
  Gargantuan: { radius: 2.0,  height: 4.0 },
};

/**
 * Humanoid: Bipedal figure with distinct head/torso/limbs
 * - Capsule torso, sphere head, thin box limbs
 */
const HumanoidModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  const torsoHeight = height * 0.4;
  const legHeight = height * 0.35;
  const headRadius = radius * 0.6;
  
  return (
    <group>
      {/* Torso - elongated cylinder */}
      <mesh position={[0, legHeight + torsoHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.8, radius, torsoHeight, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Head - sphere */}
      <mesh position={[0, legHeight + torsoHeight + headRadius * 0.8, 0]} castShadow>
        <sphereGeometry args={[headRadius, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Legs - two thin cylinders */}
      <mesh position={[-radius * 0.35, legHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.2, radius * 0.25, legHeight, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      <mesh position={[radius * 0.35, legHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.2, radius * 0.25, legHeight, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Arms - thin horizontal */}
      <mesh position={[0, legHeight + torsoHeight * 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius * 0.12, radius * 0.15, radius * 2.5, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
    </group>
  );
};

/**
 * Quadruped: Four-legged creature (wolf, horse, etc.)
 * - Horizontal body, four legs, distinct head
 */
const QuadrupedModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  const bodyLength = radius * 2.5;
  const bodyHeight = height * 0.35;
  const legHeight = height * 0.4;
  
  return (
    <group>
      {/* Body - horizontal cylinder */}
      <mesh position={[0, legHeight + bodyHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[bodyHeight * 0.6, bodyHeight * 0.5, bodyLength, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Head - elongated sphere */}
      <mesh position={[bodyLength / 2 + radius * 0.3, legHeight + bodyHeight * 0.7, 0]} castShadow>
        <sphereGeometry args={[radius * 0.5, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Four legs */}
      {[
        [-bodyLength * 0.35, 0, -radius * 0.3],
        [-bodyLength * 0.35, 0, radius * 0.3],
        [bodyLength * 0.35, 0, -radius * 0.3],
        [bodyLength * 0.35, 0, radius * 0.3],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], legHeight / 2, pos[2]]} castShadow>
          <cylinderGeometry args={[radius * 0.12, radius * 0.15, legHeight, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Beast: Hunched, bulky creature (bear, troll, ape)
 * - Wide stance, massive torso, shorter legs
 */
const BeastModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  
  return (
    <group>
      {/* Massive hunched torso */}
      <mesh position={[0, height * 0.45, 0]} castShadow>
        <sphereGeometry args={[radius * 1.2, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Small head */}
      <mesh position={[radius * 0.3, height * 0.75, 0]} castShadow>
        <sphereGeometry args={[radius * 0.4, 6, 5]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Thick arms */}
      <mesh position={[-radius * 0.9, height * 0.3, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.25, radius * 0.3, height * 0.5, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      <mesh position={[radius * 0.9, height * 0.3, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.25, radius * 0.3, height * 0.5, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
      </mesh>
    </group>
  );
};

/**
 * Serpent: Elongated snake-like creature
 * - Series of connected spheres forming sinuous body
 */
const SerpentModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  const segments = 6;
  
  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const t = i / (segments - 1);
        const segRadius = radius * (0.6 - t * 0.3); // Taper toward tail
        const x = Math.sin(t * Math.PI * 1.5) * radius * 0.8;
        const y = (1 - t) * height * 0.4 + segRadius;
        const z = (t - 0.5) * radius * 2;
        
        return (
          <mesh key={i} position={[x, y, z]} castShadow>
            <sphereGeometry args={[segRadius, 6, 5]} />
            <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={emissive} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Avian: Winged creature (bird, harpy, dragon)
 * - Central body with triangular wings
 */
const AvianModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  
  return (
    <group>
      {/* Body */}
      <mesh position={[0, height * 0.5, 0]} castShadow>
        <sphereGeometry args={[radius * 0.8, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Head */}
      <mesh position={[radius * 0.5, height * 0.7, 0]} castShadow>
        <sphereGeometry args={[radius * 0.35, 6, 5]} />
        <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Wings - triangular cones */}
      <mesh position={[0, height * 0.55, -radius]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[radius * 0.8, radius * 2, 3]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      <mesh position={[0, height * 0.55, radius]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
        <coneGeometry args={[radius * 0.8, radius * 2, 3]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
    </group>
  );
};

/**
 * Arachnid: Multi-legged creature (spider, scorpion)
 * - Central body with 8 radiating legs
 */
const ArachnidModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  const legCount = 8;
  
  return (
    <group>
      {/* Body segments */}
      <mesh position={[0, height * 0.35, 0]} castShadow>
        <sphereGeometry args={[radius * 0.6, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      <mesh position={[-radius * 0.4, height * 0.3, 0]} castShadow>
        <sphereGeometry args={[radius * 0.5, 6, 5]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={emissive} />
      </mesh>
      
      {/* Radiating legs */}
      {Array.from({ length: legCount }).map((_, i) => {
        const angle = (i / legCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius * 0.5;
        const z = Math.sin(angle) * radius * 0.5;
        
        return (
          <mesh 
            key={i} 
            position={[x * 1.5, height * 0.2, z * 1.5]} 
            rotation={[0, -angle, Math.PI / 3]}
            castShadow
          >
            <cylinderGeometry args={[radius * 0.05, radius * 0.08, radius * 1.2, 4]} />
            <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={emissive} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Amorphous: Blob-like creature (ooze, elemental)
 * - Irregular stacked spheres
 */
const AmorphousModel: React.FC<{ scale: typeof SIZE_SCALE.Medium; color: string; emissive: number }> = 
  ({ scale, color, emissive }) => {
  const { radius, height } = scale;
  
  return (
    <group>
      {/* Main blob */}
      <mesh position={[0, height * 0.3, 0]} castShadow>
        <sphereGeometry args={[radius * 1.1, 8, 6]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          metalness={0.2}
          transparent 
          opacity={0.85}
          emissive={color} 
          emissiveIntensity={emissive * 1.5} 
        />
      </mesh>
      
      {/* Secondary bulges */}
      <mesh position={[radius * 0.4, height * 0.5, radius * 0.2]} castShadow>
        <sphereGeometry args={[radius * 0.5, 6, 5]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          transparent 
          opacity={0.8}
          emissive={color} 
          emissiveIntensity={emissive * 1.5} 
        />
      </mesh>
      <mesh position={[-radius * 0.3, height * 0.45, -radius * 0.3]} castShadow>
        <sphereGeometry args={[radius * 0.4, 6, 5]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          transparent 
          opacity={0.8}
          emissive={color} 
          emissiveIntensity={emissive * 1.5} 
        />
      </mesh>
    </group>
  );
};

/**
 * Main exported component - selects model based on archetype
 */
export const ProceduralCreature: React.FC<ProceduralCreatureProps> = ({
  archetype,
  size,
  color,
  isSelected = false,
  isEnemy: _isEnemy = false, // Reserved for future enemy-specific styling
}) => {
  const scale = SIZE_SCALE[size];
  const emissive = isSelected ? 0.4 : 0;
  
  const ModelComponent = useMemo(() => {
    switch (archetype) {
      case 'humanoid':  return HumanoidModel;
      case 'quadruped': return QuadrupedModel;
      case 'beast':     return BeastModel;
      case 'serpent':   return SerpentModel;
      case 'avian':     return AvianModel;
      case 'arachnid':  return ArachnidModel;
      case 'amorphous': return AmorphousModel;
      default:          return HumanoidModel;
    }
  }, [archetype]);
  
  return (
    <group>
      <ModelComponent scale={scale} color={color} emissive={emissive} />
      {isSelected && (
        <mesh position={[0, scale.height / 2, 0]}>
          <sphereGeometry args={[scale.radius * 1.5, 16, 12]} />
          <meshBasicMaterial color="yellow" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};

export default ProceduralCreature;
