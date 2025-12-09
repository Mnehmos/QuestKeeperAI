import React, { useState } from 'react';
import { usePartyStore, PartyMemberWithCharacter, MemberRole } from '../../stores/partyStore';
import { useGameStateStore } from '../../stores/gameStateStore';
import { ConfirmModal } from '../common/ConfirmModal';
import { ConditionList } from '../common/ConditionBadge'; // Import ConditionList

interface PartyPanelProps {
  onAddMember?: () => void;
  onCreateCharacter?: () => void;
  onCreateParty?: () => void;
  compact?: boolean;
}

const FORMATION_OPTIONS = [
  { value: 'standard', label: 'Standard', icon: '|||' },
  { value: 'defensive', label: 'Defensive', icon: '(o)' },
  { value: 'aggressive', label: 'Aggressive', icon: '>>>' },
  { value: 'stealth', label: 'Stealth', icon: '...' },
  { value: 'scattered', label: 'Scattered', icon: '* *' },
];

export const PartyPanel: React.FC<PartyPanelProps> = ({ 
  onAddMember, 
  onCreateCharacter, 
  onCreateParty, 
  compact = false 
}) => {
  const [showFormation, setShowFormation] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showDeletePartyConfirm, setShowDeletePartyConfirm] = useState(false);

  const activePartyId = usePartyStore((state) => state.activePartyId);
  const partyDetails = usePartyStore((state) => state.partyDetails);
  const setLeader = usePartyStore((state) => state.setLeader);
  const setActiveCharacter = usePartyStore((state) => state.setActiveCharacter);
  const removeMember = usePartyStore((state) => state.removeMember);
  const updateParty = usePartyStore((state) => state.updateParty);
  const deleteParty = usePartyStore((state) => state.deleteParty);
  const isLoading = usePartyStore((state) => state.isLoading);

  // *** UNIFIED SOURCE OF TRUTH: Use gameStateStore for active character ***
  const activeCharacterId = useGameStateStore((state) => state.activeCharacterId);

  const activeParty = activePartyId ? partyDetails[activePartyId] : null;

  if (!activeParty) {
    return (
      <div className="p-4 text-center">
        <div className="text-terminal-green/50 text-sm mb-3">No party selected</div>
        <div className="flex flex-col gap-2">
          {onCreateParty && (
            <button
              onClick={onCreateParty}
              className="px-4 py-2 bg-terminal-green/10 border border-terminal-green text-terminal-green text-sm rounded hover:bg-terminal-green/20 transition-colors"
            >
              + Create Party
            </button>
          )}
          {onCreateCharacter && (
            <button
              onClick={onCreateCharacter}
              className="px-4 py-2 bg-purple-600/20 border border-purple-500 text-purple-300 text-sm rounded hover:bg-purple-600/30 transition-colors"
            >
              ⚔️ Create Character
            </button>
          )}
        </div>
      </div>
    );
  }

  const sortedMembers = [...activeParty.members].sort((a, b) => {
    // Leader first, then active character, then by position
    if (a.role === 'leader') return -1;
    if (b.role === 'leader') return 1;
    // *** Use unified activeCharacterId for sorting ***
    const aIsActive = a.characterId === activeCharacterId;
    const bIsActive = b.characterId === activeCharacterId;
    if (aIsActive) return -1;
    if (bIsActive) return 1;
    return (a.position || 0) - (b.position || 0);
  });

  const handleSetLeader = async (characterId: string) => {
    if (activePartyId) {
      await setLeader(activePartyId, characterId);
    }
  };

  const handlePlayAs = async (characterId: string) => {
    if (activePartyId) {
      await setActiveCharacter(activePartyId, characterId);
    }
  };

  const handleRemoveMember = async (characterId: string) => {
    if (activePartyId && confirm('Remove this character from the party?')) {
      await removeMember(activePartyId, characterId);
    }
  };

  const handleFormationChange = async (formation: string) => {
    if (activePartyId) {
      await updateParty(activePartyId, { formation });
      setShowFormation(false);
    }
  };

  const handleDeleteParty = async () => {
    if (activePartyId) {
      const success = await deleteParty(activePartyId);
      if (success) {
        setShowDeletePartyConfirm(false);
      }
    }
  };

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 0.5) return 'bg-green-500';
    if (ratio > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'leader':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L13 8L20 9L15 14L16 21L10 18L4 21L5 14L0 9L7 8L10 2Z" />
          </svg>
        );
      case 'companion':
        return (
          <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        );
      case 'hireling':
        return <span className="text-amber-400 text-xs">$</span>;
      case 'prisoner':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderMemberCard = (member: PartyMemberWithCharacter) => {
    const { character } = member;
    const isExpanded = expandedMember === member.characterId;
    // *** Use unified activeCharacterId instead of member.isActive ***
    const isActiveCharacter = member.characterId === activeCharacterId;

    return (
      <div
        key={member.characterId}
        className={`rounded-lg border transition-all ${
          isActiveCharacter
            ? 'bg-terminal-green/15 border-terminal-green shadow-[0_0_10px_rgba(0,255,0,0.2)]'
            : 'bg-terminal-green/5 border-terminal-green/30 hover:border-terminal-green/50'
        }`}
      >
        {/* Main Row */}
        <div
          className="p-2 cursor-pointer"
          onClick={() => setExpandedMember(isExpanded ? null : member.characterId)}
        >
          <div className="flex items-center gap-2">
            {/* Role Icon */}
            <div className="w-6 flex justify-center">{getRoleIcon(member.role)}</div>

            {/* Character Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`font-medium truncate ${isActiveCharacter ? 'text-terminal-green-bright' : 'text-terminal-green'}`}
                  title={character.name}
                >
                  {character.name}
                </span>
                {isActiveCharacter && (
                  <span className="text-xs bg-terminal-green/20 text-terminal-green px-1.5 py-0.5 rounded">
                    Playing
                  </span>
                )}
              </div>
              <div className="text-xs text-terminal-green/60">
                Lv{character.level} {character.race ? `${character.race} ` : ''}{character.class}
              </div>
              {character.conditions && character.conditions.length > 0 && (
                <div className="mt-1">
                  <ConditionList conditions={character.conditions} size="sm" limit={2} />
                </div>
              )}
            </div>

            {/* HP Bar */}
            <div className="w-16">
              <div className="h-1.5 bg-terminal-green/20 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getHpColor(character.hp, character.maxHp)} transition-all duration-300`}
                  style={{ width: `${Math.min(100, (character.hp / character.maxHp) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-terminal-green/60 text-right mt-0.5">
                {character.hp}/{character.maxHp}
              </div>
            </div>

            {/* Expand Arrow */}
            <svg
              className={`w-4 h-4 text-terminal-green/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded Actions */}
        {isExpanded && (
          <div className="px-2 pb-2 pt-1 border-t border-terminal-green/20">
            <div className="flex flex-wrap gap-1">
              {!isActiveCharacter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAs(member.characterId);
                  }}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-terminal-green/20 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/30 transition-colors disabled:opacity-50 font-medium"
                >
                  ▶ Play As
                </button>
              )}
              {member.role !== 'leader' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetLeader(member.characterId);
                  }}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 rounded hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                >
                  ★ Make Leader
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveMember(member.characterId);
                }}
                disabled={isLoading}
                className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            {member.notes && (
              <div className="mt-2 text-xs text-terminal-green/50 italic">{member.notes}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    <div className={compact ? '' : 'space-y-4'}>
      {/* Party Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
          Party ({activeParty.members.length})
        </h3>
        <div className="flex items-center gap-2">
          {/* Formation Selector */}
          <div className="relative">
            <button
              onClick={() => setShowFormation(!showFormation)}
              className="px-2 py-1 text-xs bg-terminal-green/10 border border-terminal-green/30 text-terminal-green rounded hover:bg-terminal-green/20 transition-colors"
              title="Formation"
            >
              {FORMATION_OPTIONS.find((f) => f.value === activeParty.formation)?.icon || '|||'}
            </button>
            {showFormation && (
              <div className="absolute right-0 top-full mt-1 bg-terminal-black border border-terminal-green rounded shadow-lg z-10">
                {FORMATION_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => handleFormationChange(f.value)}
                    className={`block w-full px-3 py-1.5 text-xs text-left hover:bg-terminal-green/10 transition-colors ${
                      activeParty.formation === f.value ? 'text-terminal-green-bright' : 'text-terminal-green'
                    }`}
                  >
                    <span className="font-mono mr-2">{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Character Button */}
          {onCreateCharacter && (
            <button
              onClick={onCreateCharacter}
              className="px-2 py-1 text-xs bg-purple-600/20 border border-purple-500/50 text-purple-300 rounded hover:bg-purple-600/30 transition-colors"
              title="Create Character"
            >
              ⚔️
            </button>
          )}

          {/* Add Member Button */}
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="px-2 py-1 text-xs bg-terminal-green/10 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/20 transition-colors"
              title="Add Member"
            >
              +
            </button>
          )}

          {/* Delete Party Button */}
          <button
            onClick={() => setShowDeletePartyConfirm(true)}
            className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/50 text-red-400 rounded hover:bg-red-500/20 transition-colors"
            title="Delete Party"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {sortedMembers.length > 0 ? (
          sortedMembers.map(renderMemberCard)
        ) : (
          <div className="text-center text-terminal-green/50 text-sm py-4">
            No members in party
            <div className="flex flex-col gap-2 mt-3">
              {onCreateCharacter && (
                <button
                  onClick={onCreateCharacter}
                  className="mx-auto px-3 py-1 text-xs bg-purple-600/20 border border-purple-500 text-purple-300 rounded hover:bg-purple-600/30 transition-colors"
                >
                  ⚔️ Create Character
                </button>
              )}
              {onAddMember && (
                <button
                  onClick={onAddMember}
                  className="mx-auto px-3 py-1 text-xs bg-terminal-green/10 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/20 transition-colors"
                >
                  + Add Existing
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Info */}
      {!compact && activeParty.currentLocation && (
        <div className="pt-2 border-t border-terminal-green/20">
          <div className="text-xs text-terminal-green/60">
            <span className="font-bold">Location:</span> {activeParty.currentLocation}
          </div>
        </div>
      )}
    </div>

      {/* Delete Party Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeletePartyConfirm}
        onClose={() => setShowDeletePartyConfirm(false)}
        onConfirm={handleDeleteParty}
        title="Delete Party"
        message={`Are you sure you want to delete "${activeParty?.name || 'this party'}"? All members will become unassigned.`}
        confirmText="Delete Party"
        isDanger={true}
        isLoading={isLoading}
      />
    </>
  );
};

export default PartyPanel;
