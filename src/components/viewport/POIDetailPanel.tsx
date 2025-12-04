import React from 'react';

interface PartyPosition {
  x: number;
  y: number;
  locationName: string;
  poiId?: string;
}

interface POIDetailPanelProps {
  poi: {
    type: string;
    name: string;
    x: number;
    y: number;
  };
  biome?: string;
  region?: string;
  partyPosition?: PartyPosition;
  isMoving?: boolean;
  onClose: () => void;
  onEnter?: () => void;
}

const STRUCTURE_ICONS: Record<string, string> = {
  city: '🏙️',
  town: '🏘️',
  village: '🏠',
  castle: '🏰',
  ruins: '🏛️',
  dungeon: '⚔️',
  temple: '⛪',
  camp: '⛺',
  landmark: '🗿',
  shrine: '⛩️',
  fortress: '🏰',
};

const POI_DESCRIPTIONS: Record<string, string> = {
  city: 'A bustling metropolis with stone walls, markets, guildhalls, and thousands of inhabitants.',
  town: 'A sizable settlement with shops, an inn, and a town guard. A hub for local trade.',
  village: 'A small rural community with farms, cottages, and a tavern. Home to friendly locals.',
  castle: 'A fortified stronghold with towers, battlements, and garrison. Symbol of power.',
  ruins: 'Crumbling remnants of a once-great structure. May hold secrets... or danger.',
  dungeon: 'A dark, foreboding entrance descending underground. Adventure awaits the brave.',
  temple: 'A sacred place of worship. Priests offer blessings and healing to the faithful.',
  camp: 'A temporary encampment. Could be traders, nomads, or something less friendly.',
  landmark: 'A notable geographical feature or monument. Visible from afar.',
  shrine: 'A small holy site dedicated to a deity or spirit. A place of quiet reflection.',
  fortress: 'A military installation with thick walls and armed defenders. Approach with caution.',
};

export const POIDetailPanel: React.FC<POIDetailPanelProps> = ({
  poi,
  biome,
  region,
  partyPosition,
  isMoving,
  onClose,
  onEnter,
}) => {
  const icon = STRUCTURE_ICONS[poi.type] || '📍';
  const description = POI_DESCRIPTIONS[poi.type] || 'An interesting location worth investigating.';

  // Calculate distance from party
  const distance = partyPosition
    ? Math.round(Math.sqrt(
        Math.pow(poi.x - partyPosition.x, 2) +
        Math.pow(poi.y - partyPosition.y, 2)
      ))
    : null;

  // Party is already at this location
  const isAtLocation = partyPosition && partyPosition.x === poi.x && partyPosition.y === poi.y;

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-terminal-black/95 backdrop-blur-sm border-2 border-terminal-green font-mono text-terminal-green z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-terminal-green/50 bg-terminal-green/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-bold text-terminal-green-bright uppercase tracking-wider">
              {poi.name}
            </div>
            <div className="text-xs text-terminal-green/60 capitalize">
              {poi.type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-terminal-green hover:text-red-500 transition-colors text-lg font-bold"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Description */}
        <div className="text-xs text-terminal-green/80 leading-relaxed">
          {description}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-terminal-green/5 p-2 border border-terminal-green/30">
            <div className="text-terminal-green/60 mb-1">Coordinates</div>
            <div className="font-bold">({poi.x}, {poi.y})</div>
          </div>
          {region && (
            <div className="bg-terminal-green/5 p-2 border border-terminal-green/30">
              <div className="text-terminal-green/60 mb-1">Region</div>
              <div className="font-bold">{region}</div>
            </div>
          )}
          {biome && (
            <div className="bg-terminal-green/5 p-2 border border-terminal-green/30 col-span-2">
              <div className="text-terminal-green/60 mb-1">Biome</div>
              <div className="font-bold capitalize">{biome.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>

        {/* Distance Info */}
        {distance !== null && !isAtLocation && (
          <div className="bg-orange-500/10 border border-orange-500/30 p-2 text-xs">
            <span className="text-orange-400">📏 Distance:</span>{' '}
            <span className="font-bold">{distance} tile{distance !== 1 ? 's' : ''}</span>
            <span className="text-terminal-green/60 ml-2">from current position</span>
          </div>
        )}

        {/* Party is here indicator */}
        {isAtLocation && (
          <div className="bg-green-500/10 border border-green-500/30 p-2 text-xs">
            <span className="text-green-400">⚔️ Your party is here!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEnter}
            disabled={isMoving || isAtLocation}
            className={`flex-1 px-3 py-2 font-bold uppercase text-xs tracking-wider transition-colors ${
              isMoving
                ? 'bg-yellow-600 text-terminal-black cursor-wait'
                : isAtLocation
                ? 'bg-terminal-green/30 text-terminal-green/50 cursor-not-allowed'
                : 'bg-terminal-green text-terminal-black hover:bg-terminal-green-bright'
            }`}
          >
            {isMoving ? (
              <>{'⏳'} Traveling...</>
            ) : isAtLocation ? (
              <>{'✓'} Already Here</>
            ) : (
              <>{'🚪'} Travel Here</>
            )}
          </button>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="px-3 py-2 border-t border-terminal-green/30 bg-terminal-green/5 text-xs text-terminal-green/50 text-center">
        Press ESC to close
      </div>
    </div>
  );
};
