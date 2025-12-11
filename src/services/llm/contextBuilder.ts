/**
 * Context Builder - Seven-Layer Context Architecture
 * 
 * Assembles the system prompt from static and dynamic layers:
 * - Layer 1: AI DM Core Identity (static, runtime-editable)
 * - Layer 2: Game System Rules (static, runtime-editable)
 * - Layer 3: World State Snapshot (dynamic)
 * - Layer 4: Party & Character Context (dynamic)
 * - Layer 5: Narrative Memory (rolling)
 * - Layer 6: Scene Context (variable)
 * - Layer 7: Secrets Injection (dynamic)
 */

import { mcpManager } from '../mcpClient';
import { parseMcpResponse } from '../../utils/mcpUtils';

// Default static prompts - loaded from markdown files at build time
import layer1IdentityDefault from './context/layer1-identity.md?raw';
import layer2RulesDefault from './context/layer2-rules.md?raw';

// ============================================================================
// TYPES
// ============================================================================

export type Verbosity = 'minimal' | 'standard' | 'detailed';

export type RefreshTrigger = 
  | 'session_start'      // Full refresh (all layers)
  | 'scene_change'       // Layers 3, 6, 7
  | 'turn_end'           // Layers 4, 6
  | 'significant_event'  // Layer 5
  | 'player_query';      // Direct tool call, bypass cache

export interface ContextOptions {
  worldId: string;
  characterId?: string;
  partyId?: string;
  encounterId?: string;
  activeNpcId?: string;
  verbosity?: Verbosity;
}

export interface ContextLayers {
  layer1_identity: string;      // Static (~400 tokens)
  layer2_rules: string;         // Static (~800 tokens)
  layer3_world: string;         // Dynamic (~600 tokens)
  layer4_party: string;         // Dynamic (~1200 tokens)
  layer5_narrative: string;     // Rolling (~800 tokens)
  layer6_scene: string;         // Variable (~1000 tokens)
  layer7_secrets: string;       // Dynamic (~300 tokens)
}

// ============================================================================
// STORAGE FOR RUNTIME-EDITABLE PROMPTS
// ============================================================================

const STORAGE_KEY_LAYER1 = 'questkeeper_prompt_layer1';
const STORAGE_KEY_LAYER2 = 'questkeeper_prompt_layer2';

/**
 * Get Layer 1 prompt (runtime-editable via localStorage)
 */
export function getLayer1Prompt(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_LAYER1);
    if (stored) return stored;
  }
  return layer1IdentityDefault;
}

/**
 * Set Layer 1 prompt (for runtime editing)
 */
export function setLayer1Prompt(prompt: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAYER1, prompt);
  }
}

/**
 * Get Layer 2 prompt (runtime-editable via localStorage)
 */
export function getLayer2Prompt(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_LAYER2);
    if (stored) return stored;
  }
  return layer2RulesDefault;
}

/**
 * Set Layer 2 prompt (for runtime editing)
 */
export function setLayer2Prompt(prompt: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LAYER2, prompt);
  }
}

/**
 * Reset prompts to defaults
 */
export function resetPromptsToDefaults(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_LAYER1);
    localStorage.removeItem(STORAGE_KEY_LAYER2);
  }
}

// ============================================================================
// CONTEXT FETCHING
// ============================================================================

/**
 * Fetch Layer 3: World State Snapshot
 */
async function fetchWorldContext(worldId: string, verbosity: Verbosity): Promise<string> {
  try {
    const result = await mcpManager.gameStateClient.callTool('get_narrative_context', {
      worldId,
      verbosity,
      includeNarrativeMemory: false, // Separate layer
      includeSecrets: false // Separate layer
    });
    
    const text = parseMcpResponse<string>(result, '');
    if (typeof text === 'string') return text;
    
    // Extract text from MCP response format
    if (result?.content?.[0]?.text) {
      return result.content[0].text;
    }
    return '';
  } catch (e) {
    console.warn('[ContextBuilder] Failed to fetch world context:', e);
    return '';
  }
}

/**
 * Fetch Layer 4: Party & Character Context
 */
async function fetchPartyContext(partyId: string | undefined, characterId: string | undefined, verbosity: Verbosity): Promise<string> {
  if (!partyId && !characterId) return '';
  
  try {
    const promises: Promise<any>[] = [];
    
    if (partyId) {
      promises.push(
        mcpManager.gameStateClient.callTool('get_party_context', {
          partyId,
          verbosity
        })
      );
    }
    
    if (characterId) {
      promises.push(
        mcpManager.gameStateClient.callTool('get_character', {
          characterId,
          includeInventory: verbosity !== 'minimal',
          includeSpells: verbosity !== 'minimal'
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    const sections: string[] = [];
    for (const result of results) {
      if (result?.content?.[0]?.text) {
        sections.push(result.content[0].text);
      }
    }
    
    return sections.join('\n\n');
  } catch (e) {
    console.warn('[ContextBuilder] Failed to fetch party context:', e);
    return '';
  }
}

/**
 * Fetch Layer 5: Narrative Memory (Rolling)
 */
async function fetchNarrativeMemory(worldId: string): Promise<string> {
  try {
    const result = await mcpManager.gameStateClient.callTool('get_narrative_context_notes', {
      worldId,
      includeTypes: ['plot_thread', 'canonical_moment', 'npc_voice', 'foreshadowing'],
      maxPerType: 5,
      statusFilter: ['active']
    });
    
    if (result?.content?.[0]?.text) {
      return result.content[0].text;
    }
    return '';
  } catch (e) {
    console.warn('[ContextBuilder] Failed to fetch narrative memory:', e);
    return '';
  }
}

/**
 * Fetch Layer 6: Scene Context (Variable by situation)
 */
async function fetchSceneContext(
  encounterId: string | undefined, 
  activeNpcId: string | undefined,
  characterId: string | undefined,
  verbosity: Verbosity
): Promise<string> {
  try {
    // Combat scene takes priority
    if (encounterId) {
      const [encounterResult, mapResult] = await Promise.all([
        mcpManager.gameStateClient.callTool('get_encounter_state', { encounterId }),
        verbosity !== 'minimal' 
          ? mcpManager.gameStateClient.callTool('render_map', { encounterId, width: 15, height: 15 })
          : Promise.resolve(null)
      ]);
      
      const sections: string[] = [];
      if (encounterResult?.content?.[0]?.text) {
        sections.push('# ACTIVE COMBAT\n' + encounterResult.content[0].text);
      }
      if (mapResult?.content?.[0]?.text) {
        sections.push('## Battlefield\n```\n' + mapResult.content[0].text + '\n```');
      }
      return sections.join('\n\n');
    }
    
    // Dialogue scene
    if (activeNpcId && characterId) {
      const result = await mcpManager.gameStateClient.callTool('get_npc_context', {
        characterId,
        npcId: activeNpcId,
        memoryLimit: 5
      });
      
      if (result?.content?.[0]?.text) {
        return '# ACTIVE CONVERSATION\n' + result.content[0].text;
      }
    }
    
    // Exploration scene (fallback)
    if (characterId) {
      const result = await mcpManager.gameStateClient.callTool('look_at_surroundings', {
        observerId: characterId
      });
      
      if (result?.content?.[0]?.text) {
        return '# CURRENT SURROUNDINGS\n' + result.content[0].text;
      }
    }
    
    return '';
  } catch (e) {
    console.warn('[ContextBuilder] Failed to fetch scene context:', e);
    return '';
  }
}

/**
 * Fetch Layer 7: Secrets Injection
 */
async function fetchSecrets(worldId: string): Promise<string> {
  try {
    const result = await mcpManager.gameStateClient.callTool('get_secrets_for_context', {
      worldId
    });
    
    if (result?.content?.[0]?.text) {
      return '# DM SECRETS (DO NOT REVEAL)\n' + result.content[0].text;
    }
    return '';
  } catch (e) {
    console.warn('[ContextBuilder] Failed to fetch secrets:', e);
    return '';
  }
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

/**
 * Build the complete system prompt from all 7 layers
 * 
 * Token budget: ~5100 tokens total
 * - Layer 1 (Identity): ~400 tokens
 * - Layer 2 (Rules): ~800 tokens
 * - Layer 3 (World): ~600 tokens
 * - Layer 4 (Party): ~1200 tokens
 * - Layer 5 (Narrative): ~800 tokens
 * - Layer 6 (Scene): ~1000 tokens
 * - Layer 7 (Secrets): ~300 tokens
 */
export async function buildSystemPrompt(options: ContextOptions): Promise<string> {
  const { 
    worldId, 
    characterId, 
    partyId, 
    encounterId, 
    activeNpcId,
    verbosity = 'standard' 
  } = options;
  
  console.log('[ContextBuilder] Building system prompt with options:', { worldId, characterId, partyId, encounterId, activeNpcId, verbosity });
  
  // Static layers (runtime-editable)
  const layer1 = getLayer1Prompt();
  const layer2 = getLayer2Prompt();
  
  // Dynamic layers (fetched in parallel)
  const [layer3, layer4, layer5, layer6, layer7] = await Promise.all([
    fetchWorldContext(worldId, verbosity),
    fetchPartyContext(partyId, characterId, verbosity),
    fetchNarrativeMemory(worldId),
    fetchSceneContext(encounterId, activeNpcId, characterId, verbosity),
    fetchSecrets(worldId)
  ]);
  
  // Assemble with section markers
  const sections: string[] = [layer1];
  
  if (layer2) sections.push('---\n' + layer2);
  if (layer3) sections.push('---\n' + layer3);
  if (layer4) sections.push('---\n' + layer4);
  if (layer5) sections.push('---\n' + layer5);
  if (layer6) sections.push('---\n' + layer6);
  if (layer7) sections.push('---\n' + layer7);
  
  const systemPrompt = sections.join('\n\n');
  
  console.log(`[ContextBuilder] Built system prompt: ${systemPrompt.length} chars, ~${Math.ceil(systemPrompt.length / 4)} tokens`);
  
  return systemPrompt;
}

/**
 * Build a session resume prompt for "Previously on..." functionality
 */
export async function buildSessionResumePrompt(worldId: string, _characterId: string): Promise<string> {
  try {
    // Get the most recent session log
    const result = await mcpManager.gameStateClient.callTool('search_narrative_notes', {
      worldId,
      type: 'session_log',
      limit: 1,
      orderBy: 'created_at'
    });
    
    let sessionSummary = '';
    if (result?.content?.[0]?.text) {
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.notes && parsed.notes.length > 0) {
        sessionSummary = parsed.notes[0].content;
      }
    }
    
    // Get recent plot threads
    const plotResult = await mcpManager.gameStateClient.callTool('search_narrative_notes', {
      worldId,
      type: 'plot_thread',
      status: 'active',
      limit: 3
    });
    
    let plotThreads = '';
    if (plotResult?.content?.[0]?.text) {
      const parsed = JSON.parse(plotResult.content[0].text);
      if (parsed.notes && parsed.notes.length > 0) {
        plotThreads = parsed.notes.map((n: any) => `- ${n.content}`).join('\n');
      }
    }
    
    return `# SESSION RESUME

You are resuming a Quest Keeper AI campaign. Provide a brief "Previously on..." summary to the player.

## Last Session
${sessionSummary || 'No previous session recorded.'}

## Active Plot Threads
${plotThreads || 'No active plot threads.'}

## Instructions
1. Greet the player warmly
2. Provide a 2-3 sentence "Previously on..." summary
3. Ask where they'd like to pick up
`;
  } catch (e) {
    console.warn('[ContextBuilder] Failed to build session resume prompt:', e);
    return '';
  }
}
