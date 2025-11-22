import React from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';

export const CharacterHeader: React.FC = () => {
  const activeCharacter = useGameStateStore(state => state.activeCharacter);

  if (!activeCharacter) {
    return (
      <div className="bg-terminal-dim border-b border-terminal-green-dim p-2 text-terminal-green/60 text-xs font-mono">
        NO ACTIVE CHARACTER LINKED
      </div>
    );
  }

  return (
    <div className="bg-terminal-dim border-b border-terminal-green-dim p-3 flex items-center justify-between font-mono text-sm">
      <div className="flex items-center space-x-4">
        {/* Portrait Placeholder */}
        <div className="w-10 h-10 border border-terminal-green bg-terminal-black flex items-center justify-center text-xs font-bold">
          {activeCharacter.name.substring(0, 2).toUpperCase()}
        </div>
        
        <div>
          <div className="font-bold text-terminal-green uppercase tracking-wider">
            {activeCharacter.name}
          </div>
          <div className="text-terminal-green/60 text-xs">
            LVL {activeCharacter.level} {activeCharacter.class}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* HP Bar */}
        <div className="flex flex-col w-32">
          <div className="flex justify-between text-xs mb-1">
            <span>HP</span>
            <span>{activeCharacter.hp.current}/{activeCharacter.hp.max}</span>
          </div>
          <div className="h-2 bg-terminal-black border border-terminal-green-dim relative">
            <div 
              className="absolute top-0 left-0 h-full bg-terminal-green transition-all duration-300"
              style={{ width: `${(activeCharacter.hp.current / activeCharacter.hp.max) * 100}%` }}
            />
          </div>
        </div>

        {/* XP Bar */}
        <div className="flex flex-col w-24">
          <div className="flex justify-between text-xs mb-1">
            <span>XP</span>
            <span>{activeCharacter.xp.current}/{activeCharacter.xp.max}</span>
          </div>
          <div className="h-1 bg-terminal-black border border-terminal-green-dim relative">
            <div 
              className="absolute top-0 left-0 h-full bg-terminal-green/60 transition-all duration-300"
              style={{ width: `${(activeCharacter.xp.current / activeCharacter.xp.max) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
