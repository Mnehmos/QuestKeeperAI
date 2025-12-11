import React, { useState, useCallback, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { mcpManager } from '../../services/mcpClient';
import { useGameStateStore } from '../../stores/gameStateStore';
import { useCombatStore } from '../../stores/combatStore';
import { useUIStore, ActiveTab } from '../../stores/uiStore';

// Slash command result interface
interface CommandResult {
  content: string;
  type?: 'text' | 'info' | 'error' | 'success';
}

// Helper to categorize tools
function categorizeTools(tools: any[]): Record<string, any[]> {
  const categories: Record<string, any[]> = {
    'Events': [],
    'World Generation': [],
    'Combat': [],
    'Characters': [],
    'Inventory': [],
    'Quests': [],
    'Math & Dice': [],
    'Grand Strategy': [],
    'Turn Management': [],
    'Other': []
  };

  for (const tool of tools) {
    const name = tool.name;
    if (name.includes('subscribe') || name.includes('event')) {
      categories['Events'].push(tool);
    } else if (name.includes('world') || name.includes('map') || name.includes('region')) {
      categories['World Generation'].push(tool);
    } else if (name.includes('encounter') || name.includes('combat') || name.includes('advance_turn') && !name.includes('nation')) {
      categories['Combat'].push(tool);
    } else if (name.includes('character')) {
      categories['Characters'].push(tool);
    } else if (name.includes('item') || name.includes('inventory') || name.includes('equip')) {
      categories['Inventory'].push(tool);
    } else if (name.includes('quest') || name.includes('objective')) {
      categories['Quests'].push(tool);
    } else if (name.includes('dice') || name.includes('probability') || name.includes('algebra') || name.includes('physics')) {
      categories['Math & Dice'].push(tool);
    } else if (name.includes('nation') || name.includes('alliance') || name.includes('claim') || name.includes('strategy')) {
      categories['Grand Strategy'].push(tool);
    } else if (name.includes('turn') || name.includes('ready') || name.includes('poll')) {
      categories['Turn Management'].push(tool);
    } else {
      categories['Other'].push(tool);
    }
  }

  // Remove empty categories
  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }

  return categories;
}

// Format tools into readable output
function formatToolsOutput(tools: any[]): string {
  const categories = categorizeTools(tools);
  let output = `## MCP Server Connected ✓\n\n`;
  output += `**Total Tools:** ${tools.length}\n\n`;

  for (const [category, categoryTools] of Object.entries(categories)) {
    output += `### ${category} (${categoryTools.length})\n`;
    for (const tool of categoryTools) {
      output += `- \`${tool.name}\`\n`;
    }
    output += '\n';
  }

  output += `---\n*Server: rpg-mcp | Protocol: MCP v2024-11-05*`;
  return output;
}

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const getMessages = useChatStore((state) => state.getMessages);
  const startStreamingMessage = useChatStore((state) => state.startStreamingMessage);
  const updateStreamingMessage = useChatStore((state) => state.updateStreamingMessage);
  const updateToolStatus = useChatStore((state) => state.updateToolStatus);
  const finalizeStreamingMessage = useChatStore((state) => state.finalizeStreamingMessage);
  
  // HUD Prefill integration
  const prefillInput = useChatStore((state) => state.prefillInput);
  const setPrefillInput = useChatStore((state) => state.setPrefillInput);
  
  // Consume prefill input when set by HUD components
  useEffect(() => {
    if (prefillInput) {
      setInput(prefillInput);
      setPrefillInput(null); // Clear after consuming
    }
  }, [prefillInput, setPrefillInput]);

  // Quick Command Dispatch - consume commands from sidebar buttons
  const pendingCommand = useUIStore((state) => state.pendingCommand);
  const clearPendingCommand = useUIStore((state) => state.clearPendingCommand);
  
  useEffect(() => {
    if (pendingCommand) {
      setInput(pendingCommand);
      clearPendingCommand();
    }
  }, [pendingCommand, clearPendingCommand]);

  // Command Hints Rotation
  const COMMAND_HINTS = [
    "ENTER_COMMAND... (Shift+Enter for new line)",
    "Type /new to start a new campaign",
    "Type /start to resume your last session",
    "Type /help for a list of commands",
    "Type /roll 1d20+5 to roll dice",
    "Type /inventory to check your gear",
    "Describe your action: 'I search the room...'"
  ];

  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    // Only rotate if input is empty
    if (input.trim() !== '') return;

    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % COMMAND_HINTS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [input]);
  
  // Calculate placeholder text
  const placeholderText = isLoading 
    ? "PROCESSING..." 
    : (input.trim() === '' ? COMMAND_HINTS[hintIndex] : "ENTER_COMMAND... (Shift+Enter for new line)");

  // Reusable LLM Submission function
  const submitToLLM = useCallback(async (injectedPrompt?: string) => {
    setIsLoading(true);

    try {
      const { useSettingsStore } = await import('../../stores/settingsStore');
      const { llmService } = await import('../../services/llm/LLMService');

      const systemPrompt = useSettingsStore.getState().systemPrompt;
      const currentMessages = getMessages();

      const history: any[] = currentMessages
        .filter(msg => !msg.partial && (msg.sender === 'user' || msg.sender === 'ai'))
        .flatMap(msg => {
          const messages = [];

          const mainMsg: any = {
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          };

          if (msg.isToolCall) {
            mainMsg.toolCalls = [{
              id: msg.toolCallId || msg.toolName,
              type: 'function',
              function: {
                name: msg.toolName,
                arguments: JSON.stringify(msg.toolArguments)
              }
            }];
          }

          messages.push(mainMsg);

          if (msg.isToolCall && msg.toolResponse) {
            messages.push({
              role: 'tool',
              toolCallId: msg.toolCallId || msg.toolName,
              content: msg.toolResponse
            });
          }

          return messages;
        });

      if (systemPrompt) {
        history.unshift({ role: 'system', content: systemPrompt });
      }

      // Inject dynamic narrative context via backend tool
      try {
        const { useGameStateStore } = await import('../../stores/gameStateStore');
        const { useCombatStore } = await import('../../stores/combatStore');
        
        const gameState = useGameStateStore.getState();
        const combatState = useCombatStore.getState();

        // Only fetch context if we have at least a world or character
        if (gameState.activeWorldId || gameState.activeCharacter) {
            const contextResult = await mcpManager.gameStateClient.callTool('get_narrative_context', {
                worldId: gameState.activeWorldId || 'unknown',
                characterId: gameState.activeCharacter?.id,
                encounterId: combatState.activeEncounterId || undefined,
                maxEvents: 5
            });

            const contextText = contextResult?.content?.[0]?.text;
            if (contextText) {
                history.unshift({ role: 'system', content: contextText });
            }
        }
      } catch (err) {
        console.warn('[ChatInput] Failed to inject narrative context:', err);
      }

      // Inject extra prompt if provided (e.g. for initialization)
      if (injectedPrompt) {
        history.push({ role: 'user', content: injectedPrompt });
      }

      let currentStreamId = Date.now().toString() + '-ai';
      startStreamingMessage(currentStreamId, 'ai');
      let accumulatedContent = '';

      await llmService.streamMessage(
        history,
        {
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            updateStreamingMessage(currentStreamId, accumulatedContent);
          },
          onToolCall: (toolCall: any) => {
            updateStreamingMessage(currentStreamId, undefined, toolCall);
          },
          onToolResult: (_: string, result: any) => {
             updateToolStatus(currentStreamId, 'completed', JSON.stringify(result));
          },
          onStreamStart: () => {
             finalizeStreamingMessage(currentStreamId);
             currentStreamId = Date.now().toString() + '-ai';
             accumulatedContent = '';
             startStreamingMessage(currentStreamId, 'ai');
          },
          onComplete: () => {
            finalizeStreamingMessage(currentStreamId);
            setIsLoading(false);
          },
          onError: (error: string) => {
            addMessage({
              id: Date.now().toString() + '-err',
              sender: 'system',
              content: `Error: ${error}`,
              timestamp: Date.now(),
              type: 'error',
            });
            finalizeStreamingMessage(currentStreamId);
            setIsLoading(false);
          }
        }
      );

    } catch (error: any) {
      addMessage({
        id: Date.now().toString() + '-err',
        sender: 'system',
        content: `LLM Error: ${error.message}`,
        timestamp: Date.now(),
        type: 'error',
      });
      setIsLoading(false);
    }
  }, [addMessage, getMessages, startStreamingMessage, updateStreamingMessage, updateToolStatus, finalizeStreamingMessage]);

  // Integrated Slash Command Handler (can now access submitToLLM)
  const handleSlashCommand = async (command: string, args: string): Promise<CommandResult | null> => {
    const gameState = useGameStateStore.getState();
    const combatState = useCombatStore.getState();
    const uiStore = useUIStore.getState();
  
    switch (command) {
      // === SYSTEM COMMANDS ===
      case 'test': {
        const result = await mcpManager.gameStateClient.listTools();
        const tools = result?.tools || [];
        return { content: formatToolsOutput(tools) };
      }
      
      // === SESSION MANAGEMENT COMMANDS ===
      case 'new': {
        // Launch the Campaign Setup Wizard
        return new Promise((resolve) => {
          uiStore.openCampaignWizard((sessionId, initialPrompt) => {
            // After wizard completes, trigger the LLM with the initial prompt
            setTimeout(() => {
              submitToLLM(initialPrompt);
            }, 100);
            resolve({ content: `🎭 **New Campaign Started!** Session ID: \`${sessionId}\`\n\nGenerating opening scene...` });
          });
        });
      }
      
      case 'start': {
        // Resume last session or launch wizard if no sessions exist
        const sessionStore = (await import('../../stores/sessionStore')).useSessionStore.getState();
        const sessions = sessionStore.sessions;
        
        if (sessions.length > 0) {
          // Resume the most recently played session
          const lastSession = sessions.reduce((a, b) => 
            a.lastPlayedAt > b.lastPlayedAt ? a : b
          );
          await sessionStore.switchSession(lastSession.id);
          return { 
            content: `🎮 **Resuming Campaign:** ${lastSession.name}\n\n📍 ${lastSession.snapshot.locationName}\n👥 ${lastSession.snapshot.partyName} (Lvl ${lastSession.snapshot.level})\n\nType anything to continue your adventure!`
          };
        } else {
          // No sessions exist - launch wizard
          return new Promise((resolve) => {
            uiStore.openCampaignWizard((_sessionId, initialPrompt) => {
              setTimeout(() => {
                submitToLLM(initialPrompt);
              }, 100);
              resolve({ content: `🎭 **New Campaign Created!**\n\nGenerating opening scene...` });
            });
          });
        }
      }
      
      case 'session': {
        uiStore.openSessionManager();
        return { content: `📂 **Session Manager opened.** Select a campaign to switch or manage.` };
      }

      case 'resume': {
        // Trigger "Previously on..." narrative using Seven-Layer Context
        const worldId = gameState.activeWorldId;
        const charId = gameState.activeCharacter?.id;
        
        if (!worldId || !charId) {
          return { content: `⚠️ **No active session to resume.**\n\nUse \`/start\` to begin or resume a campaign.`, type: 'error' };
        }
        
        try {
          const { buildSessionResumePrompt } = await import('../../services/llm/contextBuilder');
          const resumePrompt = await buildSessionResumePrompt(worldId, charId);
          
          if (!resumePrompt) {
            return { content: `📖 **No session history found.** This appears to be a new campaign. Just start playing!` };
          }
          
          // Submit to LLM with the resume prompt
          setTimeout(() => {
            submitToLLM(resumePrompt);
          }, 100);
          
          return { content: `📖 **Generating session recap...**\n\n*The DM is preparing your "Previously on..." summary.*` };
        } catch (error: any) {
          return { content: `Error generating resume: ${error.message}`, type: 'error' };
        }
      }
  
      case 'help': {
        return {
          content: `## Quest Keeper AI Commands:
  
  ### 📂 Sessions & Campaigns
  | Command | Description |
  |---------|-------------|
  | \`/start\` | Resume last session or create new campaign |
  | \`/new\` | Create a new campaign with setup wizard |
  | \`/session\` | Open session manager to switch campaigns |
  | \`/resume\` | Trigger "Previously on..." recap from DM |
  
  ### 📡 System
  | Command | Description |
  |---------|-------------|
  | \`/test\` | Test MCP server connection |
  | \`/status\` | Show current game state summary |
  | \`/sync\` | Force sync all state from server |
  | \`/debug\` | Show debug info (IDs, connection status) |
  | \`/clear\` | Clear chat history |
  
  ### 🎭 Characters
  | Command | Description |
  |---------|-------------|
  | \`/characters\` | List all characters |
  | \`/character [id]\` | Show character details |
  | \`/party\` | Show party summary |
  
  ### 🎒 Inventory & Items
  | Command | Description |
  |---------|-------------|
  | \`/inventory\` | Show current character's inventory |
  | \`/items\` | List all item templates |
  
  ### 📜 Quests
  | Command | Description |
  |---------|-------------|
  | \`/quests\` | Show active quests |
  | \`/questlog\` | Show full quest log |
  
  ### ⚔️ Combat
  | Command | Description |
  |---------|-------------|
  | \`/combat\` | Show current combat state |
  | \`/initiative\` | Show initiative order |
  
  ### 🌍 World
  | Command | Description |
  |---------|-------------|
  | \`/worlds\` | List all worlds |
  | \`/world [id]\` | Show world details |
  
  ### 🎲 Dice & Math
  | Command | Description |
  |---------|-------------|
  | \`/roll <expr>\` | Quick dice roll (e.g., \`/roll 2d6+3\`) |
  | \`/adv <expr>\` | Roll with advantage |
  | \`/dis <expr>\` | Roll with disadvantage |
  
  ### 📊 Skill Checks
  | Command | Description |
  |---------|-------------|
  | \`/perception\` | Perception check (uses active character) |
  | \`/stealth\` | Stealth check |
  | \`/athletics\` | Athletics check (all 18 skills supported) |
  | \`/str\`, \`/dex\`, etc. | Raw ability check |
  | \`/save dex\` | Saving throw (e.g., DEX save) |
  | Add \`adv\` or \`dis\` | Roll with advantage/disadvantage |
  
  ### 🔒 Secret Keeper
  | Command | Description |
  |---------|-------------|
  | \`/secrets\` | Show player-hidden secrets for current world/quest |
  
  ---
  *Type naturally to interact with the AI.*`
        };
      }
  
      case 'status': {
        const activeChar = gameState.activeCharacter;
        const party = gameState.party;
        const inventory = gameState.inventory;
        const encounterId = combatState.activeEncounterId;
        const combatants = combatState.entities;
  
        let status = `## Game Status\n\n`;
  
        // Character
        if (activeChar) {
          status += `### Active Character\n`;
          status += `**${activeChar.name}** - Level ${activeChar.level} ${activeChar.race ? `${activeChar.race} ` : ''}${activeChar.class || ''}\n`;
          status += `HP: ${activeChar.hp?.current || 0}/${activeChar.hp?.max || 0}\n\n`;
        } else {
          status += `### Active Character\n*No character selected*\n\n`;
        }
  
        // Party
        status += `### Party\n`;
        status += party.length > 0 ? `${party.length} member(s)\n\n` : `*No party members*\n\n`;
  
        // Inventory
        status += `### Inventory\n`;
        status += `${inventory.length} item(s)\n\n`;
  
        // Combat
        status += `### Combat\n`;
        if (encounterId) {
          status += `**Active Encounter:** ${encounterId}\n`;
          status += `Combatants: ${combatants.length}\n\n`;
        } else {
          status += `*No active combat*\n\n`;
        }
  
        // Connection
        status += `### MCP Connection\n`;
        status += mcpManager.gameStateClient.isConnected() ? `✓ Connected` : `✗ Disconnected`;
  
        return { content: status };
      }
  
      case 'sync': {
        try {
          await gameState.syncState();
          await combatState.syncCombatState();
          return { content: `✓ State synchronized successfully`, type: 'success' };
        } catch (error: any) {
          return { content: `✗ Sync failed: ${error.message}`, type: 'error' };
        }
      }
  
      case 'debug': {
        const activeChar = gameState.activeCharacter;
        const encounterId = combatState.activeEncounterId;
  
        let debug = `## Debug Info\n\n`;
        debug += `### IDs\n`;
        debug += `- Active Character ID: \`${activeChar?.id || 'none'}\`\n`;
        debug += `- Active Encounter ID: \`${encounterId || 'none'}\`\n\n`;
  
        debug += `### MCP Status\n`;
        debug += `- Game State Client: ${mcpManager.gameStateClient.isConnected() ? '✓ Connected' : '✗ Disconnected'}\n`;
        debug += `- Combat Client: ${mcpManager.combatClient.isConnected() ? '✓ Connected' : '✗ Disconnected'}\n\n`;
  
        debug += `### Store Sizes\n`;
        debug += `- Party: ${gameState.party.length}\n`;
        debug += `- Inventory: ${gameState.inventory.length}\n`;
        debug += `- Notes: ${gameState.notes.length}\n`;
        debug += `- Combatants: ${combatState.entities.length}\n`;
        debug += `- Terrain: ${combatState.terrain.length}\n`;
  
        return { content: debug };
      }
  
      case 'clear': {
        useChatStore.getState().clearHistory();
        return { content: `✓ Chat cleared`, type: 'success' };
      }
  
      // === CHARACTER COMMANDS ===
      case 'characters': {
        try {
          const result = await mcpManager.gameStateClient.callTool('list_characters', {});
          const text = result?.content?.[0]?.text || '[]';
          
          let chars;
          try {
            chars = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!Array.isArray(chars) || chars.length === 0) {
            return { content: `*No characters found*\n\nUse the AI to create a character: "Create a fighter named Valeros"` };
          }
  
          let output = `## Characters (${chars.length})\n\n`;
          for (const char of chars) {
            output += `### ${char.name}\n`;
            output += `- **ID:** \`${char.id}\`\n`;
            output += `- **Level:** ${char.level || 1}\n`;
            output += `- **HP:** ${char.hp || 0}/${char.maxHp || 0}\n`;
            output += `- **AC:** ${char.ac || 10}\n\n`;
          }
          return { content: output };
        } catch (error: any) {
          return { content: `Error listing characters: ${error.message}`, type: 'error' };
        }
      }
  
      case 'character': {
        try {
          const charId = args.trim() || gameState.activeCharacter?.id;
          if (!charId) {
            return { content: `No character ID provided and no active character.\n\nUsage: \`/character <id>\` or set an active character first.`, type: 'error' };
          }
  
          const result = await mcpManager.gameStateClient.callTool('get_character', { id: charId });
          const text = result?.content?.[0]?.text || 'null';
          
          let char;
          try {
            char = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!char) {
            return { content: `Character not found: ${charId}`, type: 'error' };
          }
  
          let output = `## ${char.name}\n\n`;
          output += `**ID:** \`${char.id}\`\n`;
          output += `**Race:** ${char.race || 'Unknown'}\n`;
          output += `**Class:** ${char.class || char.characterClass || 'Adventurer'}\n`;
          output += `**Level:** ${char.level || 1}\n`;
          output += `**HP:** ${char.hp || 0}/${char.maxHp || 0}\n`;
          output += `**AC:** ${char.ac || 10}\n\n`;
  
          if (char.stats) {
            output += `### Ability Scores\n`;
            output += `| STR | DEX | CON | INT | WIS | CHA |\n`;
            output += `|-----|-----|-----|-----|-----|-----|\n`;
            output += `| ${char.stats.str || 10} | ${char.stats.dex || 10} | ${char.stats.con || 10} | ${char.stats.int || 10} | ${char.stats.wis || 10} | ${char.stats.cha || 10} |\n`;
          }
  
          if (char.inventory && char.inventory.length > 0) {
            output += `\n### Inventory\n`;
            for (const item of char.inventory) {
              output += `- ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}${item.equipped ? ' [E]' : ''}\n`;
            }
          }
  
          if (char.conditions && char.conditions.length > 0) {
            output += `\n### Conditions\n`;
            for (const cond of char.conditions) {
              output += `- ${cond}\n`;
            }
          }
  
          return { content: output };
        } catch (error: any) {
          return { content: `Error getting character: ${error.message}`, type: 'error' };
        }
      }
  
      case 'party': {
        // Use partyStore for accurate party membership data
        try {
          const { usePartyStore } = await import('../../stores/partyStore');
          const partyState = usePartyStore.getState();
          const activeParty = partyState.getActiveParty();
          
          if (!activeParty || activeParty.members.length === 0) {
            return { content: `*No party members*\n\nCreate characters using the AI.` };
          }
  
          let output = `## ${activeParty.name} (${activeParty.members.length} members)\n\n`;
          for (const member of activeParty.members) {
            const char = member.character;
            const isActive = member.characterId === gameState.activeCharacter?.id;
            const roleIcon = member.role === 'leader' ? '★ ' : member.isActive ? '▶ ' : '';
            output += `### ${roleIcon}${char.name} ${isActive ? '(Active)' : ''}\n`;
            output += `**${char.race || 'Unknown'}** ${char.class || 'Adventurer'}, Level ${char.level || 1}\n`;
            output += `HP: ${char.hp || 0}/${char.maxHp || 0} | AC: ${char.ac || 10}\n\n`;
          }
          return { content: output };
        } catch (error: any) {
          // Fallback to gameState.party if partyStore fails
          const party = gameState.party;
          if (party.length === 0) {
            return { content: `*No party members*\n\nCreate characters using the AI.` };
          }
  
          let output = `## Party (${party.length})\n\n`;
          for (const member of party) {
            const isActive = member.id === gameState.activeCharacter?.id;
            output += `### ${member.name} ${isActive ? '(Active)' : ''}\n`;
            output += `**${member.race || 'Unknown'}** ${member.class || 'Adventurer'}, Level ${member.level || 1}\n`;
            output += `HP: ${member.hp?.current || 0}/${member.hp?.max || 0}\n\n`;
          }
          return { content: output };
        }
      }
  
      case 'inventory': {
        try {
          const charId = gameState.activeCharacter?.id;
          if (!charId) {
            return { content: `No active character. Select a character first.`, type: 'error' };
          }
  
          // Use get_inventory_detailed for full item names
          const result = await mcpManager.gameStateClient.callTool('get_inventory_detailed', { characterId: charId });
          const text = result?.content?.[0]?.text || '{}';
          
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          // Backend returns {items: [{item: {...}, quantity, equipped}, ...], equipment: {...}, totalWeight, capacity}
          const items = data.items || [];
          
          if (!Array.isArray(items) || items.length === 0) {
            return { content: `*Inventory is empty*` };
          }
  
          let output = `## 🎒 Inventory (${items.length} items)\n`;
          output += `**Weight:** ${data.totalWeight?.toFixed(1) || 0} / ${data.capacity || 100} lbs\n\n`;
          output += `| Item | Type | Qty | Weight | Equipped |\n`;
          output += `|------|------|-----|--------|----------|\n`;
          for (const entry of items) {
            const item = entry.item || entry;
            const name = item.name || entry.itemId || 'Unknown';
            const type = item.type || '-';
            const qty = entry.quantity || 1;
            const weight = item.weight ? `${(item.weight * qty).toFixed(1)}` : '-';
            const equipped = entry.equipped ? '✓' : '-';
            output += `| ${name} | ${type} | ${qty} | ${weight} | ${equipped} |\n`;
          }
          return { content: output };
        } catch (error: any) {
          return { content: `Error getting inventory: ${error.message}`, type: 'error' };
        }
      }
  
      case 'items': {
        return { content: `Item templates are created with the \`create_item_template\` tool.\n\nAsk the AI: "Create a longsword item template"` };
      }
  
      case 'quests':
      case 'questlog': {
        try {
          const charId = gameState.activeCharacter?.id;
          if (!charId) {
            return { content: `No active character. Select a character first.`, type: 'error' };
          }
  
          const result = await mcpManager.gameStateClient.callTool('get_quest_log', { characterId: charId });
          const text = result?.content?.[0]?.text || '[]';
          
          let quests;
          try {
            quests = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!Array.isArray(quests) || quests.length === 0) {
            return { content: `*No active quests*\n\nAsk the AI to create a quest.` };
          }
  
          let output = `## Quest Log (${quests.length})\n\n`;
          for (const quest of quests) {
            output += `### ${quest.name}\n`;
            output += `**Status:** ${quest.status || 'active'}\n`;
            output += `${quest.description || ''}\n\n`;
  
            if (quest.objectives && quest.objectives.length > 0) {
              output += `**Objectives:**\n`;
              for (const obj of quest.objectives) {
                const done = obj.completed ? '✓' : '○';
                output += `- ${done} ${obj.description} (${obj.current || 0}/${obj.required})\n`;
              }
              output += '\n';
            }
          }
          return { content: output };
        } catch (error: any) {
          return { content: `Error getting quests: ${error.message}`, type: 'error' };
        }
      }
  
      case 'combat': {
        const encounterId = combatState.activeEncounterId;
        if (!encounterId) {
          return { content: `*No active combat*\n\nStart combat by asking the AI: "Start combat with 2 goblins"` };
        }
  
        try {
          const result = await mcpManager.gameStateClient.callTool('get_encounter_state', { encounterId });
          const text = result?.content?.[0]?.text || 'null';
          
          let encounter;
          try {
            encounter = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!encounter) {
            return { content: `Could not retrieve encounter state`, type: 'error' };
          }
  
          let output = `## Combat - Round ${encounter.round || 1}\n\n`;
          output += `**Encounter ID:** \`${encounterId}\`\n\n`;
  
          output += `### Initiative Order\n`;
          output += `| # | Name | HP | Conditions |\n`;
          output += `|---|------|----|-----------|\n`;
  
          const participants = encounter.participants || [];
          for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            const isCurrent = i === encounter.currentTurn;
            const marker = isCurrent ? '→' : (i + 1).toString();
            output += `| ${marker} | ${p.name} | ${p.hp}/${p.maxHp} | ${(p.conditions || []).join(', ') || '-'} |\n`;
          }
  
          return { content: output };
        } catch (error: any) {
          return { content: `Error getting combat state: ${error.message}`, type: 'error' };
        }
      }
  
      case 'initiative': {
        const combatants = combatState.entities;
        if (combatants.length === 0) {
          return { content: `*No combatants*` };
        }
  
        let output = `## Initiative Order\n\n`;
        const turnOrder = combatState.turnOrder || [];
        if (turnOrder.length > 0) {
          for (let i = 0; i < turnOrder.length; i++) {
            const name = turnOrder[i];
            const entity = combatants.find(c => c.name === name);
            const hp = entity?.metadata?.hp;
            output += `${i + 1}. **${name}** - ${hp?.current || 0}/${hp?.max || 0} HP\n`;
          }
        } else {
          for (let i = 0; i < combatants.length; i++) {
            const c = combatants[i];
            output += `${i + 1}. **${c.name}** - ${c.metadata?.hp?.current || 0}/${c.metadata?.hp?.max || 0} HP\n`;
          }
        }
        return { content: output };
      }
  
      case 'worlds': {
        try {
          const result = await mcpManager.gameStateClient.callTool('list_worlds', {});
          const text = result?.content?.[0]?.text || '[]';
          
          let worlds;
          try {
            worlds = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!Array.isArray(worlds) || worlds.length === 0) {
            return { content: `*No worlds created*\n\nAsk the AI: "Create a new world called Eldoria"` };
          }
  
          let output = `## Worlds (${worlds.length})\n\n`;
          for (const world of worlds) {
            output += `### ${world.name}\n`;
            output += `- **ID:** \`${world.id}\`\n`;
            output += `- **Size:** ${world.width}x${world.height}\n`;
            output += `- **Seed:** ${world.seed}\n\n`;
          }
          return { content: output };
        } catch (error: any) {
          return { content: `Error listing worlds: ${error.message}`, type: 'error' };
        }
      }
  
      case 'world': {
        const worldId = args.trim();
        if (!worldId) {
          return { content: `Usage: \`/world <id>\`\n\nUse \`/worlds\` to list available worlds.`, type: 'error' };
        }
  
        try {
          const result = await mcpManager.gameStateClient.callTool('get_world', { id: worldId });
          const text = result?.content?.[0]?.text || 'null';
          
          let world;
          try {
            world = JSON.parse(text);
          } catch {
            return { content: text };
          }
  
          if (!world) {
            return { content: `World not found: ${worldId}`, type: 'error' };
          }
  
          let output = `## ${world.name}\n\n`;
          output += `**ID:** \`${world.id}\`\n`;
          output += `**Size:** ${world.width}x${world.height}\n`;
          output += `**Seed:** ${world.seed}\n`;
  
          return { content: output };
        } catch (error: any) {
          return { content: `Error getting world: ${error.message}`, type: 'error' };
        }
      }
  
      case 'roll':
      case 'adv':
      case 'dis': {
        if (!args.trim()) {
           // Basic usage return
           return { content: `Usage: \`/${command} <expression>\``, type: 'error' };
        }
        try {
          // Parse dice expression
          let expression = args.trim();
          if (command === 'adv') expression = expression.replace(/(\d*)d20/i, '2d20kh1');
          if (command === 'dis') expression = expression.replace(/(\d*)d20/i, '2d20kl1');
  
          const result = await mcpManager.gameStateClient.callTool('dice_roll', { 
            expression,
            exportFormat: 'steps'
          });
          const text = result?.content?.[0]?.text || '';
          
          let output = `## 🎲 ${args.trim()} ${command !== 'roll' ? `(${command})` : ''}\n\n`;
          output += '```\n' + text + '\n```';
          return { content: output };
        } catch (error: any) {
          return { content: `Dice roll error: ${error.message}`, type: 'error' };
        }
      }
  
      case 'secrets': {
        try {
          const worldId = gameState.activeWorldId;
          if (!worldId) return { content: `No active world. Select a world first.`, type: 'error' };
  
          const result = await mcpManager.gameStateClient.callTool('get_secrets_for_context', { worldId });
          const text = result?.content?.[0]?.text || '{}';
          
          let secrets;
          try { secrets = JSON.parse(text); } catch { return { content: text }; }
  
          if (!secrets || Object.keys(secrets).length === 0) {
            return { content: `*No secrets stored for this world*` };
          }
  
          return { content: `## 🔒 Secrets\n\n${JSON.stringify(secrets, null, 2)}` };
        } catch (error: any) {
          return { content: `Error: ${error.message}`, type: 'error' };
        }
      }
  
      case 'tab': {
        const validTabs: ActiveTab[] = ['adventure', 'combat', 'character', 'map', 'journal', 'settings'];
        const tab = args.trim().toLowerCase() as ActiveTab;
        if (!validTabs.includes(tab)) return { content: `Valid tabs: ${validTabs.join(', ')}`, type: 'error' };
        uiStore.setActiveTab(tab);
        return { content: `Switched to **${tab}** tab`, type: 'success' };
      }
  
      // === SKILL CHECK COMMANDS ===
      case 'perception':
      case 'stealth':
      case 'athletics':
      case 'acrobatics':
      case 'arcana':
      case 'history':
      case 'investigation':
      case 'nature':
      case 'religion':
      case 'insight':
      case 'medicine':
      case 'survival':
      case 'deception':
      case 'intimidation':
      case 'performance':
      case 'persuasion':
      case 'animal_handling':
      case 'sleight_of_hand': {
        const charId = gameState.activeCharacter?.id;
        if (!charId) return { content: `No active character. Select a character first.`, type: 'error' };
        
        // Parse optional advantage/disadvantage from args
        const argLower = args.trim().toLowerCase();
        const advantage = argLower.includes('adv') || argLower.includes('advantage');
        const disadvantage = argLower.includes('dis') || argLower.includes('disadvantage');
        
        try {
          const result = await mcpManager.gameStateClient.callTool('roll_skill_check', { 
            characterId: charId,
            skill: command.replace('-', '_'), // Convert kebab-case to snake_case
            advantage,
            disadvantage
          });
          const text = result?.content?.[0]?.text || '{}';
          const data = JSON.parse(text);
          
          const skillName = command.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          let output = `## 🎲 ${skillName} Check\n\n`;
          output += `**${data.character}** rolls: **${data.roll}**\n\n`;
          output += `| d20 | ${data.breakdown?.abilityMod >= 0 ? '+' : ''}${data.breakdown?.abilityMod || 0} | Prof ${data.breakdown?.proficiencyBonus || 0} | = **${data.roll}** |\n`;
          output += `|-----|-----|------|-------|\n\n`;
          if (data.proficient) output += `✓ Proficient${data.expertise ? ' (Expertise x2)' : ''}\n`;
          if (advantage) output += `⬆️ Advantage\n`;
          if (disadvantage) output += `⬇️ Disadvantage\n`;
          
          return { content: output };
        } catch (error: any) {
          return { content: `Skill check error: ${error.message}`, type: 'error' };
        }
      }

      // Ability check shortcuts
      case 'str':
      case 'dex':
      case 'con':
      case 'int':
      case 'wis':
      case 'cha': {
        const charId = gameState.activeCharacter?.id;
        if (!charId) return { content: `No active character. Select a character first.`, type: 'error' };
        
        const argLower = args.trim().toLowerCase();
        const advantage = argLower.includes('adv');
        const disadvantage = argLower.includes('dis');
        
        try {
          const result = await mcpManager.gameStateClient.callTool('roll_ability_check', { 
            characterId: charId,
            ability: command,
            advantage,
            disadvantage
          });
          const text = result?.content?.[0]?.text || '{}';
          const data = JSON.parse(text);
          
          let output = `## 🎲 ${command.toUpperCase()} Check\n\n`;
          output += `**${data.character}** rolls: **${data.roll}**\n`;
          
          return { content: output };
        } catch (error: any) {
          return { content: `Ability check error: ${error.message}`, type: 'error' };
        }
      }

      // Saving throw command
      case 'save': {
        const charId = gameState.activeCharacter?.id;
        if (!charId) return { content: `No active character. Select a character first.`, type: 'error' };
        
        const parts = args.trim().toLowerCase().split(/\s+/);
        const ability = parts[0];
        if (!['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(ability)) {
          return { content: `Usage: \`/save <ability>\` (e.g., \`/save dex\`)`, type: 'error' };
        }
        
        const advantage = parts.includes('adv');
        const disadvantage = parts.includes('dis');
        
        try {
          const result = await mcpManager.gameStateClient.callTool('roll_saving_throw', { 
            characterId: charId,
            ability,
            advantage,
            disadvantage
          });
          const text = result?.content?.[0]?.text || '{}';
          const data = JSON.parse(text);
          
          let output = `## 🛡️ ${ability.toUpperCase()} Saving Throw\n\n`;
          output += `**${data.character}** rolls: **${data.roll}**\n`;
          if (data.proficient) output += `\n✓ Save Proficiency`;
          
          return { content: output };
        } catch (error: any) {
          return { content: `Saving throw error: ${error.message}`, type: 'error' };
        }
      }

      // Rest commands - open Rest Panel
      case 'rest':
      case 'camp': {
        (await import('../../stores/hudStore')).useHudStore.getState().toggleRestPanel();
        return { content: `⛺ **Rest Menu opened.** Choose Short Rest or Long Rest.` };
      }

      case 'shortrest': {
        const charId = gameState.activeCharacter?.id;
        if (!charId) return { content: `No active character.`, type: 'error' };
        try {
          const result = await mcpManager.gameStateClient.callTool('take_short_rest', { 
            characterId: charId, 
            hitDiceToSpend: 1 
          });
          const text = result?.content?.[0]?.text || '{}';
          const data = JSON.parse(text);
          await gameState.syncState();
          return { content: `⛺ **${data.character}** takes a short rest. HP: ${data.previousHp} → ${data.newHp} (+${data.hpRestored})` };
        } catch (error: any) {
          return { content: `Rest failed: ${error.message}`, type: 'error' };
        }
      }

      case 'longrest': {
        const charId = gameState.activeCharacter?.id;
        if (!charId) return { content: `No active character.`, type: 'error' };
        try {
          const result = await mcpManager.gameStateClient.callTool('take_long_rest', { 
            characterId: charId 
          });
          const text = result?.content?.[0]?.text || '{}';
          const data = JSON.parse(text);
          await gameState.syncState();
          let msg = `🌙 **${data.character}** takes a long rest. HP: ${data.previousHp} → ${data.newHp} (Full)`;
          if (data.spellSlotsRestored) msg += `\n**Spell Slots:** Restored`;
          return { content: msg };
        } catch (error: any) {
          return { content: `Rest failed: ${error.message}`, type: 'error' };
        }
      }

      // Loot commands
      case 'loot':
      case 'corpses': {
        (await import('../../stores/hudStore')).useHudStore.getState().toggleLootPanel();
        return { content: `💀 **Loot Panel opened.** Click a corpse to view its inventory.` };
      }

      default:
        return null; // Not a recognized command
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    addMessage({
      id: Date.now().toString(),
      sender: 'user',
      content: currentInput,
      timestamp: Date.now(),
      type: 'text',
    });

    if (currentInput.startsWith('/')) {
      const spaceIndex = currentInput.indexOf(' ');
      const command = spaceIndex === -1 
        ? currentInput.slice(1).toLowerCase() 
        : currentInput.slice(1, spaceIndex).toLowerCase();
      const args = spaceIndex === -1 ? '' : currentInput.slice(spaceIndex + 1);

      try {
        const result = await handleSlashCommand(command, args);

        if (result) {
          addMessage({
            id: Date.now().toString() + '-ai',
            sender: result.type === 'error' ? 'system' : 'ai',
            content: result.content,
            timestamp: Date.now(),
            type: result.type || 'text',
          });
        } else {
          addMessage({
            id: Date.now().toString() + '-err',
            sender: 'system',
            content: `Unknown command: \`/${command}\``,
            timestamp: Date.now(),
            type: 'error',
          });
        }
      } catch (error: any) {
        addMessage({
          id: Date.now().toString() + '-err',
          sender: 'system',
          content: `Command error: ${error.message}`,
          timestamp: Date.now(),
          type: 'error',
        });
      }

      setIsLoading(false);
      return;
    }

    // Standard LLM submission
    await submitToLLM();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-terminal-green-dim bg-terminal-black">
      <div className="flex gap-2 items-end">
        <div className="flex-grow flex items-start bg-terminal-black border border-terminal-green-dim p-2">
          <span className="text-terminal-green mr-2 font-bold mt-1">{'>'}</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits, Shift+Enter adds newline
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            disabled={isLoading}
            placeholder={placeholderText}
            className="flex-grow bg-transparent focus:outline-none text-terminal-green placeholder-terminal-green/30 font-mono disabled:opacity-50 resize-none min-h-[24px] max-h-[200px]"
            rows={1}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              // Auto-resize textarea
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-all duration-200 uppercase tracking-wider font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : 'Execute'}
        </button>
      </div>
    </form>
  );
};
