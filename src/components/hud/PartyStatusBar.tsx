import React from 'react';
import { useGameStateStore, CharacterStats } from '../../stores/gameStateStore';
import { ConditionList } from '../common/ConditionBadge';

/**
 * Displays status of party members.
 * Terminal-styled party status.
 */
export const PartyStatusBar: React.FC = () => {
  const party = useGameStateStore(s => s.party);
  const activeCharacterId = useGameStateStore(s => s.activeCharacterId);

  if (!party || party.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-4 animate-fade-in-up">
       {/* Header */}
       <div className="text-[10px] text-green-700 font-mono font-bold tracking-widest uppercase mb-2 pl-1">Party Roster</div>
       
       {party.map((char: CharacterStats) => {
         const isActive = char.id === activeCharacterId;
         const hpPercent = char.hp.max > 0 ? (char.hp.current / char.hp.max) * 100 : 0;
         
         return (
           <div 
             key={char.id}
             className={`
               p-3 border transition-colors w-56 font-mono rounded-sm relative overflow-hidden group
               ${isActive 
                 ? 'bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(0,255,65,0.1)]' 
                 : 'bg-black/80 border-green-900/30 hover:border-green-700'}
             `}
           >
             {/* Scanline effect overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none opacity-20" size-4px />

             <div className="relative z-10">
                <div className="flex justify-between items-center mb-2 border-b border-green-900/30 pb-1">
                    <span className={`font-bold text-sm truncate uppercase ${isActive ? 'text-green-300' : 'text-green-600'}`}>
                        {char.name}
                    </span>
                    <span className="text-[10px] text-green-800">LVL {char.level}</span>
                </div>
                
                {/* HP Bar */}
                <div className="w-full bg-green-900/20 h-1.5 border border-green-900/30 mb-1.5">
                    <div 
                    className={`h-full transition-all duration-500 ${hpPercent < 30 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${hpPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-green-500">HP {char.hp.current}/{char.hp.max}</span>
                    <span className="text-green-600">AC {char.armorClass || 10}</span>
                </div>
                {char.conditions && char.conditions.length > 0 && (
                  <div className="mt-2 text-left">
                    <ConditionList conditions={char.conditions} size="sm" limit={3} />
                  </div>
                )}
             </div>
           </div>
         );
       })}
    </div>
  );
};
