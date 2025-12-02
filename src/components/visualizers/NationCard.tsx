import React from 'react';

// Ideology icons and colors
const IDEOLOGY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  democracy: { icon: '\u{1F5F3}', color: '#38bdf8', label: 'Democracy' },
  autocracy: { icon: '\u{1F451}', color: '#f59e0b', label: 'Autocracy' },
  theocracy: { icon: '\u{26EA}', color: '#a855f7', label: 'Theocracy' },
  tribal: { icon: '\u{1F3D5}', color: '#22c55e', label: 'Tribal' },
};

// Resource icons
const RESOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  food: { icon: '\u{1F33E}', color: '#22c55e' },
  metal: { icon: '\u{2699}', color: '#94a3b8' },
  oil: { icon: '\u{1F6E2}', color: '#1e293b' },
  gold: { icon: '\u{1F4B0}', color: '#fcd34d' },
  manpower: { icon: '\u{1F465}', color: '#3b82f6' },
};

interface NationData {
  id?: string;
  worldId?: string;
  name: string;
  leader?: string;
  ideology: 'democracy' | 'autocracy' | 'theocracy' | 'tribal';
  aggression?: number;
  trust?: number;
  paranoia?: number;
  gdp?: number;
  resources?: {
    food?: number;
    metal?: number;
    oil?: number;
    [key: string]: number | undefined;
  };
  publicIntent?: string;
  controlledRegions?: string[];
  alliances?: string[];
}

interface NationCardProps {
  data: NationData;
  variant?: 'compact' | 'full' | 'strategy';
  isPlayer?: boolean;
  showPrivate?: boolean;
}

export const NationCard: React.FC<NationCardProps> = ({
  data,
  variant = 'compact',
  isPlayer = false,
  showPrivate = false
}) => {
  const ideology = IDEOLOGY_CONFIG[data.ideology] || IDEOLOGY_CONFIG.tribal;

  const renderTraitBar = (label: string, value: number, color: string) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-terminal-green/60 w-16">{label}</span>
      <div className="flex-1 bg-terminal-green-dim/30 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-terminal-green/80 w-8 text-right">{value}</span>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={`bg-terminal-black/80 border rounded p-3 my-2 font-mono ${
        isPlayer ? 'border-terminal-amber' : 'border-terminal-green'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{ideology.icon}</span>
            <span className="text-terminal-green-bright font-bold">{data.name}</span>
            {isPlayer && <span className="text-terminal-amber text-xs">(YOU)</span>}
          </div>
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{ backgroundColor: `${ideology.color}30`, color: ideology.color }}
          >
            {ideology.label}
          </span>
        </div>

        {data.leader && (
          <div className="text-sm text-terminal-green/80 mb-2">
            {'\u{1F464}'} <span className="text-terminal-green">{data.leader}</span>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          {data.gdp !== undefined && (
            <div>
              <span className="text-terminal-green/60">GDP:</span>{' '}
              <span className="text-terminal-amber">{data.gdp.toLocaleString()}</span>
            </div>
          )}
          {data.controlledRegions && (
            <div>
              <span className="text-terminal-green/60">Regions:</span>{' '}
              <span className="text-terminal-cyan">{data.controlledRegions.length}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'strategy') {
    return (
      <div className={`bg-terminal-black/80 border rounded p-4 my-2 font-mono ${
        isPlayer ? 'border-terminal-amber border-2' : 'border-terminal-green'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${ideology.color}20`, border: `2px solid ${ideology.color}` }}
            >
              {ideology.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-terminal-green-bright font-bold text-lg">{data.name}</span>
                {isPlayer && <span className="text-terminal-amber text-xs border border-terminal-amber px-1 rounded">PLAYER</span>}
              </div>
              {data.leader && (
                <div className="text-terminal-green/70 text-sm">Led by {data.leader}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-terminal-green/60 text-xs uppercase">Ideology</div>
            <div style={{ color: ideology.color }} className="font-bold">{ideology.label}</div>
          </div>
        </div>

        {data.resources && (
          <div className="bg-terminal-green-dim/10 rounded p-3 mb-3">
            <div className="text-terminal-green/60 text-xs uppercase mb-2">Resources</div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(data.resources).map(([resource, amount]) => {
                const config = RESOURCE_ICONS[resource] || { icon: '\u{1F4E6}', color: '#666' };
                return (
                  <div key={resource} className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <div>
                      <div className="text-terminal-green-bright font-bold">{amount?.toLocaleString() || 0}</div>
                      <div className="text-terminal-green/50 text-xs capitalize">{resource}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.gdp !== undefined && (
          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="bg-terminal-amber/10 px-3 py-2 rounded">
              <div className="text-terminal-green/60 text-xs">GDP</div>
              <div className="text-terminal-amber font-bold">{data.gdp.toLocaleString()}</div>
            </div>
            {data.controlledRegions && (
              <div className="bg-terminal-cyan/10 px-3 py-2 rounded">
                <div className="text-terminal-green/60 text-xs">Territories</div>
                <div className="text-terminal-cyan font-bold">{data.controlledRegions.length}</div>
              </div>
            )}
            {data.alliances && data.alliances.length > 0 && (
              <div className="bg-terminal-purple/10 px-3 py-2 rounded">
                <div className="text-terminal-green/60 text-xs">Alliances</div>
                <div className="text-terminal-purple font-bold">{data.alliances.length}</div>
              </div>
            )}
          </div>
        )}

        {showPrivate && (data.aggression !== undefined || data.trust !== undefined || data.paranoia !== undefined) && (
          <div className="border-t border-terminal-green-dim pt-3">
            <div className="text-terminal-green/60 text-xs uppercase mb-2">Personality Profile</div>
            <div className="space-y-2">
              {data.aggression !== undefined && renderTraitBar('Aggression', data.aggression, '#ef4444')}
              {data.trust !== undefined && renderTraitBar('Trust', data.trust, '#22c55e')}
              {data.paranoia !== undefined && renderTraitBar('Paranoia', data.paranoia, '#a855f7')}
            </div>
          </div>
        )}

        {data.publicIntent && (
          <div className="mt-3 pt-3 border-t border-terminal-green-dim">
            <div className="text-terminal-green/60 text-xs uppercase mb-1">Public Stance</div>
            <div className="text-terminal-green italic">"{data.publicIntent}"</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-terminal-black/80 border rounded p-4 my-2 font-mono ${
      isPlayer ? 'border-terminal-amber' : 'border-terminal-green'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: `${ideology.color}20`, border: `2px solid ${ideology.color}` }}
        >
          {ideology.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-terminal-green-bright font-bold">{data.name}</span>
            {isPlayer && <span className="text-terminal-amber text-xs">(PLAYER)</span>}
          </div>
          <span className="text-sm" style={{ color: ideology.color }}>{ideology.label}</span>
        </div>
      </div>

      {data.leader && (
        <div className="text-sm mb-3">
          <span className="text-terminal-green/60">Leader:</span>{' '}
          <span className="text-terminal-green">{data.leader}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {data.gdp !== undefined && (
          <div className="bg-terminal-amber/10 p-2 rounded text-center">
            <div className="text-terminal-amber font-bold">{data.gdp.toLocaleString()}</div>
            <div className="text-terminal-green/60 text-xs">GDP</div>
          </div>
        )}
        {data.controlledRegions && (
          <div className="bg-terminal-cyan/10 p-2 rounded text-center">
            <div className="text-terminal-cyan font-bold">{data.controlledRegions.length}</div>
            <div className="text-terminal-green/60 text-xs">Regions</div>
          </div>
        )}
      </div>

      {data.resources && (
        <div className="flex flex-wrap gap-2 text-sm">
          {Object.entries(data.resources).map(([resource, amount]) => {
            const config = RESOURCE_ICONS[resource] || { icon: '\u{1F4E6}', color: '#666' };
            return (
              <span
                key={resource}
                className="px-2 py-1 rounded flex items-center gap-1"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <span>{config.icon}</span>
                <span className="text-terminal-green">{amount?.toLocaleString() || 0}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Multiple Nations Display
interface NationListProps {
  nations: NationData[];
  variant?: 'grid' | 'list';
  playerNationId?: string;
}

export const NationList: React.FC<NationListProps> = ({ nations, variant = 'grid', playerNationId }) => {
  if (nations.length === 0) {
    return (
      <div className="text-center text-terminal-green/60 py-4">
        No nations found in this world.
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {nations.map((nation) => (
          <NationCard key={nation.id || nation.name} data={nation} variant="compact" isPlayer={nation.id === playerNationId} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {nations.map((nation) => (
        <NationCard key={nation.id || nation.name} data={nation} variant="compact" isPlayer={nation.id === playerNationId} />
      ))}
    </div>
  );
};

export default NationCard;
