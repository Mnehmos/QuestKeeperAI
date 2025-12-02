import React, { useState } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { WorldEnvironmentForm } from './WorldEnvironmentForm';

export const WorldStateView: React.FC = () => {
  const world = useGameStateStore((state) => state.world);
  const syncState = useGameStateStore((state) => state.syncState);
  const [showEnvironmentForm, setShowEnvironmentForm] = useState(false);
  
  // Safety check - return loading state if world is undefined
  if (!world) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-terminal-green">
        <div className="text-center">
          <div className="text-xl mb-2">⚠️ Loading World State...</div>
          <button
            onClick={() => syncState?.()}
            className="px-4 py-2 bg-terminal-green text-terminal-black font-bold uppercase"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }
  
  const env = world.environment || {};

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon?: string }) => (
    <div className="flex justify-between items-center border-b border-terminal-green-dim/30 py-2">
      <span className="text-terminal-green/70 uppercase tracking-wider text-xs flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </span>
      <span className="font-bold text-terminal-green-bright text-sm">{value}</span>
    </div>
  );

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold mb-3 border-b border-terminal-green pb-2 uppercase tracking-widest text-terminal-green-bright flex items-center gap-2">
        <span className="text-base">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );

  // Get NPC and Event counts
  const npcCount = world.npcs ? Object.keys(world.npcs).length : 0;
  const eventCount = world.events ? Object.keys(world.events).length : 0;

  return (
    <div className="h-full w-full flex flex-col p-4 font-mono text-terminal-green overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-terminal-green-dim pb-2 flex-shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-glow">
          World State Matrix
        </h2>
        <button
          onClick={() => syncState()}
          className="px-3 py-1 text-xs bg-terminal-green/10 border border-terminal-green hover:bg-terminal-green/20 transition-colors uppercase tracking-wider"
          title="Refresh world state from server"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-scroll pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0, 255, 65, 0.6) rgba(0, 255, 65, 0.1)' }}>
        {/* Location Banner */}
        <div className="bg-terminal-green/10 border-2 border-terminal-green p-4 mb-6 rounded-sm">
          <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Current Location</div>
          <div className="text-2xl font-bold text-terminal-green-bright text-glow">{world.location}</div>
          {world.lastUpdated && (
            <div className="text-xs text-terminal-green/50 mt-2">
              Last Updated: {new Date(world.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>

        {/* Environment Form Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowEnvironmentForm(!showEnvironmentForm)}
            className="w-full flex items-center justify-between px-4 py-2 bg-terminal-green/10 border border-terminal-green hover:bg-terminal-green/20 transition-colors"
          >
            <span className="text-sm font-bold uppercase tracking-wider text-terminal-green-bright flex items-center gap-2">
              <span>🌤️</span>
              Set Environment
            </span>
            <span className="text-terminal-green">{showEnvironmentForm ? '▲' : '▼'}</span>
          </button>
          {showEnvironmentForm && (
            <div className="mt-2">
              <WorldEnvironmentForm onClose={() => setShowEnvironmentForm(false)} />
            </div>
          )}
        </div>

        {/* Time & Astronomical Data */}
        <Section title="Time & Astronomical" icon="🌙">
          <div className="bg-terminal-black/50 p-3 border border-terminal-green-dim rounded-sm space-y-1">
            <InfoRow 
              label="Date" 
              value={env.date?.full_date || env.date || world.date || 'Unknown'} 
              icon="📅" 
            />
            <InfoRow 
              label="Time of Day" 
              value={env.specific_time || env.time_of_day || env.battlefield?.time_of_day || world.time || 'Unknown'} 
              icon="🕒" 
            />
            <InfoRow 
              label="Season" 
              value={env.season?.current || (typeof env.season === 'string' ? env.season : null) || 'Unknown'} 
              icon="🍂" 
            />
            <InfoRow 
              label="Moon Phase" 
              value={env.moon_phase?.phase || (typeof env.moon_phase === 'string' ? env.moon_phase : null) || 'Unknown'} 
              icon="🌙" 
            />
            {(env.sunrise?.time || env.sunset?.time) && (
              <>
                {env.sunrise?.time && <InfoRow label="Sunrise" value={env.sunrise.time} icon="🌅" />}
                {env.sunset?.time && <InfoRow label="Sunset" value={env.sunset.time} icon="🌆" />}
              </>
            )}
          </div>
        </Section>

        {/* Weather & Environment */}
        <Section title="Weather & Environment" icon="☁️">
          <div className="bg-terminal-black/50 p-3 border border-terminal-green-dim rounded-sm space-y-1">
            <InfoRow 
              label="Conditions" 
              value={env.weather?.condition || env.battlefield?.weather || (typeof env.weather === 'string' ? env.weather : null) || world.weather || 'Unknown'} 
              icon="☁️" 
            />
            <InfoRow 
              label="Temperature" 
              value={env.temperature?.current || (typeof env.temperature === 'string' ? env.temperature : null) || 'Unknown'} 
              icon="🌡️" 
            />
            <InfoRow 
              label="Lighting" 
              value={env.lighting?.overall || env.lighting?.ambient || (typeof env.lighting === 'string' ? env.lighting : null) || 'Unknown'} 
              icon="💡" 
            />
            {env.wind?.speed && (
              <InfoRow 
                label="Wind" 
                value={`${env.wind.speed} ${env.wind.direction || ''}`} 
                icon="💨" 
              />
            )}
            {env.visibility?.current && (
              <InfoRow 
                label="Visibility" 
                value={env.visibility.current} 
                icon="👁️" 
              />
            )}
            {env.forecast && (
              <div className="mt-3 pt-3 border-t border-terminal-green-dim/30">
                <div className="text-xs text-terminal-green/60 uppercase mb-1">Forecast</div>
                <div className="text-sm text-terminal-green-bright italic">
                  {typeof env.forecast === 'string' 
                    ? env.forecast 
                    : env.forecast?.tonight || 'No forecast available'}
                </div>
              </div>
            )}
            {env.hazards && Array.isArray(env.hazards) && env.hazards.length > 0 && (
              <div className="mt-3 pt-3 border-t border-terminal-green-dim/30">
                <div className="text-xs text-terminal-green/60 uppercase mb-2 flex items-center gap-1">
                  <span>⚠️</span> Hazards
                </div>
                <ul className="space-y-1">
                  {env.hazards.map((hazard: string, idx: number) => (
                    <li key={idx} className="text-sm text-yellow-400 flex items-start gap-2">
                      <span>⚠️</span>
                      <span>{typeof hazard === 'string' ? hazard : String(hazard)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* NPCs */}
        {npcCount > 0 && (
          <Section title="NPCs Nearby" icon="👥">
            <div className="bg-terminal-black/50 p-3 border border-terminal-green-dim rounded-sm">
              <div className="text-sm text-terminal-green/80">
                {npcCount} NPC{npcCount !== 1 ? 's' : ''} tracked
              </div>
              <div className="mt-2 space-y-1">
                {Object.keys(world.npcs!).slice(0, 5).map((npcName) => (
                  <div key={npcName} className="text-xs text-terminal-green-bright">
                    • {npcName}
                  </div>
                ))}
                {npcCount > 5 && (
                  <div className="text-xs text-terminal-green/50 italic">
                    ...and {npcCount - 5} more
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Events */}
        {eventCount > 0 && (
          <Section title="Recent Events" icon="📚">
            <div className="bg-terminal-black/50 p-3 border border-terminal-green-dim rounded-sm">
              <div className="text-sm text-terminal-green/80">
                {eventCount} event{eventCount !== 1 ? 's' : ''} recorded
              </div>
              <div className="mt-2 space-y-1">
                {Object.keys(world.events!).slice(0, 5).map((eventKey) => (
                  <div key={eventKey} className="text-xs text-terminal-green-bright">
                    • {eventKey}
                  </div>
                ))}
                {eventCount > 5 && (
                  <div className="text-xs text-terminal-green/50 italic">
                    ...and {eventCount - 5} more
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Placeholder for no data */}
        {npcCount === 0 && eventCount === 0 && (
          <div className="mt-8 border border-terminal-green-dim p-8 text-center opacity-30 uppercase tracking-widest">
            [Additional Data Module Offline]
          </div>
        )}
      </div>
    </div>
  );
};
