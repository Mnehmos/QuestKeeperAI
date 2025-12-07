import React from 'react';
import { Html } from '@react-three/drei';
import { TerrainFeature } from '../../stores/combatStore';

interface TerrainTooltipProps {
  feature: TerrainFeature;
}

export const TerrainTooltip: React.FC<TerrainTooltipProps> = ({ feature }) => {
  const { type, dimensions, blocksMovement, coverType, label, description: _description } = feature;
  
  // Use label for named props (landmarks), fallback to type
  const displayName = label || type;

  return (
    <Html
      position={[0, 0, 0]}
      center
      style={{
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <div className="bg-terminal-black/90 border border-yellow-500 text-yellow-300 font-mono text-xs p-2 rounded shadow-[0_0_10px_rgba(255,200,0,0.3)] min-w-[150px]">
        {/* Header */}
        <div className="border-b border-yellow-500/50 pb-1 mb-2">
          <div className="font-bold text-sm text-glow uppercase">{displayName}</div>
          {label && <div className="text-[10px] text-yellow-300/60 capitalize">{type}</div>}
        </div>

        {/* Properties Grid */}
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-yellow-300/70">Size:</span>
            <span>{dimensions.width}×{dimensions.depth}×{dimensions.height} units</span>
          </div>
          
          {blocksMovement && (
            <div className="text-red-400">
              🚫 Blocks Movement
            </div>
          )}
          
          {coverType && coverType !== 'none' && (
            <div className="text-blue-400">
              🛡️ {coverType} Cover
            </div>
          )}
        </div>
      </div>
    </Html>
  );
};
