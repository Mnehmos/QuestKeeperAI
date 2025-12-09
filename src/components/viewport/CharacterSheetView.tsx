import React, { useState } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { usePartyStore } from '../../stores/partyStore';
import { dnd5eItems } from '../../data/dnd5eItems';
import { ConfirmModal } from '../common/ConfirmModal';
import { SpellBookView } from '../character/SpellBookView';
import { ConditionsDisplay } from '../character/ConditionsDisplay';
import CustomEffectsDisplay from '../character/CustomEffectsDisplay';

// Armor type categories for AC calculation
type ArmorCategory = 'light' | 'medium' | 'heavy' | 'none';

interface ArmorInfo {
  category: ArmorCategory;
  baseAC: number;
  name: string;
}

// Get armor info from equipped armor name
function getArmorInfo(armorName: string): ArmorInfo {
  if (!armorName || armorName === 'None') {
    return { category: 'none', baseAC: 10, name: 'None' };
  }

  // Look up in dnd5eItems
  const itemKey = Object.keys(dnd5eItems).find(
    k => k.toLowerCase() === armorName.toLowerCase()
  );
  const item = itemKey ? dnd5eItems[itemKey] : null;

  if (!item || !item.armorClass) {
    return { category: 'none', baseAC: 10, name: armorName };
  }

  // Determine armor category from item type or properties
  const typeLower = (item.type || '').toLowerCase();
  const isHeavy = typeLower.includes('heavy') ||
    ['ring mail', 'chain mail', 'splint', 'plate'].some(h => armorName.toLowerCase().includes(h));
  const isMedium = typeLower.includes('medium') ||
    item.properties?.includes('Max Dex +2') ||
    ['hide', 'chain shirt', 'scale mail', 'breastplate', 'half plate'].some(m => armorName.toLowerCase().includes(m));
  const isLight = typeLower.includes('light') ||
    ['padded', 'leather', 'studded leather'].some(l => armorName.toLowerCase() === l);

  let category: ArmorCategory = 'none';
  if (isHeavy) category = 'heavy';
  else if (isMedium) category = 'medium';
  else if (isLight) category = 'light';

  return {
    category,
    baseAC: item.armorClass,
    name: armorName
  };
}

// Calculate AC with breakdown
function calculateAC(
  armorInfo: ArmorInfo,
  dexMod: number,
  hasShield: boolean
): { total: number; breakdown: string } {
  let total = armorInfo.baseAC;
  const parts: string[] = [];

  switch (armorInfo.category) {
    case 'none':
      total = 10 + dexMod;
      parts.push('10');
      if (dexMod !== 0) parts.push(`${dexMod >= 0 ? '+' : ''}${dexMod} DEX`);
      break;
    case 'light':
      total = armorInfo.baseAC + dexMod;
      parts.push(`${armorInfo.baseAC} ${armorInfo.name}`);
      if (dexMod !== 0) parts.push(`${dexMod >= 0 ? '+' : ''}${dexMod} DEX`);
      break;
    case 'medium':
      const cappedDex = Math.min(dexMod, 2);
      total = armorInfo.baseAC + cappedDex;
      parts.push(`${armorInfo.baseAC} ${armorInfo.name}`);
      if (cappedDex !== 0) parts.push(`+${cappedDex} DEX (max 2)`);
      break;
    case 'heavy':
      parts.push(`${armorInfo.baseAC} ${armorInfo.name}`);
      break;
  }

  if (hasShield) {
    total += 2;
    parts.push('+2 Shield');
  }

  return { total, breakdown: parts.join(' ') };
}

export const CharacterSheetView: React.FC = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const [viewTab, setViewTab] = useState<'stats' | 'spells' | 'effects'>('stats');

  const activeCharacter = useGameStateStore(state => state.activeCharacter);
  const activeCharacterId = useGameStateStore(state => state.activeCharacterId);
  const inventory = useGameStateStore(state => state.inventory);
  const syncState = useGameStateStore(state => state.syncState);

  const deleteCharacter = usePartyStore(state => state.deleteCharacter);
  const isLoading = usePartyStore(state => state.isLoading);
  const updateCharacter = usePartyStore(state => state.updateCharacter);

  // Get party members for character selector
  const activePartyId = usePartyStore(state => state.activePartyId);
  const partyDetails = usePartyStore(state => state.partyDetails);
  const setActiveCharacter = usePartyStore(state => state.setActiveCharacter);
  
  const activeParty = activePartyId ? partyDetails[activePartyId] : null;
  const partyMembers = activeParty?.members || [];

  // Get character type badge colors
  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'pc':
        return { label: 'PC', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' };
      case 'npc':
        return { label: 'NPC', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' };
      case 'enemy':
        return { label: 'ENEMY', color: 'bg-red-500/20 text-red-400 border-red-500/50' };
      case 'neutral':
        return { label: 'NEUTRAL', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' };
      default:
        return { label: 'PC', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' };
    }
  };

  const handleDeleteCharacter = async () => {
    if (activeCharacterId) {
      const success = await deleteCharacter(activeCharacterId);
      if (success) {
        setShowDeleteConfirm(false);
      }
    }
  };

  React.useEffect(() => {
    // Refresh character data when view mounts or when the active character changes.
    syncState(true);
  }, [activeCharacterId, syncState]);

  if (!activeCharacter) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 text-terminal-green/60">
        <div className="text-center space-y-4">
          <p className="text-xl">NO CHARACTER DATA DETECTED</p>
          <p className="text-sm">Initialize character via terminal to view stats.</p>
        </div>
      </div>
    );
  }

  const { name, level, class: charClass, race, hp, xp, stats, conditions, currencies, savingThrowProficiencies, speed } = activeCharacter;

  const equippedItems = inventory.filter((i) => i.equipped);
  const stowedItems = inventory.filter((i) => !i.equipped);

  // Helper to calculate modifier
  const getMod = (score: number): number => Math.floor((score - 10) / 2);
  const formatMod = (mod: number): string => mod >= 0 ? `+${mod}` : `${mod}`;

  // Calculate proficiency bonus
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2;

  // Get armor info and check for shield
  const armorInfo = getArmorInfo(activeCharacter.equipment?.armor || 'None');
  const hasShield = equippedItems.some(i =>
    i.name.toLowerCase().includes('shield') ||
    i.type?.toLowerCase() === 'shield'
  );
  const dexMod = getMod(stats.dex);
  const acCalc = activeCharacter.armorClass
    ? { total: activeCharacter.armorClass, breakdown: 'Override' }
    : calculateAC(armorInfo, dexMod, hasShield);

  // Saving throws calculation
  const savingThrows = [
    { key: 'str', label: 'STR', stat: stats.str },
    { key: 'dex', label: 'DEX', stat: stats.dex },
    { key: 'con', label: 'CON', stat: stats.con },
    { key: 'int', label: 'INT', stat: stats.int },
    { key: 'wis', label: 'WIS', stat: stats.wis },
    { key: 'cha', label: 'CHA', stat: stats.cha },
  ] as const;

  const StatBlock = ({ label, value }: { label: string; value: number }) => (
    <div className="flex flex-col items-center p-4 border border-terminal-green/30 bg-terminal-green/5">
      <span className="text-sm text-terminal-green/60 uppercase tracking-wider mb-1">{label}</span>
      <span className="text-3xl font-bold mb-1">{value}</span>
      <span className="text-sm font-bold bg-terminal-green text-terminal-black px-2 rounded">
        {formatMod(getMod(value))}
      </span>
    </div>
  );

  return (
    <>
    <div className="h-full w-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-terminal-green/20 scrollbar-track-transparent">
      {/* Header Section */}
      <div className="border-b-2 border-terminal-green pb-6 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Character Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
                  className="text-4xl font-bold uppercase hover:text-terminal-green-bright transition-colors flex items-center gap-2"
                  title="Switch Character"
                >
                  {name}
                  <span className="text-lg">▼</span>
                </button>
                {showCharacterDropdown && partyMembers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 bg-terminal-black border border-terminal-green rounded shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
                    {partyMembers.map((member) => (
                      <button
                        key={member.characterId}
                        onClick={() => {
                          if (activePartyId) {
                            setActiveCharacter(activePartyId, member.characterId);
                          }
                          setShowCharacterDropdown(false);
                        }}
                        className={`block w-full px-3 py-2 text-left hover:bg-terminal-green/10 transition-colors ${
                          member.isActive ? 'bg-terminal-green/20 text-terminal-green-bright' : 'text-terminal-green'
                        }`}
                      >
                        <div className="font-semibold">{member.character?.name || member.characterId}</div>
                        <div className="text-xs opacity-60">
                          {member.character?.class} • {member.role}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Character Type Badge */}
              <span className={`text-xs px-2 py-1 border rounded font-bold ${getTypeBadge(activeCharacter.characterType).color}`}>
                {getTypeBadge(activeCharacter.characterType).label}
              </span>
              
              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                title="Delete Character"
              >
                🗑️
              </button>
            </div>
            <div className="flex space-x-4 text-lg text-terminal-green/80">
              <span>LVL {level}</span>
              {race && <span>{race}</span>}
              <span>{charClass}</span>
              <span className="text-terminal-green/50">PROF {formatMod(proficiencyBonus)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-sm text-terminal-green/60 mr-2">HP</span>
              <span className="text-2xl font-bold">{hp.current}</span>
              <span className="text-terminal-green/60">/{hp.max}</span>
            </div>
            <div>
              <span className="text-sm text-terminal-green/60 mr-2">XP</span>
              <span className="text-xl">{xp.current}</span>
              <span className="text-terminal-green/60 text-sm"> / {xp.max}</span>
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="mt-4 w-full h-4 bg-terminal-green/10 border border-terminal-green/30 relative">
          <div
            className="h-full bg-terminal-green transition-all duration-500"
            style={{ width: `${Math.min((hp.current / hp.max) * 100, 100)}%` }}
          />
        </div>

        {/* Conditions Display */}
        <div className="mt-4">
          <ConditionsDisplay
            conditions={conditions || []}
            onAddCondition={async (condition) => {
              if (activeCharacter?.id) {
                await updateCharacter(activeCharacter.id, {
                  addConditions: [condition]
                });
                await syncState(true);
              }
            }}
            onRemoveCondition={async (conditionName) => {
              if (activeCharacter?.id) {
                await updateCharacter(activeCharacter.id, {
                  removeConditions: [conditionName]
                });
                await syncState(true);
              }
            }}
          />
        </div>
      </div>

      {/* Ability Scores Grid */}
      {/* Tabs Navigation */}
      <div className="flex border-b border-terminal-green/30 mb-6">
        <button
          className={`px-6 py-2 font-bold transition-colors ${
            viewTab === 'stats' 
              ? 'bg-terminal-green/20 text-terminal-green-bright border-b-2 border-terminal-green' 
              : 'text-terminal-green/60 hover:text-terminal-green hover:bg-terminal-green/5'
          }`}
          onClick={() => setViewTab('stats')}
        >
          STATS & GEAR
        </button>
        <button
          className={`px-6 py-2 font-bold transition-colors ${
            viewTab === 'spells' 
              ? 'bg-terminal-green/20 text-terminal-green-bright border-b-2 border-terminal-green' 
              : 'text-terminal-green/60 hover:text-terminal-green hover:bg-terminal-green/5'
          }`}
          onClick={() => setViewTab('spells')}
        >
          SPELL BOOK
        </button>
        <button
          className={`px-6 py-2 font-bold transition-colors ${
            viewTab === 'effects' 
              ? 'bg-terminal-green/20 text-terminal-green-bright border-b-2 border-terminal-green' 
              : 'text-terminal-green/60 hover:text-terminal-green hover:bg-terminal-green/5'
          }`}
          onClick={() => setViewTab('effects')}
        >
          EFFECTS
        </button>
      </div>

      {viewTab === 'stats' ? (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatBlock label="STR" value={stats.str} />
            <StatBlock label="DEX" value={stats.dex} />
            <StatBlock label="CON" value={stats.con} />
            <StatBlock label="INT" value={stats.int} />
            <StatBlock label="WIS" value={stats.wis} />
            <StatBlock label="CHA" value={stats.cha} />
          </div>

          {/* Combat Stats + Saving Throws */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-terminal-green/30 p-4">
              <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">COMBAT</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-terminal-green/60">ARMOR CLASS</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{acCalc.total}</span>
                    <div className="text-xs text-terminal-green/50">{acCalc.breakdown}</div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-green/60">INITIATIVE</span>
                  <span>{formatMod(dexMod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-green/60">SPEED</span>
                  <span>{speed || 30} ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-green/60">PROFICIENCY</span>
                  <span>{formatMod(proficiencyBonus)}</span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => syncState(true)}
                  className="text-xs border border-terminal-green px-2 py-1 text-terminal-green hover:bg-terminal-green/10 transition-colors"
                >
                  Refresh from MCP
                </button>
              </div>
            </div>

            {/* Saving Throws */}
            <div className="border border-terminal-green/30 p-4">
              <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">SAVING THROWS</h3>
              <div className="grid grid-cols-2 gap-2">
                {savingThrows.map(({ key, label, stat }) => {
                  const isProficient = savingThrowProficiencies?.includes(key) ?? false;
                  const mod = getMod(stat);
                  const totalMod = isProficient ? mod + proficiencyBonus : mod;
                  return (
                    <div
                      key={key}
                      className={`flex justify-between items-center p-2 rounded ${
                        isProficient ? 'bg-terminal-green/20 border border-terminal-green/40' : 'bg-terminal-green/5'
                      }`}
                    >
                      <span className="text-sm">
                        {isProficient && <span className="text-terminal-green mr-1">●</span>}
                        {label}
                      </span>
                      <span className={`font-bold ${isProficient ? 'text-terminal-green' : ''}`}>
                        {formatMod(totalMod)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Currencies + Equipment */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Currencies */}
            <div className="border border-terminal-green/30 p-4">
              <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">CURRENCY</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
                  <div className="text-2xl font-bold text-yellow-500">{currencies?.gold ?? 0}</div>
                  <div className="text-xs text-yellow-600/80 uppercase">Gold</div>
                </div>
                <div className="text-center p-2 bg-gray-500/20 border border-gray-400/30 rounded">
                  <div className="text-2xl font-bold text-gray-300">{currencies?.silver ?? 0}</div>
                  <div className="text-xs text-gray-400/80 uppercase">Silver</div>
                </div>
                <div className="text-center p-2 bg-orange-900/20 border border-orange-700/30 rounded">
                  <div className="text-2xl font-bold text-orange-400">{currencies?.copper ?? 0}</div>
                  <div className="text-xs text-orange-600/80 uppercase">Copper</div>
                </div>
              </div>
              {(currencies?.platinum !== undefined && currencies.platinum > 0) && (
                <div className="mt-3 text-center p-2 bg-blue-900/20 border border-blue-400/30 rounded">
                  <span className="text-blue-300 font-bold">{currencies.platinum}</span>
                  <span className="text-xs text-blue-400/80 uppercase ml-2">Platinum</span>
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="border border-terminal-green/30 p-4">
              <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">EQUIPMENT</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Armor</div>
                  <div className="text-lg">{activeCharacter.equipment?.armor || 'None'}</div>
                </div>
                <div>
                  <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Weapons</div>
                  {activeCharacter.equipment?.weapons && activeCharacter.equipment.weapons.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {activeCharacter.equipment.weapons.map((w, i) => (
                        <li key={i} className="text-lg">{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-lg text-terminal-green/40">None</div>
                  )}
                </div>
                {equippedItems.length > 0 && (
                  <div>
                    <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-1">Equipped Items</div>
                    <ul className="list-disc list-inside space-y-1 text-terminal-green">
                      {equippedItems.map((item) => (
                        <li key={item.id}>
                          <span className="font-semibold">{item.name}</span>
                          {item.type ? <span className="text-terminal-green/60"> ({item.type})</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inventory List */}
          <div className="border border-terminal-green/30 p-4">
            <h3 className="text-lg font-bold border-b border-terminal-green/30 pb-2 mb-4">INVENTORY</h3>
            {inventory.length === 0 ? (
              <div className="text-terminal-green/60">No items carried.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {stowedItems.map((item) => (
                  <div key={item.id} className="border border-terminal-green/20 p-2 bg-terminal-green/5">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-terminal-green/60">
                      {item.type || 'misc'} • {item.weight ?? '?'} lbs
                    </div>
                    {item.description ? (
                      <div className="text-xs text-terminal-green/70 mt-1 line-clamp-3">{item.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : viewTab === 'spells' ? (
        <div className="h-full">
          <SpellBookView
            characterId={activeCharacter.id || ''}
            spellSlots={activeCharacter.spellSlots as any} 
            pactMagicSlots={activeCharacter.pactMagicSlots as any}
            knownSpells={activeCharacter.knownSpells}
            preparedSpells={activeCharacter.preparedSpells}
            cantripsKnown={activeCharacter.cantripsKnown}
            spellSaveDC={activeCharacter.spellSaveDC}
            spellAttackBonus={activeCharacter.spellAttackBonus}
            spellcastingAbility={activeCharacter.spellcastingAbility}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-black/40 border border-terminal-green/30 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-terminal-green-bright mb-4 border-b border-terminal-green/30 pb-2">
              ACTIVE EFFECTS
            </h3>
            <p className="text-terminal-green/60 text-sm mb-4">
              Detailed tracking of boons, curses, and magical transformations affecting your character.
            </p>
            
            {activeCharacter.customEffects && activeCharacter.customEffects.length > 0 ? (
               <CustomEffectsDisplay effects={activeCharacter.customEffects} />
            ) : (
               <div className="text-center py-8 text-terminal-green/40 italic">
                 No active custom effects.
               </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-terminal-green/20 text-right">
              <button
                onClick={() => syncState(true)}
                className="text-xs border border-terminal-green px-3 py-1 text-terminal-green hover:bg-terminal-green/10 transition-colors"
              >
                Refresh Effects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCharacter}
        title="Delete Character"
        message={`Are you sure you want to permanently delete ${name}? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
        isLoading={isLoading}
      />
    </>
  );
};
