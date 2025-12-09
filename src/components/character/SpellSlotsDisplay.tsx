import React from 'react';
import { SpellSlots, PactMagicSlots, usePartyStore } from '../../stores/partyStore';

interface SpellSlotsDisplayProps {
  characterId: string;
  slots?: SpellSlots;
  pactMagicSlots?: PactMagicSlots;
  readOnly?: boolean;
}

export const SpellSlotsDisplay: React.FC<SpellSlotsDisplayProps> = ({ characterId, slots, pactMagicSlots, readOnly = false }) => {
  const { updateCharacter } = usePartyStore();

  const handleSlotChange = async (level: string, current: number, max: number) => {
    if (readOnly || !slots) return;
    
    // Bounds check
    if (current < 0) current = 0;
    if (current > max) current = max;

    const newSlots = {
      ...slots,
      [level]: { current, max }
    };

    await updateCharacter(characterId, { spellSlots: newSlots });
  };

  const handlePactSlotChange = async (current: number, max: number) => {
    if (readOnly || !pactMagicSlots) return;

    if (current < 0) current = 0;
    if (current > max) current = max;

    const newSlots: PactMagicSlots = {
      ...pactMagicSlots,
      current
    };

    await updateCharacter(characterId, { pactMagicSlots: newSlots });
  };

  const renderLevel = (levelKey: keyof SpellSlots, label: string) => {
    if (!slots) return null;
    const slot = slots[levelKey];
    if (!slot || slot.max === 0) return null;

    return (
      <div key={levelKey} className="flex items-center justify-between p-2 bg-gray-800 rounded mb-2">
        <span className="text-gray-300 font-medium w-16">{label}</span>
        
        <div className="flex gap-1">
          {Array.from({ length: slot.max }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleSlotChange(levelKey, i < slot.current ? slot.current - 1 : slot.current + 1, slot.max)}
              disabled={readOnly}
              className={`w-6 h-8 border rounded transition-colors ${
                i < slot.current 
                  ? 'bg-purple-600 border-purple-400 hover:bg-purple-500' // Available
                  : 'bg-gray-900 border-gray-700 hover:bg-gray-800'     // Used
              }`}
              title={i < slot.current ? "Click to expend slot" : "Click to regain slot"}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderPactMagic = () => {
    if (!pactMagicSlots || pactMagicSlots.max === 0) return null;

    return (
      <div className="flex items-center justify-between p-2 bg-purple-900/20 border border-purple-500/30 rounded mb-2 mt-4">
        <div className="flex flex-col">
          <span className="text-purple-300 font-bold">Pact Magic</span>
          <span className="text-purple-400/60 text-xs">Level {pactMagicSlots.slotLevel}</span>
        </div>
        
        <div className="flex gap-1">
          {Array.from({ length: pactMagicSlots.max }).map((_, i) => (
            <button
              key={i}
              onClick={() => handlePactSlotChange(i < pactMagicSlots.current ? pactMagicSlots.current - 1 : pactMagicSlots.current + 1, pactMagicSlots.max)}
              disabled={readOnly}
              className={`w-6 h-8 border rounded transition-colors ${
                i < pactMagicSlots.current 
                  ? 'bg-purple-500 border-purple-300 hover:bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]' // Available
                  : 'bg-gray-900 border-gray-700 hover:bg-gray-800'     // Used
              }`}
              title={i < pactMagicSlots.current ? "Click to expend pact slot" : "Click to regain pact slot"}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <h3 className="text-lg font-bold text-purple-400 mb-3 border-b border-gray-700 pb-1">Spell Slots</h3>
      
      {/* Pact Magic Slots */}
      {renderPactMagic()}

      {/* Standard Slots */}
      <div className="space-y-1">
        {slots && (
          <>
            {renderLevel('level1', '1st')}
            {renderLevel('level2', '2nd')}
            {renderLevel('level3', '3rd')}
            {renderLevel('level4', '4th')}
            {renderLevel('level5', '5th')}
            {renderLevel('level6', '6th')}
            {renderLevel('level7', '7th')}
            {renderLevel('level8', '8th')}
            {renderLevel('level9', '9th')}
          </>
        )}
      </div>
      
      {!slots && !pactMagicSlots && (
        <div className="text-gray-500 italic text-center text-sm py-2">No spell slots available.</div>
      )}
    </div>
  );
};
