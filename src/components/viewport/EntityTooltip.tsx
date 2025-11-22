import React from 'react';
import { Html } from '@react-three/drei';
import { Entity } from '../../stores/combatStore';

interface EntityTooltipProps {
  entity: Entity;
}

export const EntityTooltip: React.FC<EntityTooltipProps> = ({ entity }) => {
  const { name, metadata } = entity;
  const { hp, ac, creatureType, conditions } = metadata;

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
      <div className="bg-terminal-black/90 border border-terminal-green text-terminal-green font-mono text-xs p-2 rounded shadow-[0_0_10px_rgba(0,255,65,0.2)] min-w-[150px]">
        {/* Header */}
        <div className="border-b border-terminal-green/50 pb-1 mb-2">
          <div className="font-bold text-sm text-glow">{name}</div>
          <div className="text-[10px] text-terminal-green/70 uppercase tracking-wider">
            {creatureType}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
          <div className="flex justify-between">
            <span className="text-terminal-green/70">HP:</span>
            <span className={hp.current < hp.max / 2 ? "text-red-500" : ""}>
              {hp.current}/{hp.max}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-green/70">AC:</span>
            <span>{ac}</span>
          </div>
        </div>

        {/* Conditions */}
        {conditions && conditions.length > 0 && (
          <div className="border-t border-terminal-green/50 pt-1 mt-1">
            <div className="flex flex-wrap gap-1">
              {conditions.map((condition, index) => (
                <span 
                  key={index}
                  className="text-[9px] bg-terminal-green/20 px-1 rounded text-terminal-green"
                >
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
};