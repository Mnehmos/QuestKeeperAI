import React from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';

export const CharacterSheetView: React.FC = () => {
  const { activeCharacter } = useGameStateStore();

  if (!activeCharacter) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 text-terminal-green/60">
        <div className="text-center space-y-4">
          <p className="text-xl">NO CHARACTER DATA DETECTED</p>
          <p className="text-sm">Initialize character via terminal to view stats.</p>
        </div>
      </div>
    );
  }

  const { name, level, class: charClass, hp, xp, stats } = activeCharacter;

  // Helper to calculate modifier
  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const StatBlock = ({ label, value }: { label: string; value: number }) => (
    <div className="flex flex-col items-center p-4 border border-terminal-green/30 bg-terminal-green/5">
      <span className="text-sm text-terminal-green/60 uppercase tracking-wider mb-1">{label}</span>
      <span className="text-3xl font-bold mb-1">{value}</span>
      <span className="text-sm font-bold bg-terminal-green text-terminal-black px-2 rounded">
        {getMod(value)}
      </span>
    </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-terminal-green/20 scrollbar-track-transparent">
      {/* Header Section */}
      <div className="border-b-2 border-terminal-green pb-6 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold mb-2 uppercase">{name}</h1>
            <div className="flex space-x-4 text-lg text-terminal-green/80">
              <span>LVL {level}</span>
              <span>{charClass}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-sm text-terminal-green/60 mr-2">HP</span>
              <span className="text-2xl font-bold">{hp.current}</span>
              <span className="text-terminal-green/60">/{hp.max}</span>
            </div>
            <div>
              <span className="text-sm text-terminal-green/60 mr-2">XP</span>
              <span className="text-xl">{xp.current}</span>
              <span className="text-terminal-green/60 text-sm"> / {xp.max}</span>
            </div>
          </div>
        </div>
        
        {/* HP Bar */}
        <div className="mt-4 w-full h-4 bg-terminal-green/10 border border-terminal-green/30 relative">
          <div 
            className="h-full bg-terminal-green transition-all duration-500"
            style={{ width: `${Math.min((hp.current / hp.max) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Ability Scores Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatBlock label="STR" value={stats.str} />
        <StatBlock label="DEX" value={stats.dex} />
        <StatBlock label="CON" value={stats.con} />
        <StatBlock label="INT" value={stats.int} />
        <StatBlock label="WIS" value={stats.wis} />
        <StatBlock label="CHA" value={stats.cha} />
      </div>

      {/* Secondary Stats (Placeholder for now as we don't parse them yet) */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-terminal-green/30 p-4">
          <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">COMBAT</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-terminal-green/60">ARMOR CLASS</span>
              <span>10 + {getMod(stats.dex)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-green/60">INITIATIVE</span>
              <span>{getMod(stats.dex)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-green/60">SPEED</span>
              <span>30 ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-green/60">PROFICIENCY</span>
              <span>+{Math.floor((level - 1) / 4) + 2}</span>
            </div>
          </div>
        </div>

        <div className="border border-terminal-green/30 p-4">
          <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">EQUIPMENT</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Armor</div>
              <div className="text-lg">{activeCharacter.equipment?.armor || 'None'}</div>
            </div>
            <div>
              <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Weapons</div>
              {activeCharacter.equipment?.weapons && activeCharacter.equipment.weapons.length > 0 ? (
                <ul className="list-disc list-inside">
                  {activeCharacter.equipment.weapons.map((w, i) => (
                    <li key={i} className="text-lg">{w}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-lg text-terminal-green/40">None</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
