import React, { useState } from 'react';
import { SpellSlots, PactMagicSlots, usePartyStore } from '../../stores/partyStore';
import { SpellSlotsDisplay } from './SpellSlotsDisplay';
import { mcpManager } from '../../services/mcpClient';
import { useCombatStore } from '../../stores/combatStore';

interface SpellBookViewProps {
  characterId: string;
  spellSlots?: SpellSlots;
  pactMagicSlots?: PactMagicSlots;
  knownSpells?: string[];
  preparedSpells?: string[];
  cantripsKnown?: string[];
  spellSaveDC?: number;
  spellAttackBonus?: number;
  spellcastingAbility?: string;
  readOnly?: boolean;
}

export const SpellBookView: React.FC<SpellBookViewProps> = ({
  characterId,
  spellSlots,
  pactMagicSlots,
  knownSpells = [],
  preparedSpells = [],
  cantripsKnown = [],
  spellSaveDC,
  spellAttackBonus,
  spellcastingAbility,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'prepared' | 'known'>('prepared');
  const activeEncounterId = useCombatStore(state => state.activeEncounterId);
  const { activePartyId, syncPartyDetails } = usePartyStore();

  // Determine which tab to show by default
  // If prepared spells exist, default to 'prepared', else 'known'
  React.useEffect(() => {
    if (preparedSpells.length === 0 && knownSpells.length > 0) {
      setActiveTab('known');
    }
  }, [preparedSpells.length, knownSpells.length]);

  const handleCast = async (spellName: string) => {
    if (readOnly) return;

    if (!activeEncounterId) {
      // TODO: Implement OOC casting or just chat output
      alert(`Casting "${spellName}" requires an active combat encounter to resolve automatically.\n\nPlease manage spell slots manually for out-of-combat casting.`);
      return;
    }

    try {
      // Trigger the backend tool
      await mcpManager.combatClient.callTool('execute_combat_action', {
        encounterId: activeEncounterId,
        action: 'cast_spell',
        actorId: characterId,
        spellName: spellName
      });
      
      // Sync party details to update spell slots
      if (activePartyId) {
        await syncPartyDetails(activePartyId);
      }
      
    } catch (error: any) {
      console.error('Failed to cast spell:', error);
      alert(`Failed to cast ${spellName}: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200">
      {/* Header Stats */}
      <div className="flex justify-around bg-gray-900 p-3 border-b border-gray-800">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Spell Attack</div>
          <div className="text-xl font-bold text-green-400">
            {spellAttackBonus ? (spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus) : '--'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Save DC</div>
          <div className="text-xl font-bold text-blue-400">{spellSaveDC || '--'}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Ability</div>
          <div className="text-xl font-bold text-purple-400 capitalize">{spellcastingAbility || '--'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Spell Slots */}
        {(spellSlots || pactMagicSlots) && (
          <SpellSlotsDisplay 
            characterId={characterId} 
            slots={spellSlots} 
            pactMagicSlots={pactMagicSlots}
            readOnly={readOnly} 
          />
        )}

        {/* Spells List */}
        <div>
          <div className="flex border-b border-gray-700 mb-4">
            {preparedSpells.length > 0 && (
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'prepared' 
                    ? 'text-purple-400 border-b-2 border-purple-400' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('prepared')}
              >
                Prepared ({preparedSpells.length})
              </button>
            )}
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'known' 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('known')}
            >
              Known Spells ({knownSpells.length})
            </button>
          </div>

          <div className="space-y-4">
            {/* Cantrips Section */}
            {cantripsKnown.length > 0 && (
              <div className="bg-gray-900/30 rounded p-3 border border-gray-800">
                <h4 className="text-sm font-bold text-gray-400 mb-2 uppercase">Cantrips (At Will)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {cantripsKnown.map((spell, idx) => (
                    <div 
                      key={idx} 
                      className="bg-gray-800 p-2 rounded text-sm hover:bg-gray-700 cursor-pointer transition-colors group flex justify-between items-center"
                      onClick={() => handleCast(spell)}
                    >
                      <span>{spell}</span>
                      <span className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">Cast</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spells Section */}
            <div className="bg-gray-900/30 rounded p-3 border border-gray-800">
              <h4 className="text-sm font-bold text-gray-400 mb-2 uppercase">
                {activeTab === 'prepared' ? 'Prepared Spells' : 'Known Spells'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(activeTab === 'prepared' ? preparedSpells : knownSpells).map((spell, idx) => (
                  <div key={idx} className="bg-gray-800 p-2 rounded text-sm hover:bg-gray-700 cursor-pointer transition-colors flex justify-between items-center group">
                    <span>{spell}</span>
                    <button 
                      className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCast(spell);
                      }}
                    >
                      Cast
                    </button>
                  </div>
                ))}
                {(activeTab === 'prepared' ? preparedSpells : knownSpells).length === 0 && (
                  <div className="col-span-2 text-gray-600 text-center py-4 italic">
                    No spells found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
