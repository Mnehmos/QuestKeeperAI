import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { usePartyStore, Party } from '../../stores/partyStore';
import { useGameStateStore } from '../../stores/gameStateStore';
import { mcpManager } from '../../services/mcpClient';
import { llmService } from '../../services/llm/LLMService';
import { WorldGenerationModal } from './WorldGenerationModal';
import { CharacterCreationModal } from '../party/CharacterCreationModal';
import { PartyCreatorModal } from '../party/PartyCreatorModal';

// ============================================
// Types
// ============================================

type WizardStep = 'details' | 'world' | 'party' | 'location' | 'launch';

interface WizardState {
  campaignName: string;
  description: string;
  worldId: string | null;
  partyId: string | null;
  activeCharacterId: string | null;
  startingLocationType: 'tavern' | 'road' | 'dungeon' | 'forest' | 'city' | 'custom';
  startingLocationName: string;
  startingContext: string;
}

interface CampaignSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sessionId: string, initialPrompt: string) => void;
}

// ============================================
// Main Component
// ============================================

export const CampaignSetupWizard: React.FC<CampaignSetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [showWorldGenModal, setShowWorldGenModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');
  const [worldGenSeed, setWorldGenSeed] = useState('');
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    campaignName: '',
    description: '',
    worldId: null,
    partyId: null,
    activeCharacterId: null,
    startingLocationType: 'tavern',
    startingLocationName: '',
    startingContext: 'The adventure begins...',
  });

  // Store selectors
  const worlds = useGameStateStore((state) => state.worlds);
  const parties = usePartyStore((state) => state.parties);
  const partyDetails = usePartyStore((state) => state.partyDetails);
  const unassignedCharacters = usePartyStore((state) => state.unassignedCharacters);
  const syncUnassignedCharacters = usePartyStore((state) => state.syncUnassignedCharacters);
  const createSession = useSessionStore((state) => state.createSession);

  // Party details are already available through partyDetails map
  // No need to fetch - the main view already loads them
  
  // Sync unassigned characters when on party step
  useEffect(() => {
    if (isOpen && currentStep === 'party') {
      syncUnassignedCharacters();
    }
  }, [isOpen, currentStep, syncUnassignedCharacters]);

  // Reset wizard only when modal OPENS, not when stores sync
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setCurrentStep('details');
      setWizardState({
        campaignName: '',
        description: '',
        worldId: worlds.length > 0 ? worlds[0].id : null,
        partyId: parties.length > 0 ? parties[0].id : null,
        activeCharacterId: null,
        startingLocationType: 'tavern',
        startingLocationName: '',
        startingContext: 'The adventure begins...',
      });
      setHasInitialized(true);
    } else if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen, hasInitialized, worlds, parties]);

  // Update field helper
  const updateField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setWizardState(prev => ({ ...prev, [key]: value }));
  };

  // Navigation
  const steps: WizardStep[] = ['details', 'world', 'party', 'location', 'launch'];
  const currentIndex = steps.indexOf(currentStep);
  
  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Launch campaign
  const handleLaunch = () => {
    // Create the session
    const sessionId = createSession({
      name: wizardState.campaignName || 'New Campaign',
      description: wizardState.description,
      partyId: wizardState.partyId,
      worldId: wizardState.worldId,
      activeCharacterId: wizardState.activeCharacterId,
    });

    // Build the initial prompt for the LLM
    const locationLabel = getLocationLabel(wizardState.startingLocationType);
    const locationName = wizardState.startingLocationName || locationLabel;
    
    const initialPrompt = `
[CAMPAIGN START]
The party begins their adventure in ${locationName}.
Context: ${wizardState.startingContext}

Generate an immersive opening scene. Describe the environment, atmosphere, and any immediate hooks or details that draw the party in. Set the tone for an epic adventure!
    `.trim();

    onComplete(sessionId, initialPrompt);
  };

  // Location type labels
  const getLocationLabel = (type: WizardState['startingLocationType']) => {
    const labels: Record<WizardState['startingLocationType'], string> = {
      tavern: 'A cozy tavern',
      road: 'The open road',
      dungeon: 'A dungeon entrance',
      forest: 'A mysterious forest',
      city: 'A bustling city',
      custom: 'Custom location',
    };
    return labels[type];
  };

  if (!isOpen) return null;

  // Get selected party members
  const selectedParty = wizardState.partyId ? partyDetails[wizardState.partyId] : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-terminal-black border-2 border-terminal-green rounded-lg w-full max-w-2xl mx-4 shadow-[0_0_30px_rgba(0,255,0,0.3)]">
        {/* Header */}
        <div className="border-b border-terminal-green p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-terminal-green">
            🎭 New Campaign Setup
          </h2>
          <button
            onClick={onClose}
            className="text-terminal-green hover:text-terminal-green-bright text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 border-b border-terminal-green/30">
          <div className="flex justify-between">
            {steps.map((step, idx) => (
              <div
                key={step}
                className={`flex-1 text-center text-sm ${
                  idx <= currentIndex ? 'text-terminal-green' : 'text-terminal-green/30'
                }`}
              >
                {idx < currentIndex ? '✓ ' : ''}
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </div>
            ))}
          </div>
          <div className="mt-2 h-1 bg-terminal-green/20 rounded">
            <div
              className="h-full bg-terminal-green rounded transition-all"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px]">
          {/* Step 1: Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-terminal-green mb-4">
                📜 Campaign Details
              </h3>
              <div>
                <label className="block text-terminal-green text-sm mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={wizardState.campaignName}
                  onChange={(e) => updateField('campaignName', e.target.value)}
                  placeholder="e.g., Curse of Strahd"
                  className="w-full bg-black border border-terminal-green rounded px-3 py-2 text-terminal-green focus:outline-none focus:border-terminal-green-bright"
                />
              </div>
              <div>
                <label className="block text-terminal-green text-sm mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={wizardState.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Brief description of the campaign..."
                  rows={3}
                  className="w-full bg-black border border-terminal-green rounded px-3 py-2 text-terminal-green focus:outline-none focus:border-terminal-green-bright resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: World */}
          {currentStep === 'world' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-terminal-green mb-4">
                🌍 Select World
              </h3>
              
              {/* Create New World Option */}
              <div className="border-2 border-dashed border-terminal-green/50 rounded p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">✨</span>
                  <span className="text-terminal-green font-bold">Create New World</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="Enter world name..."
                    className="flex-1 bg-black border border-terminal-green rounded px-3 py-2 text-terminal-green text-sm focus:outline-none focus:border-terminal-green-bright"
                  />
                  <button
                    onClick={() => {
                      if (newWorldName) {
                        setWorldGenSeed(`${newWorldName}-${Date.now()}`);
                        setShowWorldGenModal(true);
                      }
                    }}
                    disabled={!newWorldName}
                    className="px-4 py-2 bg-terminal-green text-terminal-black rounded font-bold text-sm hover:bg-terminal-green-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🌍 Generate
                  </button>
                </div>
              </div>

              {/* Existing Worlds */}
              {worlds.length === 0 ? (
                <p className="text-terminal-green/70 text-sm">
                  No existing worlds. Create one above!
                </p>
              ) : (
                <>
                  <div className="text-terminal-green/60 text-xs uppercase tracking-wider mb-2">
                    Or select existing world:
                  </div>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {worlds.map((world: any) => (
                      <div
                        key={world.id}
                        className={`p-3 border rounded transition-all flex items-center justify-between ${
                          wizardState.worldId === world.id
                            ? 'border-terminal-green bg-terminal-green/20'
                            : 'border-terminal-green/30 hover:border-terminal-green'
                        }`}
                      >
                        {/* World Info */}
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => updateField('worldId', world.id)}
                        >
                          <div className="font-bold text-terminal-green">
                            {world.name || 'Unnamed World'}
                          </div>
                          <div className="text-sm text-terminal-green/60">
                            {world.width && world.height ? `${world.width}x${world.height}` : 'Unknown size'}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={() => {
                              updateField('worldId', world.id);
                              setCurrentStep('party');
                            }}
                            className="px-3 py-1 bg-terminal-green/20 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/30 transition-colors"
                            title="Load this world and continue"
                          >
                            Load
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete world "${world.name}"? This cannot be undone.`)) {
                                try {
                                  await mcpManager.gameStateClient.callTool('delete_world', { id: world.id });
                                  // Refresh worlds list
                                  await useGameStateStore.getState().syncState(true);
                                  // Clear selection if deleted world was selected
                                  if (wizardState.worldId === world.id) {
                                    updateField('worldId', null);
                                  }
                                } catch (e) {
                                  console.error('Failed to delete world:', e);
                                  alert('Failed to delete world');
                                }
                              }
                            }}
                            className="px-3 py-1 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded hover:bg-red-900/50 transition-colors"
                            title="Delete this world"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}


          {/* Step 3: Party */}
          {currentStep === 'party' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-terminal-green">
                  👥 Select Party
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCharacterModal(true)}
                    className="px-3 py-1 bg-terminal-green/20 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/30 transition-colors"
                  >
                    + New Character
                  </button>
                  <button
                    onClick={() => setShowPartyModal(true)}
                    className="px-3 py-1 bg-terminal-green/20 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/30 transition-colors"
                  >
                    + New Party
                  </button>
                </div>
              </div>
              {parties.length === 0 ? (
                <div className="border-2 border-dashed border-terminal-green/40 rounded-lg p-6 text-center">
                  {unassignedCharacters.length > 0 ? (
                    <>
                      {/* Characters exist but no party yet */}
                      <div className="bg-terminal-green/10 border border-terminal-green/30 rounded p-3 mb-4">
                        <p className="text-terminal-green font-bold mb-2">
                          ✓ {unassignedCharacters.length} Character{unassignedCharacters.length > 1 ? 's' : ''} Ready
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {unassignedCharacters.map(char => (
                            <span key={char.id} className="px-2 py-1 bg-terminal-green/20 rounded text-xs text-terminal-green">
                              {char.name} - Lvl {char.level} {char.class}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-terminal-green/70 mb-4">
                        Now create a party to organize your adventurers!
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setShowPartyModal(true)}
                          className="px-4 py-2 bg-terminal-green text-terminal-black rounded font-bold text-sm hover:bg-terminal-green-bright transition-colors"
                        >
                          👥 Create Party
                        </button>
                        <button
                          onClick={() => setShowCharacterModal(true)}
                          className="px-4 py-2 border border-terminal-green text-terminal-green rounded font-bold text-sm hover:bg-terminal-green/20 transition-colors"
                        >
                          + Add Another Character
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* No characters yet */}
                      <p className="text-terminal-green/70 mb-4">
                        No parties available yet.
                      </p>
                      <p className="text-terminal-green/50 text-sm mb-4">
                        First create a character, then create a party to organize your adventurers.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => setShowCharacterModal(true)}
                          className="px-4 py-2 bg-terminal-green text-terminal-black rounded font-bold text-sm hover:bg-terminal-green-bright transition-colors"
                        >
                          ⚔️ Create Character
                        </button>
                        <button
                          onClick={() => setShowPartyModal(true)}
                          className="px-4 py-2 border border-terminal-green text-terminal-green rounded font-bold text-sm hover:bg-terminal-green/20 transition-colors"
                        >
                          👥 Create Party
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-2 mb-4">
                    {parties.map((party: Party) => (
                      <div
                        key={party.id}
                        className={`p-3 border rounded transition-all flex items-center justify-between ${
                          wizardState.partyId === party.id
                            ? 'border-terminal-green bg-terminal-green/20'
                            : 'border-terminal-green/30 hover:border-terminal-green'
                        }`}
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => updateField('partyId', wizardState.partyId === party.id ? null : party.id)}
                        >
                          <div className="font-bold text-terminal-green">{party.name}</div>
                          <div className="text-sm text-terminal-green/60">
                            Status: {party.status}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete party "${party.name}"? This cannot be undone.`)) {
                              try {
                                await mcpManager.gameStateClient.callTool('delete_party', { id: party.id });
                                await usePartyStore.getState().syncParties();
                                if (wizardState.partyId === party.id) {
                                  updateField('partyId', null);
                                }
                              } catch (e) {
                                console.error('Failed to delete party:', e);
                                alert('Failed to delete party');
                              }
                            }
                          }}
                          className="px-2 py-1 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded hover:bg-red-900/50 transition-colors ml-2"
                          title="Delete party"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Character selector from party */}
                  {selectedParty && selectedParty.members.length > 0 && (
                    <div>
                      <label className="block text-terminal-green text-sm mb-2">
                        🎭 Play as (POV Character)
                      </label>
                      <div className="grid gap-2">
                        {selectedParty.members.map((member) => (
                          <div
                            key={member.characterId}
                            className={`p-2 border rounded transition-all flex items-center justify-between ${
                              wizardState.activeCharacterId === member.characterId
                                ? 'border-terminal-green bg-terminal-green/20'
                                : 'border-terminal-green/30 hover:border-terminal-green'
                            }`}
                          >
                            <div 
                              className="flex-1 cursor-pointer text-sm text-terminal-green"
                              onClick={() => updateField('activeCharacterId', wizardState.activeCharacterId === member.characterId ? null : member.characterId)}
                            >
                              {member.character?.name || 'Unknown'} - Lvl {member.character?.level || '?'} {member.character?.class || ''}
                            </div>
                            <button
                              onClick={async () => {
                                if (confirm(`Remove "${member.character?.name}" from party?`)) {
                                  try {
                                    await mcpManager.gameStateClient.callTool('remove_party_member', { 
                                      partyId: selectedParty.id, 
                                      characterId: member.characterId 
                                    });
                                    await usePartyStore.getState().syncPartyDetails(selectedParty.id);
                                    if (wizardState.activeCharacterId === member.characterId) {
                                      updateField('activeCharacterId', null);
                                    }
                                  } catch (e) {
                                    console.error('Failed to remove member:', e);
                                    alert('Failed to remove character from party');
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded hover:bg-red-900/50 transition-colors ml-2"
                              title="Remove from party"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Location */}
          {currentStep === 'location' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-terminal-green mb-4">
                📍 Starting Location
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['tavern', 'road', 'dungeon', 'forest', 'city', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateField('startingLocationType', type)}
                    className={`p-3 border rounded text-center transition-all ${
                      wizardState.startingLocationType === type
                        ? 'border-terminal-green bg-terminal-green/20 text-terminal-green'
                        : 'border-terminal-green/30 text-terminal-green/70 hover:border-terminal-green'
                    }`}
                  >
                    {type === 'tavern' && '🍺 Tavern'}
                    {type === 'road' && '🛤️ Road'}
                    {type === 'dungeon' && '🏰 Dungeon'}
                    {type === 'forest' && '🌲 Forest'}
                    {type === 'city' && '🏙️ City'}
                    {type === 'custom' && '✏️ Custom'}
                  </button>
                ))}
              </div>

              {wizardState.startingLocationType === 'custom' && (
                <div>
                  <label className="block text-terminal-green text-sm mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={wizardState.startingLocationName}
                    onChange={(e) => updateField('startingLocationName', e.target.value)}
                    placeholder="e.g., The Sunken Temple"
                    className="w-full bg-black border border-terminal-green rounded px-3 py-2 text-terminal-green focus:outline-none focus:border-terminal-green-bright"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-terminal-green text-sm">
                    Starting Context
                  </label>
                  <button
                    onClick={async () => {
                      setIsGeneratingContext(true);
                      try {
                        const locationType = wizardState.startingLocationType;
                        const locationName = wizardState.startingLocationName || locationType;
                        const partyName = selectedParty?.name || 'the adventuring party';
                        const characterName = selectedParty?.members.find(
                          m => m.characterId === wizardState.activeCharacterId
                        )?.character?.name || 'the hero';
                        
                        const prompt = `Generate a brief, atmospheric opening scene (2-3 sentences) for a D&D campaign. 
The party "${partyName}" begins their adventure in a ${locationType}${wizardState.startingLocationName ? ` called "${wizardState.startingLocationName}"` : ''}.
The main POV character is ${characterName}.
Set the mood, describe the immediate surroundings, and hint at adventure to come.
Be evocative and concise.`;

                        const response = await llmService.sendMessage([
                          { role: 'user', content: prompt }
                        ]);
                        
                        updateField('startingContext', response.trim());
                      } catch (e) {
                        console.error('Failed to generate context:', e);
                        alert('Failed to generate context. Check your API key in settings.');
                      } finally {
                        setIsGeneratingContext(false);
                      }
                    }}
                    disabled={isGeneratingContext}
                    className="px-3 py-1 bg-terminal-green/20 border border-terminal-green text-terminal-green text-xs rounded hover:bg-terminal-green/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isGeneratingContext ? '✨ Generating...' : '✨ Generate w/ AI'}
                  </button>
                </div>
                <textarea
                  value={wizardState.startingContext}
                  onChange={(e) => updateField('startingContext', e.target.value)}
                  placeholder="What's happening as the adventure begins?"
                  rows={3}
                  disabled={isGeneratingContext}
                  className="w-full bg-black border border-terminal-green rounded px-3 py-2 text-terminal-green focus:outline-none focus:border-terminal-green-bright resize-none disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Step 5: Launch */}
          {currentStep === 'launch' && (
            <div className="space-y-4 text-center">
              <h3 className="text-2xl font-bold text-terminal-green mb-4">
                🚀 Ready to Launch!
              </h3>
              <div className="bg-terminal-green/10 border border-terminal-green/30 rounded p-4 text-left">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-terminal-green/70">Campaign:</div>
                  <div className="text-terminal-green font-bold">
                    {wizardState.campaignName || 'Unnamed Campaign'}
                  </div>
                  <div className="text-terminal-green/70">World:</div>
                  <div className="text-terminal-green">
                    {worlds.find(w => w.id === wizardState.worldId)?.name || 'Default'}
                  </div>
                  <div className="text-terminal-green/70">Party:</div>
                  <div className="text-terminal-green">
                    {parties.find(p => p.id === wizardState.partyId)?.name || 'None'}
                  </div>
                  <div className="text-terminal-green/70">Location:</div>
                  <div className="text-terminal-green">
                    {wizardState.startingLocationName || getLocationLabel(wizardState.startingLocationType)}
                  </div>
                </div>
              </div>
              <p className="text-terminal-green/70 text-sm">
                Click "Begin Adventure" to start your campaign. The AI will generate an opening scene based on your choices.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-terminal-green p-4 flex justify-between">
          <button
            onClick={currentIndex === 0 ? onClose : goBack}
            className="px-4 py-2 border border-terminal-green/50 text-terminal-green/70 rounded hover:bg-terminal-green/10 transition-colors"
          >
            {currentIndex === 0 ? 'Cancel' : '← Back'}
          </button>
          
          {currentStep === 'launch' ? (
            <button
              onClick={handleLaunch}
              disabled={!wizardState.campaignName}
              className="px-6 py-2 bg-terminal-green text-terminal-black rounded font-bold hover:bg-terminal-green-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎮 Begin Adventure
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={currentStep === 'details' && !wizardState.campaignName}
              className="px-4 py-2 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green hover:text-terminal-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* World Generation Modal */}
      <WorldGenerationModal
        isOpen={showWorldGenModal}
        seed={worldGenSeed}
        worldName={newWorldName}
        onComplete={(newWorldId) => {
          console.log('[CampaignWizard] World generation complete, ID:', newWorldId);
          setShowWorldGenModal(false);
          updateField('worldId', newWorldId);
          setNewWorldName('');
          setWorldGenSeed('');
          // Trigger state refresh to show new world in list
          useGameStateStore.getState().syncState(true).then(() => {
            console.log('[CampaignWizard] State synced, advancing to Party step');
            // Auto-advance to next step (Party)
            setCurrentStep('party');
          });
        }}
        onCancel={() => {
          setShowWorldGenModal(false);
          setWorldGenSeed('');
        }}
      />

      {/* Character Creation Modal */}
      <CharacterCreationModal
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        onCreated={async (characterId) => {
          console.log('[CampaignWizard] Character created:', characterId);
          setShowCharacterModal(false);
          // Refresh party store to pick up new character
          await usePartyStore.getState().syncUnassignedCharacters();
          await useGameStateStore.getState().syncState(true);
        }}
      />

      {/* Party Creator Modal */}
      <PartyCreatorModal
        isOpen={showPartyModal}
        onClose={async () => {
          setShowPartyModal(false);
          // Refresh parties after modal closes
          await usePartyStore.getState().syncParties();
        }}
      />
    </div>
  );
};
