import React from 'react';

// Biome color mapping for visual representation
const BIOME_COLORS: Record<string, string> = {
  ocean: '#1e40af',
  deep_ocean: '#1e3a8a',
  coast: '#38bdf8',
  beach: '#fcd34d',
  desert: '#f59e0b',
  grassland: '#22c55e',
  forest: '#15803d',
  taiga: '#166534',
  tundra: '#94a3b8',
  snow: '#f1f5f9',
  mountain: '#6b7280',
  highland: '#9ca3af',
  swamp: '#84cc16',
  jungle: '#14532d',
  savanna: '#eab308',
  volcanic: '#dc2626',
};

// Weather icons
const WEATHER_ICONS: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  overcast: '🌫️',
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

interface WorldStateCardProps {
  data: {
    worldId?: string;
    name?: string;
    seed?: string;
    width?: number;
    height?: number;
    stats?: {
      regions?: number;
      structures?: number;
    };
    dimensions?: {
      width: number;
      height: number;
    };
    biomeDistribution?: Record<string, number>;
    regionCount?: number;
    structureCount?: number;
    riverTileCount?: number;
    environment?: {
      time_of_day?: string;
      weather?: string;
      season?: string;
      temperature?: string;
      moon_phase?: string;
    };
  };
  variant?: 'compact' | 'full' | 'overview';
}

export const WorldStateCard: React.FC<WorldStateCardProps> = ({ data, variant = 'compact' }) => {
  const width = data.dimensions?.width || data.width || 0;
  const height = data.dimensions?.height || data.height || 0;
  const regions = data.regionCount || data.stats?.regions || 0;
  const structures = data.structureCount || data.stats?.structures || 0;
  const rivers = data.riverTileCount || 0;

  const weatherIcon = data.environment?.weather
    ? WEATHER_ICONS[data.environment.weather] || '🌍'
    : '🌍';
  const timeIcon = data.environment?.time_of_day
    ? TIME_ICONS[data.environment.time_of_day] || '⏰'
    : '';

  if (variant === 'compact') {
    return (
      <div className="bg-terminal-black/80 border border-terminal-green rounded p-3 my-2 font-mono">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🗺️</span>
          <span className="text-terminal-green-bright font-bold">World State</span>
          {data.seed && <span className="text-terminal-green/50 text-xs">({data.seed})</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-terminal-green/60">Size:</span>
            <span className="text-terminal-green">{width}x{height}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-terminal-green/60">Regions:</span>
            <span className="text-terminal-amber">{regions}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-terminal-green/60">Structures:</span>
            <span className="text-terminal-cyan">{structures}</span>
          </div>
          {rivers > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-terminal-green/60">Rivers:</span>
              <span className="text-blue-400">{rivers} tiles</span>
            </div>
          )}
        </div>

        {data.environment && (
          <div className="mt-2 pt-2 border-t border-terminal-green-dim flex flex-wrap gap-2 text-xs">
            {timeIcon && <span>{timeIcon} {data.environment.time_of_day}</span>}
            {weatherIcon && <span>{weatherIcon} {data.environment.weather}</span>}
            {data.environment.season && <span>🍂 {data.environment.season}</span>}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'overview' && data.biomeDistribution) {
    return (
      <div className="bg-terminal-black/80 border border-terminal-green rounded p-4 my-2 font-mono">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🌍</span>
          <span className="text-terminal-green-bright font-bold">World Map Overview</span>
          {data.seed && <span className="text-terminal-green/50 text-xs">Seed: {data.seed}</span>}
        </div>

        {/* World Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
          <div className="bg-terminal-green/10 p-2 rounded text-center">
            <div className="text-terminal-green/60 text-xs uppercase">Size</div>
            <div className="text-terminal-green-bright font-bold">{width}x{height}</div>
          </div>
          <div className="bg-terminal-amber/10 p-2 rounded text-center">
            <div className="text-terminal-green/60 text-xs uppercase">Regions</div>
            <div className="text-terminal-amber font-bold">{regions}</div>
          </div>
          <div className="bg-terminal-cyan/10 p-2 rounded text-center">
            <div className="text-terminal-green/60 text-xs uppercase">Structures</div>
            <div className="text-terminal-cyan font-bold">{structures}</div>
          </div>
          <div className="bg-blue-500/10 p-2 rounded text-center">
            <div className="text-terminal-green/60 text-xs uppercase">Rivers</div>
            <div className="text-blue-400 font-bold">{rivers}</div>
          </div>
        </div>

        {/* Biome Distribution */}
        <div className="mb-3">
          <div className="text-terminal-green/70 text-xs uppercase mb-2">Biome Distribution</div>
          <div className="space-y-1">
            {Object.entries(data.biomeDistribution)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 8)
              .map(([biome, percentage]) => (
                <div key={biome} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: BIOME_COLORS[biome] || '#666' }}
                  />
                  <span className="text-terminal-green/80 capitalize w-20">{biome.replace('_', ' ')}</span>
                  <div className="flex-1 bg-terminal-green-dim/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: BIOME_COLORS[biome] || '#666'
                      }}
                    />
                  </div>
                  <span className="text-terminal-green text-xs w-12 text-right">{percentage}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-terminal-black/80 border border-terminal-green rounded p-4 my-2 font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="text-terminal-green-bright font-bold text-lg">
            {data.name || `World-${data.seed || 'Unknown'}`}
          </span>
        </div>
        {data.worldId && (
          <span className="text-terminal-green/40 text-xs font-mono">ID: {data.worldId.slice(0, 8)}...</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBox label="Dimensions" value={`${width}x${height}`} icon="📐" />
        <StatBox label="Regions" value={regions.toString()} icon="🏞️" color="amber" />
        <StatBox label="Structures" value={structures.toString()} icon="🏰" color="cyan" />
        {rivers > 0 && <StatBox label="River Tiles" value={rivers.toString()} icon="🌊" color="blue" />}
      </div>

      {data.environment && (
        <div className="border-t border-terminal-green-dim pt-3">
          <div className="text-terminal-green/70 text-xs uppercase mb-2">Environment</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {data.environment.time_of_day && (
              <EnvironmentItem label="Time" value={data.environment.time_of_day} icon={timeIcon} />
            )}
            {data.environment.weather && (
              <EnvironmentItem label="Weather" value={data.environment.weather} icon={weatherIcon} />
            )}
            {data.environment.season && (
              <EnvironmentItem label="Season" value={data.environment.season} icon="🍂" />
            )}
            {data.environment.temperature && (
              <EnvironmentItem label="Temp" value={data.environment.temperature} icon="🌡️" />
            )}
          </div>
        </div>
      )}

      {data.biomeDistribution && (
        <div className="border-t border-terminal-green-dim pt-3 mt-3">
          <div className="text-terminal-green/70 text-xs uppercase mb-2">Biome Distribution</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(data.biomeDistribution)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([biome, percentage]) => (
                <span
                  key={biome}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: `${BIOME_COLORS[biome] || '#666'}30`,
                    color: BIOME_COLORS[biome] || '#666',
                    border: `1px solid ${BIOME_COLORS[biome] || '#666'}50`
                  }}
                >
                  {biome.replace('_', ' ')}: {percentage}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components
const StatBox: React.FC<{
  label: string;
  value: string;
  icon: string;
  color?: 'green' | 'amber' | 'cyan' | 'blue' | 'purple'
}> = ({ label, value, icon, color = 'green' }) => {
  const colorClasses = {
    green: 'bg-terminal-green/10 text-terminal-green-bright',
    amber: 'bg-terminal-amber/10 text-terminal-amber',
    cyan: 'bg-terminal-cyan/10 text-terminal-cyan',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-terminal-purple/10 text-terminal-purple',
  };

  return (
    <div className={`${colorClasses[color]} p-2 rounded text-center`}>
      <div className="text-lg mb-1">{icon}</div>
      <div className="font-bold">{value}</div>
      <div className="text-terminal-green/60 text-xs uppercase">{label}</div>
    </div>
  );
};

const EnvironmentItem: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-1">
    <span>{icon}</span>
    <span className="text-terminal-green/60">{label}:</span>
    <span className="text-terminal-green capitalize">{value.replace('_', ' ')}</span>
  </div>
);

export default WorldStateCard;
