import React, { useState } from 'react';

// Types for world data from MCP
interface WorldEnvironment {
  date?: string;
  timeOfDay?: string;
  time_of_day?: string;
  season?: string | { current?: string };
  moonPhase?: string;
  moon_phase?: string | { phase?: string };
  weatherConditions?: string;
  weather?: string | { condition?: string };
  temperature?: string | { current?: string };
  lighting?: string | { overall?: string; ambient?: string };
  sunrise?: { time?: string };
  sunset?: { time?: string };
  wind?: { speed?: string; direction?: string };
  visibility?: { current?: string };
  forecast?: string | { tonight?: string };
  hazards?: string[];
}

interface WorldData {
  id?: string;
  worldId?: string;
  name?: string;
  seed?: string;
  width?: number;
  height?: number;
  environment?: WorldEnvironment;
  stats?: {
    regions?: number;
    structures?: number;
    rivers?: number;
  };
  biomeDistribution?: Record<string, number>;
  regionCount?: number;
  structureCount?: number;
  riverTileCount?: number;
  dimensions?: {
    width?: number;
    height?: number;
  };
}

interface WorldVisualizationProps {
  data: WorldData;
  variant?: 'compact' | 'full' | 'overview';
}

// Biome color mapping
const BIOME_COLORS: Record<string, string> = {
  ocean: '#1a5f7a',
  deep_ocean: '#0d3d54',
  hot_desert: '#c2b280',
  savanna: '#bdb76b',
  tropical_rainforest: '#228b22',
  grassland: '#7cba3d',
  temperate_deciduous_forest: '#228b22',
  wetland: '#556b2f',
  taiga: '#2e8b57',
  tundra: '#b0c4de',
  glacier: '#e0ffff',
};

// Weather icons
const WEATHER_ICONS: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  overcast: '🌥️',
  light_rain: '🌦️',
  heavy_rain: '🌧️',
  thunderstorm: '⛈️',
  fog: '🌫️',
  snow: '🌨️',
  blizzard: '❄️',
  windy: '💨',
};

// Time of day icons
const TIME_ICONS: Record<string, string> = {
  dawn: '🌅',
  morning: '🌄',
  noon: '☀️',
  afternoon: '🌤️',
  dusk: '🌆',
  evening: '🌇',
  night: '🌙',
  midnight: '🌑',
};

// Season icons
const SEASON_ICONS: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  fall: '🍂',
  winter: '❄️',
};

// Helper to get nested value safely
function getValue(obj: any, ...paths: string[]): string | undefined {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, part) => acc?.[part], obj);
    if (value && typeof value === 'string') return value;
    if (value && typeof value === 'object' && value.current) return value.current;
    if (value && typeof value === 'object' && value.phase) return value.phase;
    if (value && typeof value === 'object' && value.condition) return value.condition;
    if (value && typeof value === 'object' && value.overall) return value.overall;
  }
  return undefined;
}

// Environment Card Component
const EnvironmentCard: React.FC<{ env: WorldEnvironment }> = ({ env }) => {
  const timeOfDay = getValue(env, 'timeOfDay', 'time_of_day') || 'Unknown';
  const weather = getValue(env, 'weatherConditions', 'weather', 'weather.condition') || 'Unknown';
  const season = getValue(env, 'season', 'season.current') || 'Unknown';
  const temperature = getValue(env, 'temperature', 'temperature.current') || 'Unknown';
  const moonPhase = getValue(env, 'moonPhase', 'moon_phase', 'moon_phase.phase') || 'Unknown';
  const lighting = getValue(env, 'lighting', 'lighting.overall', 'lighting.ambient') || 'Unknown';

  const timeIcon = TIME_ICONS[timeOfDay.toLowerCase()] || '🕐';
  const weatherIcon = WEATHER_ICONS[weather.toLowerCase().replace(' ', '_')] || '🌤️';
  const seasonIcon = SEASON_ICONS[season.toLowerCase()] || '🌍';

  return (
    <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3 space-y-2">
      <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span>🌍</span> Environment
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span>{timeIcon}</span>
          <span className="text-terminal-green/70">Time:</span>
          <span className="text-terminal-green-bright font-medium">{timeOfDay}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>{weatherIcon}</span>
          <span className="text-terminal-green/70">Weather:</span>
          <span className="text-terminal-green-bright font-medium">{weather}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>{seasonIcon}</span>
          <span className="text-terminal-green/70">Season:</span>
          <span className="text-terminal-green-bright font-medium">{season}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>🌡️</span>
          <span className="text-terminal-green/70">Temp:</span>
          <span className="text-terminal-green-bright font-medium">{temperature}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>🌙</span>
          <span className="text-terminal-green/70">Moon:</span>
          <span className="text-terminal-green-bright font-medium">{moonPhase}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>💡</span>
          <span className="text-terminal-green/70">Light:</span>
          <span className="text-terminal-green-bright font-medium">{lighting}</span>
        </div>
      </div>

      {env.hazards && Array.isArray(env.hazards) && env.hazards.length > 0 && (
        <div className="mt-2 pt-2 border-t border-terminal-green/20">
          <div className="text-xs text-yellow-400 flex items-center gap-1 mb-1">
            <span>⚠️</span> Hazards
          </div>
          <div className="flex flex-wrap gap-1">
            {env.hazards.map((hazard, idx) => (
              <span key={idx} className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded">
                {typeof hazard === 'string' ? hazard : String(hazard)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Biome Distribution Chart
const BiomeChart: React.FC<{ distribution: Record<string, number> }> = ({ distribution }) => {
  const sortedBiomes = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6); // Top 6 biomes

  return (
    <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3">
      <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>🗺️</span> Biome Distribution
      </div>

      <div className="space-y-2">
        {sortedBiomes.map(([biome, percentage]) => (
          <div key={biome} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: BIOME_COLORS[biome] || '#666' }}
            />
            <span className="text-xs text-terminal-green/80 flex-1 capitalize">
              {biome.replace(/_/g, ' ')}
            </span>
            <div className="flex-1 max-w-20 h-2 bg-terminal-green/10 rounded overflow-hidden">
              <div
                className="h-full bg-terminal-green/60"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-terminal-green-bright w-10 text-right">
              {percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// World Stats Card
const WorldStatsCard: React.FC<{ data: WorldData }> = ({ data }) => {
  const width = data.width || data.dimensions?.width;
  const height = data.height || data.dimensions?.height;
  const regions = data.stats?.regions || data.regionCount;
  const structures = data.stats?.structures || data.structureCount;
  const rivers = data.stats?.rivers || data.riverTileCount;

  return (
    <div className="bg-terminal-black/60 border border-terminal-green/40 rounded p-3">
      <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>📊</span> World Statistics
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {width && height && (
          <div>
            <div className="text-lg font-bold text-terminal-green-bright">{width}x{height}</div>
            <div className="text-xs text-terminal-green/60">Grid Size</div>
          </div>
        )}

        {regions !== undefined && (
          <div>
            <div className="text-lg font-bold text-terminal-green-bright">{regions}</div>
            <div className="text-xs text-terminal-green/60">Regions</div>
          </div>
        )}

        {structures !== undefined && (
          <div>
            <div className="text-lg font-bold text-terminal-green-bright">{structures}</div>
            <div className="text-xs text-terminal-green/60">Structures</div>
          </div>
        )}

        {rivers !== undefined && (
          <div>
            <div className="text-lg font-bold text-terminal-green-bright">{rivers}</div>
            <div className="text-xs text-terminal-green/60">River Tiles</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main World Visualization Component
export const WorldVisualization: React.FC<WorldVisualizationProps> = ({ data, variant = 'full' }) => {
  const [expanded, setExpanded] = useState(variant === 'full');

  const worldName = data.name || `World-${data.seed || 'Unknown'}`;
  const hasEnvironment = data.environment && Object.keys(data.environment).length > 0;
  const hasBiomes = data.biomeDistribution && Object.keys(data.biomeDistribution).length > 0;
  const hasStats = data.stats || data.regionCount !== undefined || data.structureCount !== undefined;

  if (variant === 'compact') {
    return (
      <div
        className="bg-terminal-black/80 border border-terminal-green/50 rounded p-2 cursor-pointer hover:border-terminal-green transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌍</span>
            <span className="font-bold text-terminal-green-bright">{worldName}</span>
          </div>
          <span className="text-terminal-green/60 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3">
            {hasEnvironment && <EnvironmentCard env={data.environment!} />}
            {hasStats && <WorldStatsCard data={data} />}
            {hasBiomes && <BiomeChart distribution={data.biomeDistribution!} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-terminal-black/80 border border-terminal-green/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-terminal-green/10 border-b border-terminal-green/30 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <div>
            <h3 className="font-bold text-terminal-green-bright text-lg">{worldName}</h3>
            {data.seed && (
              <div className="text-xs text-terminal-green/60">Seed: {data.seed}</div>
            )}
          </div>
        </div>
        {data.id && (
          <div className="text-xs text-terminal-green/40 font-mono">
            ID: {data.id.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {hasEnvironment && <EnvironmentCard env={data.environment!} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hasStats && <WorldStatsCard data={data} />}
          {hasBiomes && <BiomeChart distribution={data.biomeDistribution!} />}
        </div>
      </div>
    </div>
  );
};

export default WorldVisualization;
