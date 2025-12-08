import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { GridSystem } from './GridSystem';
import { CameraControls } from './CameraControls';
import { EntityLayer } from './EntityLayer';
import { TerrainLayer } from './Terrain';
import { LineOfSight } from './LineOfSight';
import { VisualizationControls } from './VisualizationControls';
import { CombatHUD } from '../hud/CombatHUD';
import { useCombatStore } from '../../stores/combatStore';

export const BattlemapCanvas: React.FC = () => {
  const battlefieldDescription = useCombatStore((state) => state.battlefieldDescription);
  const entities = useCombatStore((state) => state.entities);
  const showDescription = entities.length === 0 && battlefieldDescription;

  return (
    <div className="w-full h-full relative">
      {showDescription && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-8">
          <div className="bg-terminal-black/90 border border-terminal-green p-6 max-w-2xl rounded shadow-lg pointer-events-auto overflow-y-auto max-h-[80%]">
            <h3 className="text-xl font-bold text-terminal-green mb-4 uppercase tracking-wider border-b border-terminal-green-dim pb-2">
              Battlefield Status
            </h3>
            <div className="text-terminal-green-bright font-mono whitespace-pre-wrap leading-relaxed">
              {battlefieldDescription}
            </div>
          </div>
        </div>
      )}
      
      <VisualizationControls />
      
      {/* Combat HUD Overlay */}
      <CombatHUD />
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 50 }}
      >
        {/* Background Color (Terminal Black) */}
        <color attach="background" args={['#0a0a0a']} />

        {/* 3-Point Lighting System */}
        {/* Key Light: Main directional light from upper right */}
        <directionalLight
          position={[10, 15, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
        />
        
        {/* Fill Light: Softer light from the left to reduce harsh shadows */}
        <directionalLight
          position={[-8, 8, -3]}
          intensity={0.4}
          color="#b0c4de"
        />
        
        {/* Rim Light: Backlight to create edge definition */}
        <directionalLight
          position={[0, 5, -10]}
          intensity={0.3}
          color="#4a5f7f"
        />
        
        {/* Ambient Light: Soft base illumination */}
        <ambientLight intensity={0.3} />

        {/* Scene Components */}
        <GridSystem />
        <TerrainLayer />
        <EntityLayer />
        <LineOfSight />
        <CameraControls />

        {/* Dev Tools */}
        <Stats />
      </Canvas>
    </div>
  );
};