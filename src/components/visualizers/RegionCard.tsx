import React, { useState } from 'react';

// Types for region data from MCP
interface RegionData {
  id: string;
  worldId?: string;
  name: string;
  type: 'kingdom' | 'duchy' | 'county' | 'wilderness' | 'water' | 'plains' | 'forest' | 'mountain' | 'desert' | 'city';
  centerX: number;
  centerY: number;
  color?: string;
  ownerNationId?: string | null;
  controlLevel?: number;
  dominantBiome?: string;
  capital?: { x: number; y: number };
  capitalX?: number;
  capitalY?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface TileData {
  x: number;
  y: number;
  biome: string;
  elevation: number;
}

interface StructureData {
  id?: string;
  name: string;
  type: 'city' | 'town' | 'village' | 'castle' | 'ruins' | 'dungeon' | 'temple';
  location?: { x: number; y: number };
  x?: number;
  y?: number;
  population?: number;
}

interface RegionDetailData {
  region: RegionData;
  tiles?: TileData[];
  structures?: StructureData[];
  tileCount?: number;
}

interface RegionCardProps {
  data: RegionData | RegionDetailData;
  variant?: 'compact' | 'full' | 'list';
}

// Region type icons and colors
const REGION_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  kingdom: { icon: 'crown', color: 'bg-purple-500' },
  duchy: { icon: 'castle', color: 'bg-blue-500' },
  county: { icon: 'home', color: 'bg-green-500' },
  wilderness: { icon: 'tree', color: 'bg-emerald-700' },
  water: { icon: 'wave', color: 'bg-blue-600' },
  plains: { icon: 'wheat', color: 'bg-yellow-500' },
  forest: { icon: 'trees', color: 'bg-green-600' },
  mountain: { icon: 'mountain', color: 'bg-gray-500' },
  desert: { icon: 'sun', color: 'bg-amber-500' },
  city: { icon: 'building', color: 'bg-slate-500' },
};

// Note: STRUCTURE_ICONS and BIOME_COLORS reserved for future mini-map visualization

// Get icon emoji
function getRegionIcon(type: string): string {
  const icons: Record<string, string> = {
    kingdom: '\u{1F451}',
    duchy: '\u{1F3F0}',
    county: '\u{1F3D8}',
    wilderness: '\u{1F332}',
    water: '\u{1F30A}',
    plains: '\u{1F33E}',
    forest: '\u{1F333}',
    mountain: '\u{26F0}',
    desert: '\u{1F3DC}',
    city: '\u{1F3D9}',
  };
  return icons[type] || '\u{1F4CD}';
}

function getStructureIcon(type: string): string {
  const icons: Record<string, string> = {
    city: '\u{1F3D9}',
    town: '\u{1F3D8}',
    village: '\u{1F3E0}',
    castle: '\u{1F3F0}',
    ruins: '\u{1F3DA}',
    dungeon: '\u{2694}',
    temple: '\u{26EA}',
  };
  return icons[type] || '\u{1F3DB}';
}

// Helper to check if data is RegionDetailData
function isRegionDetailData(data: RegionData | RegionDetailData): data is RegionDetailData {
  return 'region' in data;
}

// Structure List Component
const StructureList: React.FC<{ structures: StructureData[] }> = ({ structures }) => {
  if (!structures || structures.length === 0) return null;

  return (
    <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3">
      <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span>{'\u{1F3D7}'}</span> Structures ({structures.length})
      </div>
      <div className="space-y-1">
        {structures.map((structure, idx) => {
          const x = structure.x ?? structure.location?.x;
          const y = structure.y ?? structure.location?.y;

          return (
            <div
              key={structure.id || idx}
              className="flex items-center justify-between text-sm py-1 border-b border-terminal-green/10 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span>{getStructureIcon(structure.type)}</span>
                <span className="text-terminal-green-bright">{structure.name}</span>
                <span className="text-xs text-terminal-green/50 capitalize">({structure.type})</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-terminal-green/60">
                {structure.population !== undefined && (
                  <span>Pop: {structure.population.toLocaleString()}</span>
                )}
                {x !== undefined && y !== undefined && (
                  <span className="font-mono">({x}, {y})</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Region Card Component
export const RegionCard: React.FC<RegionCardProps> = ({ data, variant = 'full' }) => {
  const [expanded, setExpanded] = useState(variant === 'full');

  // Extract region data
  const region = isRegionDetailData(data) ? data.region : data;
  const _tiles = isRegionDetailData(data) ? data.tiles : undefined; // Reserved for mini-map
  const structures = isRegionDetailData(data) ? data.structures : undefined;
  const tileCount = isRegionDetailData(data) ? data.tileCount : undefined;
  void _tiles; // Suppress unused warning - tiles data reserved for future mini-map visualization

  const typeConfig = REGION_TYPE_CONFIG[region.type] || REGION_TYPE_CONFIG.wilderness;
  const capitalX = region.capitalX ?? region.capital?.x;
  const capitalY = region.capitalY ?? region.capital?.y;

  if (variant === 'list') {
    return (
      <div className="flex items-center justify-between p-2 bg-terminal-black/40 border border-terminal-green/30 rounded hover:border-terminal-green/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getRegionIcon(region.type)}</span>
          <div>
            <span className="font-bold text-terminal-green-bright">{region.name}</span>
            <span className="text-terminal-green/60 text-sm ml-2 capitalize">({region.type})</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-terminal-green/60">
            ({region.centerX}, {region.centerY})
          </span>
          {region.controlLevel !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-terminal-green/50">Control:</span>
              <span className="text-terminal-green-bright font-bold">{region.controlLevel}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className="bg-terminal-black/80 border border-terminal-green/50 rounded p-2 cursor-pointer hover:border-terminal-green transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getRegionIcon(region.type)}</span>
            <span className="font-bold text-terminal-green-bright">{region.name}</span>
            <span className="text-xs text-terminal-green/60 capitalize">({region.type})</span>
          </div>
          <span className="text-terminal-green/60 text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-terminal-green/60">Center:</span>
                <span className="text-terminal-green-bright ml-2 font-mono">
                  ({region.centerX}, {region.centerY})
                </span>
              </div>
              {capitalX !== undefined && (
                <div>
                  <span className="text-terminal-green/60">Capital:</span>
                  <span className="text-terminal-green-bright ml-2 font-mono">
                    ({capitalX}, {capitalY})
                  </span>
                </div>
              )}
              {region.controlLevel !== undefined && (
                <div>
                  <span className="text-terminal-green/60">Control:</span>
                  <span className="text-terminal-green-bright ml-2">{region.controlLevel}%</span>
                </div>
              )}
              {region.dominantBiome && (
                <div>
                  <span className="text-terminal-green/60">Biome:</span>
                  <span className="text-terminal-green-bright ml-2 capitalize">
                    {region.dominantBiome.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-terminal-black/80 border border-terminal-green/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-terminal-green/10 border-b border-terminal-green/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center text-2xl`}
            >
              {getRegionIcon(region.type)}
            </div>
            <div>
              <h3 className="font-bold text-terminal-green-bright text-xl">{region.name}</h3>
              <div className="flex items-center gap-2 text-sm text-terminal-green/70">
                <span className="capitalize">{region.type}</span>
                {region.dominantBiome && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{region.dominantBiome.replace(/_/g, ' ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {region.color && (
            <div
              className="w-6 h-6 rounded border border-terminal-green/30"
              style={{ backgroundColor: region.color }}
              title="Region Color"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Location Info */}
        <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3">
          <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>{'\u{1F4CD}'}</span> Location Data
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-terminal-green/60">Center Position:</span>
              <span className="text-terminal-green-bright ml-2 font-mono">
                ({region.centerX}, {region.centerY})
              </span>
            </div>
            {capitalX !== undefined && capitalY !== undefined && (
              <div>
                <span className="text-terminal-green/60">Capital:</span>
                <span className="text-terminal-green-bright ml-2 font-mono">
                  ({capitalX}, {capitalY})
                </span>
              </div>
            )}
            {tileCount !== undefined && (
              <div>
                <span className="text-terminal-green/60">Area:</span>
                <span className="text-terminal-green-bright ml-2">{tileCount} tiles</span>
              </div>
            )}
            {region.controlLevel !== undefined && (
              <div>
                <span className="text-terminal-green/60">Control Level:</span>
                <div className="inline-flex items-center gap-2 ml-2">
                  <div className="w-16 h-2 bg-terminal-green/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-terminal-green/60"
                      style={{ width: `${region.controlLevel}%` }}
                    />
                  </div>
                  <span className="text-terminal-green-bright">{region.controlLevel}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Owner Info */}
        {region.ownerNationId && (
          <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3">
            <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>{'\u{1F3F4}'}</span> Ownership
            </div>
            <div className="text-sm">
              <span className="text-terminal-green/60">Controlled by:</span>
              <span className="text-terminal-green-bright ml-2 font-mono">
                {region.ownerNationId}
              </span>
            </div>
          </div>
        )}

        {/* Structures */}
        {structures && structures.length > 0 && <StructureList structures={structures} />}
      </div>

      {/* Footer */}
      {region.id && (
        <div className="bg-terminal-green/5 border-t border-terminal-green/20 px-3 py-2 flex justify-between text-xs text-terminal-green/40">
          <span className="font-mono">ID: {region.id}</span>
        </div>
      )}
    </div>
  );
};

// Multiple Regions Display
interface RegionListProps {
  regions: RegionData[];
  variant?: 'grid' | 'list';
}

export const RegionList: React.FC<RegionListProps> = ({ regions, variant = 'grid' }) => {
  if (regions.length === 0) {
    return (
      <div className="text-center text-terminal-green/60 py-4">No regions found in this world.</div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {regions.map((region) => (
          <RegionCard key={region.id} data={region} variant="list" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {regions.map((region) => (
        <RegionCard key={region.id} data={region} variant="compact" />
      ))}
    </div>
  );
};

export default RegionCard;
