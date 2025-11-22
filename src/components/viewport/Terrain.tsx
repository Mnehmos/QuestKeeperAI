import React, { useMemo, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useCombatStore, type TerrainFeature } from '../../stores/combatStore';
import { TerrainTooltip } from './TerrainTooltip';

interface TerrainProps {
  feature: TerrainFeature;
  allTerrain: TerrainFeature[];
}

// Helper to check if two terrain pieces are adjacent
function areAdjacent(t1: TerrainFeature, t2: TerrainFeature): boolean {
  if (t1.type !== t2.type || t1.type !== 'wall') return false;
  
  const dx = Math.abs(t1.position.x - t2.position.x);
  const dz = Math.abs(t1.position.z - t2.position.z);
  const dy = Math.abs(t1.position.y - t2.position.y);
  
  // Adjacent if exactly 1 unit apart in x or z, and same y
  return dy < 0.1 && ((dx === 1 && dz < 0.1) || (dz === 1 && dx < 0.1));
}

// Helper to find connected wall group
function findConnectedWalls(start: TerrainFeature, all: TerrainFeature[]): TerrainFeature[] {
  const visited = new Set<string>();
  const group: TerrainFeature[] = [];
  const queue = [start];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    
    visited.add(current.id);
    group.push(current);
    
    // Find all adjacent walls
    for (const terrain of all) {
      if (!visited.has(terrain.id) && areAdjacent(current, terrain)) {
        queue.push(terrain);
      }
    }
  }
  
  return group;
}

export const Terrain: React.FC<TerrainProps> = ({ feature, allTerrain }) => {
  const { dimensions, position, color, type } = feature;
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
    console.log('[Terrain] Clicked:', feature.type, 'at', feature.position);
  };
  
  // For walls, calculate connected geometry
  const wallGeometry = useMemo(() => {
    if (type !== 'wall') return null;
    
    const connectedWalls = findConnectedWalls(feature, allTerrain.filter(t => t.type === 'wall'));
    
    // Calculate bounding box for all connected walls
    if (connectedWalls.length === 0) return null;
    
    const minX = Math.min(...connectedWalls.map(w => w.position.x - w.dimensions.width / 2));
    const maxX = Math.max(...connectedWalls.map(w => w.position.x + w.dimensions.width / 2));
    const minZ = Math.min(...connectedWalls.map(w => w.position.z - w.dimensions.depth / 2));
    const maxZ = Math.max(...connectedWalls.map(w => w.position.z + w.dimensions.depth / 2));
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const width = maxX - minX;
    const depth = maxZ - minZ;
    
    return {
      center: { x: centerX, y: position.y, z: centerZ },
      dimensions: { width, height: dimensions.height, depth },
      tiles: connectedWalls
    };
  }, [feature, allTerrain, type, position, dimensions]);

  // For walls, render merged geometry
  if (type === 'wall' && wallGeometry) {
    // Only render if this is the "leader" wall in the group (by ID) to avoid duplicates
    const isGroupLeader = wallGeometry.tiles.sort((a, b) => a.id.localeCompare(b.id))[0].id === feature.id;
    
    if (!isGroupLeader) return null;
    
    return (
      <group onClick={handleClick}>
        <mesh position={[wallGeometry.center.x, wallGeometry.center.y, wallGeometry.center.z]} castShadow receiveShadow>
          <boxGeometry args={[wallGeometry.dimensions.width, wallGeometry.dimensions.height, wallGeometry.dimensions.depth]} />
          <meshStandardMaterial 
            color={color}
            roughness={0.8}
            metalness={0.3}
          />
          <Edges color="#1a1a1a" linewidth={1.5} />
        </mesh>
        {showTooltip && <TerrainTooltip feature={feature} />}
      </group>
    );
  }

  // Render non-wall terrain normally
  return (
    <group onClick={handleClick}>
      <mesh position={[position.x, position.y, position.z]} castShadow receiveShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial 
          color={color}
          roughness={type === 'water' ? 0.1 : 0.7}
          metalness={type === 'water' ? 0.3 : 0.1}
          transparent={type === 'water'}
          opacity={type === 'water' ? 0.6 : 1.0}
        />
      </mesh>
      {showTooltip && <TerrainTooltip feature={feature} />}
    </group>
  );
};

export const TerrainLayer: React.FC = () => {
  const terrain = useCombatStore((state) => state.terrain);

  return (
    <>
      {terrain.map((feature) => (
        <Terrain key={feature.id} feature={feature} allTerrain={terrain} />
      ))}
    </>
  );
};
