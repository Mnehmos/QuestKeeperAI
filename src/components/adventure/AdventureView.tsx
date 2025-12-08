import React, { useState, useEffect } from 'react';
import { ChatHistory } from '../terminal/ChatHistory';
import { ChatInput } from '../terminal/ChatInput';
import { useGameStateStore } from '../../stores/gameStateStore';
import { usePartyStore } from '../../stores/partyStore';
import { CharacterCreationModal } from './CharacterCreationModal';
import { PartySelector, PartyPanel, PartyCreatorModal, CharacterPickerModal } from '../party';

const QuickStats = () => {
    const worlds = useGameStateStore((state) => state.worlds || []);
    const world = useGameStateStore((state) => state.world);
    const activeWorldId = useGameStateStore((state) => state.activeWorldId);
    const setActiveWorldId = useGameStateStore((state) => state.setActiveWorldId);
    // *** UNIFIED SOURCE OF TRUTH: Use gameStateStore for active character ***
    const activeCharacterId = useGameStateStore((state) => state.activeCharacterId);

    // Party store state
    const activePartyId = usePartyStore((state) => state.activePartyId);
    const partyDetails = usePartyStore((state) => state.partyDetails);
    const isInitialized = usePartyStore((state) => state.isInitialized);
    const syncPartyDetails = usePartyStore((state) => state.syncPartyDetails);

    // Modal states
    const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
    const [isCreatingParty, setIsCreatingParty] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);

    // Sync party details when initialized and we have an active party but no details
    useEffect(() => {
        if (isInitialized && activePartyId && !partyDetails[activePartyId]) {
            console.log('[QuickStats] Fetching missing party details for:', activePartyId);
            syncPartyDetails(activePartyId);
        }
    }, [isInitialized, activePartyId, partyDetails, syncPartyDetails]);

    const activeParty = activePartyId ? partyDetails[activePartyId] : null;
    // *** Use unified activeCharacterId instead of member.isActive ***
    const activeChar = activeParty?.members?.find((m) => m.characterId === activeCharacterId);

    return (
        <>
            <div className="w-64 lg:w-80 min-w-0 shrink-0 border-l border-terminal-green-dim bg-terminal-black/50 flex flex-col p-3 lg:p-4 gap-4 lg:gap-6 overflow-y-auto">
                {/* Party Selector Header */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
                            Party
                        </h3>
                        <button
                            onClick={() => setIsCreatingCharacter(true)}
                            className="px-2 py-1 bg-terminal-green/10 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/20 transition-colors"
                            title="Create Character"
                        >
                            + Char
                        </button>
                    </div>
                    <PartySelector
                        onCreateParty={() => setIsCreatingParty(true)}
                    />
                </div>

                {/* Active Character (Playing) Display */}
                {activeChar && (
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60 mb-3 border-b border-terminal-green-dim pb-1">
                            Now Playing
                        </h3>
                        <div className="bg-terminal-green/10 p-3 rounded border border-terminal-green/40 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
                            <div className="font-bold text-lg text-terminal-green-bright truncate" title={activeChar.character.name}>
                                {activeChar.character.name}
                            </div>
                            <div className="text-xs text-terminal-green/70 mb-2">
                                Level {activeChar.character.level} {activeChar.character.race ? `${activeChar.character.race} ` : ''}{activeChar.character.class}
                                {activeChar.role === 'leader' && (
                                    <span className="ml-2 text-yellow-400">★ Leader</span>
                                )}
                            </div>

                            {/* HP Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>HP</span>
                                    <span>{activeChar.character.hp}/{activeChar.character.maxHp}</span>
                                </div>
                                <div className="h-2 bg-terminal-green/20 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            activeChar.character.hp / activeChar.character.maxHp > 0.5
                                                ? 'bg-green-500'
                                                : activeChar.character.hp / activeChar.character.maxHp > 0.25
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(100, (activeChar.character.hp / activeChar.character.maxHp) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Party Members Panel */}
                <div>
                    <PartyPanel
                        onAddMember={() => setIsAddingMember(true)}
                        onCreateParty={() => setIsCreatingParty(true)}
                    />
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
                            <span className="shrink-0">World</span>
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

            {/* Modals */}
            <CharacterCreationModal
                isOpen={isCreatingCharacter}
                onClose={() => setIsCreatingCharacter(false)}
            />
            <PartyCreatorModal
                isOpen={isCreatingParty}
                onClose={() => setIsCreatingParty(false)}
            />
            <CharacterPickerModal
                isOpen={isAddingMember}
                onClose={() => setIsAddingMember(false)}
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
