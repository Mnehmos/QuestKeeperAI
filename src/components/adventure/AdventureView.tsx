import React, { useState } from 'react';
import { ChatHistory } from '../terminal/ChatHistory';
import { ChatInput } from '../terminal/ChatInput';
import { useGameStateStore } from '../../stores/gameStateStore';
import { CharacterCreationModal } from './CharacterCreationModal';

const QuickStats = () => {
    const party = useGameStateStore((state) => state.party || []);
    const worlds = useGameStateStore((state) => state.worlds || []);
    const world = useGameStateStore((state) => state.world);
    const activeCharacterId = useGameStateStore((state) => state.activeCharacterId);
    const setActiveCharacterId = useGameStateStore((state) => state.setActiveCharacterId);
    const activeWorldId = useGameStateStore((state) => state.activeWorldId);
    const setActiveWorldId = useGameStateStore((state) => state.setActiveWorldId);
    const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);

    const activeCharacter = party.find((c) => c.id === activeCharacterId) || party[0];

    return (
        <>
            <div className="w-64 lg:w-80 min-w-0 shrink-0 border-l border-terminal-green-dim bg-terminal-black/50 flex flex-col p-3 lg:p-4 gap-4 lg:gap-6 overflow-y-auto">
                {/* Character Management Header */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
                            Characters
                        </h3>
                        <button
                            onClick={() => setIsCreatingCharacter(true)}
                            className="px-2 py-1 bg-terminal-green/10 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/20 transition-colors"
                            title="Create Character"
                        >
                            �o" New
                        </button>
                    </div>
                    <div className="border-b border-terminal-green-dim pb-1" />
                </div>

                {/* Character Selector */}
                {party.length > 0 ? (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-2">
                            Select Character
                        </label>
                        <select
                            value={activeCharacter?.id || ''}
                            onChange={(e) => {
                                setActiveCharacterId(e.target.value || null);
                                useGameStateStore.getState().syncState(true);
                            }}
                            className="w-full bg-black border border-terminal-green text-terminal-green text-sm px-3 py-2 rounded focus:outline-none focus:border-terminal-green-bright"
                        >
                            {party.map((char: any) => (
                                <option key={char.id || char.name} value={char.id || ''}>
                                    {char.name} - Lv{char.level} {char.class}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="text-terminal-green/70 text-sm">No characters loaded. Create one to begin.</div>
                )}

                {/* Active Character */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-3 border-b border-terminal-green-dim pb-1">
                        Active Character
                    </h3>
                    {activeCharacter ? (
                        <div className="bg-terminal-green/5 p-3 rounded border border-terminal-green/20">
                            <div className="font-bold text-lg text-terminal-green-bright truncate" title={activeCharacter.name}>{activeCharacter.name}</div>
                            <div className="text-xs text-terminal-green/70 mb-2">Level {activeCharacter.level} {activeCharacter.class}</div>

                            {/* HP Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>HP</span>
                                    <span>{activeCharacter.hp.current}/{activeCharacter.hp.max}</span>
                                </div>
                                <div className="h-2 bg-terminal-green/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-terminal-green transition-all duration-500"
                                        style={{ width: `${(activeCharacter.hp.current / activeCharacter.hp.max) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* MP Bar (if applicable) */}
                            {(activeCharacter as any).mp && (
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>MP</span>
                                        <span>{(activeCharacter as any).mp.current}/{(activeCharacter as any).mp.max}</span>
                                    </div>
                                    <div className="h-2 bg-blue-900/40 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${((activeCharacter as any).mp.current / (activeCharacter as any).mp.max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-terminal-green/70 text-sm">No active character.</div>
                    )}
                </div>

                {/* Party Status */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-3 border-b border-terminal-green-dim pb-1">
                        Party Status
                    </h3>
                    <div className="space-y-2">
                        {party.filter((c) => c.id !== activeCharacter?.id).map((char: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 hover:bg-terminal-green/5 rounded transition-colors">
                                <span className="font-medium">{char.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-terminal-green/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-terminal-green/70"
                                            style={{ width: `${(char.hp.current / char.hp.max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Location Info */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-3 border-b border-terminal-green-dim pb-1">
                        Location
                    </h3>
                    <div className="text-sm space-y-2">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-1">
                                Select World
                            </label>
                            {worlds.length > 0 ? (
                                <select
                                    value={activeWorldId || ''}
                                    onChange={(e) => {
                                        setActiveWorldId(e.target.value || null);
                                        useGameStateStore.getState().syncState(true);
                                    }}
                                    className="w-full bg-black border border-terminal-green text-terminal-green text-sm px-3 py-2 rounded focus:outline-none focus:border-terminal-green-bright"
                                >
                                    {worlds.map((w: any) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.width}x{w.height})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-terminal-green/70 text-xs">No worlds loaded.</div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-terminal-green-bright mb-1">
                            <span className="shrink-0">🌍</span>
                            <span className="font-bold truncate" title={world.location || 'Unknown Location'}>{world.location || 'Unknown Location'}</span>
                        </div>
                        <div className="text-xs text-terminal-green/70 pl-6 space-y-1">
                            <div>Time: {world.time || 'Unknown'}</div>
                            <div>Weather: {world.weather || 'Unknown'}</div>
                            <div>Date: {world.date || 'Unknown'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <CharacterCreationModal
                isOpen={isCreatingCharacter}
                onClose={() => setIsCreatingCharacter(false)}
            />
        </>
    );
};

export const AdventureView: React.FC = () => {
    return (
        <div className="flex h-full w-full bg-terminal-black overflow-hidden">
            {/* Narrative Panel (Chat) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <ChatHistory />
                <ChatInput />
            </div>

            {/* Quick Stats Panel */}
            <QuickStats />
        </div>
    );
};
