import React from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';

interface SelectionStatusIndicatorProps {
  compact?: boolean;
  showDebugIds?: boolean;
}

export const SelectionStatusIndicator: React.FC<SelectionStatusIndicatorProps> = ({
  compact = false,
  showDebugIds = false
}) => {
  const activeCharacter = useGameStateStore(state => state.activeCharacter);
  const activeCharacterId = useGameStateStore(state => state.activeCharacterId);
  const activeWorldId = useGameStateStore(state => state.activeWorldId);
  const world = useGameStateStore(state => state.world);
  const isSyncing = useGameStateStore(state => state.isSyncing);
  const selectionLocked = useGameStateStore(state => state.selectionLocked);
  const syncState = useGameStateStore(state => state.syncState);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono">
        {/* Sync Status */}
        <div className={`flex items-center gap-1 ${isSyncing ? 'text-yellow-400' : 'text-terminal-green/60'}`}>
          {isSyncing ? (
            <>
              <span className="animate-spin">&#9696;</span>
              <span>SYNC</span>
            </>
          ) : (
            <>
              <span>&#9679;</span>
              <span>IDLE</span>
            </>
          )}
        </div>

        {/* Lock indicator */}
        {selectionLocked && (
          <span className="text-yellow-500" title="Selection locked during sync">
            &#128274;
          </span>
        )}

        {/* Character */}
        <div className="text-terminal-green truncate max-w-[100px]" title={activeCharacter?.name || 'None'}>
          {activeCharacter?.name || 'NO CHAR'}
        </div>

        {/* World */}
        <div className="text-terminal-green/60 truncate max-w-[100px]" title={world?.location || 'None'}>
          @ {world?.location || 'NO WORLD'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-black/80 border border-terminal-green/30 p-3 font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-terminal-green/60 uppercase tracking-wider text-xs">Selection Status</span>
        <button
          onClick={() => syncState(true)}
          disabled={isSyncing}
          className={`px-2 py-1 text-xs border uppercase tracking-wider transition-colors ${
            isSyncing
              ? 'border-yellow-500/50 text-yellow-500/50 cursor-not-allowed'
              : 'border-terminal-green text-terminal-green hover:bg-terminal-green/10'
          }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="space-y-2">
        {/* Character Row */}
        <div className="flex items-center justify-between">
          <span className="text-terminal-green/60">Character:</span>
          <div className="text-right">
            <span className="text-terminal-green font-bold">
              {activeCharacter?.name || 'None'}
            </span>
            {activeCharacter && (
              <span className="text-terminal-green/50 ml-2">
                Lv{activeCharacter.level} {activeCharacter.race ? `${activeCharacter.race} ` : ''}{activeCharacter.class}
              </span>
            )}
            {showDebugIds && activeCharacterId && (
              <div className="text-terminal-green/30 text-xs">
                {activeCharacterId.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>

        {/* World Row */}
        <div className="flex items-center justify-between">
          <span className="text-terminal-green/60">World:</span>
          <div className="text-right">
            <span className="text-terminal-green">
              {world?.location || 'None'}
            </span>
            {showDebugIds && activeWorldId && (
              <div className="text-terminal-green/30 text-xs">
                {activeWorldId.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>

        {/* Sync Status Row */}
        <div className="flex items-center justify-between border-t border-terminal-green/20 pt-2 mt-2">
          <span className="text-terminal-green/60">Status:</span>
          <div className="flex items-center gap-2">
            {selectionLocked && (
              <span className="text-yellow-500 text-xs" title="Selection locked">
                LOCKED
              </span>
            )}
            <span className={isSyncing ? 'text-yellow-400' : 'text-terminal-green'}>
              {isSyncing ? 'SYNCING...' : 'READY'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionStatusIndicator;
