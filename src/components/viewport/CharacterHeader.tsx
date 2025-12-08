import React from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';

export const CharacterHeader: React.FC = () => {
  const activeCharacter = useGameStateStore(state => state.activeCharacter);
  const party = useGameStateStore(state => state.party);
  const setActiveCharacterId = useGameStateStore(state => state.setActiveCharacterId);
  const syncState = useGameStateStore(state => state.syncState);
  const isSyncing = useGameStateStore(state => state.isSyncing);
  const world = useGameStateStore(state => state.world);

  if (!activeCharacter) {
    return (
      <div className="bg-terminal-dim border-b border-terminal-green-dim p-2 text-terminal-green/60 text-xs font-mono flex items-center justify-between">
        <span>NO ACTIVE CHARACTER LINKED</span>
        <button
          onClick={() => syncState(true)}
          disabled={isSyncing}
          className={`px-2 py-1 text-xs border uppercase ${
            isSyncing
              ? 'border-yellow-500/50 text-yellow-500'
              : 'border-terminal-green text-terminal-green hover:bg-terminal-green/10'
          }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
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
            LVL {activeCharacter.level} {activeCharacter.race ? `${activeCharacter.race} ` : ''}{activeCharacter.class}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* World indicator */}
        <div className="flex flex-col text-xs">
          <span className="text-terminal-green/60 mb-1">World</span>
          <span className="text-terminal-green truncate max-w-[100px]" title={world?.location}>
            {world?.location || 'Unknown'}
          </span>
        </div>

        {/* Active selector */}
        <div className="flex flex-col text-xs">
          <span className="text-terminal-green/60 mb-1">Active</span>
          <select
            value={activeCharacter.id || ''}
            onChange={(e) => {
              setActiveCharacterId(e.target.value || null, true);
              syncState(true);
            }}
            className="bg-terminal-black border border-terminal-green-dim text-terminal-green px-2 py-1 text-xs"
          >
            {party.map((c) => (
              <option key={c.id || c.name} value={c.id || ''}>
                {c.name} (Lv{c.level})
              </option>
            ))}
          </select>
        </div>

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

        {/* Sync Button */}
        <button
          onClick={() => syncState(true)}
          disabled={isSyncing}
          className={`px-3 py-2 text-xs border uppercase tracking-wider transition-colors ${
            isSyncing
              ? 'border-yellow-500/50 text-yellow-500 cursor-not-allowed'
              : 'border-terminal-green text-terminal-green hover:bg-terminal-green/10'
          }`}
          title="Sync game state from MCP server"
        >
          {isSyncing ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">&#8635;</span>
              <span>SYNC</span>
            </span>
          ) : (
            'SYNC'
          )}
        </button>
      </div>
    </div>
  );
};
