import { useSettingsStore } from '../../stores/settingsStore';
import { mcpManager } from '../mcpClient';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { ChatMessage, LLMProviderInterface, LLMResponse } from './types';
import { parseMcpResponse, executeBatchToolCalls, BatchToolCall } from '../../utils/mcpUtils';

// Combat tools from rpg-mcp that should trigger combat state sync
const COMBAT_TOOLS = new Set([
    // rpg-mcp combat tools
    'create_encounter',
    'get_encounter_state', 
    'execute_combat_action',
    'advance_turn',
    'end_encounter',
    'load_encounter',
    // Legacy tool names (for backward compatibility)
    'place_creature', 
    'move_creature', 
    'initialize_battlefield', 
    'batch_place_creatures', 
    'batch_move_creatures'
]);

// Game state tools that should trigger game state sync
const GAME_STATE_TOOLS = new Set([
    'create_character',
    'update_character',
    'delete_character',
    'give_item',
    'remove_item',
    'equip_item',
    'unequip_item',
    'assign_quest',
    'complete_quest',
    'update_objective'
]);

class LLMService {
    private providers: Record<string, LLMProviderInterface>;
    private toolCache: any[] | null = null;
    private toolCacheTime: number = 0;
    private readonly TOOL_CACHE_TTL = 60000; // 1 minute cache

    constructor() {
        this.providers = {
            openai: new OpenAIProvider('openai'),
            openrouter: new OpenAIProvider('openrouter'),
            anthropic: new AnthropicProvider(),
            gemini: new GeminiProvider(),
        };
    }

    private getProvider(): LLMProviderInterface {
        const { selectedProvider } = useSettingsStore.getState();
        const provider = this.providers[selectedProvider];
        if (!provider) {
            throw new Error(`Provider ${selectedProvider} not implemented`);
        }
        return provider;
    }

    private getApiKey(): string {
        const { apiKeys, selectedProvider } = useSettingsStore.getState();
        const key = apiKeys[selectedProvider];
        if (!key) {
            throw new Error(`API Key for ${selectedProvider} is missing. Please configure it in settings.`);
        }
        return key;
    }

    /**
     * Get tools with caching to avoid repeated list_tools calls
     */
    private async getTools(): Promise<any[]> {
        const now = Date.now();
        
        if (this.toolCache && (now - this.toolCacheTime) < this.TOOL_CACHE_TTL) {
            return this.toolCache;
        }

        try {
            const response = await mcpManager.gameStateClient.listTools();
            this.toolCache = response.tools || [];
            this.toolCacheTime = now;
            return this.toolCache;
        } catch (e) {
            console.warn('[LLMService] Failed to fetch tools:', e);
            return this.toolCache || [];
        }
    }

    /**
     * Execute multiple tool calls in parallel
     */
    private async executeToolCallsBatch(toolCalls: any[]): Promise<Map<string, any>> {
        const results = new Map<string, any>();
        
        const batchCalls: BatchToolCall[] = toolCalls.map(tc => ({
            name: tc.name,
            args: tc.arguments
        }));

        const batchResults = await executeBatchToolCalls(mcpManager.gameStateClient, batchCalls);

        toolCalls.forEach((tc, index) => {
            const result = batchResults[index];
            if (result.error) {
                results.set(tc.id, { error: result.error });
            } else {
                results.set(tc.id, result.result);
            }
        });

        return results;
    }

    /**
     * Handle post-tool-call state synchronization (batched)
     */
    private async handleBatchToolSync(toolNames: string[]): Promise<void> {
        const needsCombatSync = toolNames.some(name => COMBAT_TOOLS.has(name));
        const needsGameStateSync = toolNames.some(name => GAME_STATE_TOOLS.has(name));

        // Execute syncs in parallel
        const syncPromises: Promise<void>[] = [];

        if (needsCombatSync) {
            console.log('[LLMService] Combat tools used - syncing 3D combat state');
            syncPromises.push(
                import('../../stores/combatStore')
                    .then(({ useCombatStore }) => useCombatStore.getState().syncCombatState())
                    .catch(e => console.warn('[LLMService] Combat sync failed:', e))
            );
        }
        
        if (needsGameStateSync) {
            console.log('[LLMService] Game state tools used - syncing game state');
            syncPromises.push(
                import('../../stores/gameStateStore')
                    .then(({ useGameStateStore }) => useGameStateStore.getState().syncState())
                    .catch(e => console.warn('[LLMService] Game state sync failed:', e))
            );
        }

        await Promise.all(syncPromises);
    }

    /**
     * Parse tool result and extract important data (like encounter IDs)
     */
    private async parseToolResult(toolName: string, result: any): Promise<void> {
        if (toolName === 'create_encounter') {
            try {
                const { useCombatStore } = await import('../../stores/combatStore');
                const data = parseMcpResponse<any>(result, null);
                
                if (data?.encounterId) {
                    console.log(`[LLMService] Setting active encounter ID: ${data.encounterId}`);
                    useCombatStore.getState().setActiveEncounterId(data.encounterId);
                }
            } catch (e) {
                console.warn('[LLMService] Failed to parse create_encounter result:', e);
            }
        }
        
        if (toolName === 'end_encounter') {
            try {
                const { useCombatStore } = await import('../../stores/combatStore');
                console.log('[LLMService] Clearing combat state after end_encounter');
                useCombatStore.getState().clearCombat();
            } catch (e) {
                console.warn('[LLMService] Failed to clear combat state:', e);
            }
        }
    }

    public async sendMessage(history: ChatMessage[]): Promise<string> {
        const provider = this.getProvider();
        const apiKey = this.getApiKey();
        const model = useSettingsStore.getState().getSelectedModel();

        console.log(`[LLMService] Provider: ${provider.provider}, Model: ${model}`);

        // Get tools (cached)
        let allTools = await this.getTools();

        // Free OpenRouter models don't support tools
        if (provider.provider === 'openrouter' && model.includes(':free')) {
            console.log('[LLMService] Free model - skipping tools');
            allTools = [];
        }

        console.log(`[LLMService] ${allTools.length} tools available`);

        let currentHistory = [...history];
        let finalContent = '';

        // Max 5 turns to prevent infinite loops
        for (let turn = 0; turn < 5; turn++) {
            console.log(`[LLMService] Turn ${turn + 1}`);
            const response: LLMResponse = await provider.sendMessage(currentHistory, apiKey, model, allTools);

            if (response.content) {
                finalContent = response.content;
            }

            if (!response.toolCalls || response.toolCalls.length === 0) {
                break;
            }

            // Add assistant's message with tool calls
            currentHistory.push({
                role: 'assistant',
                content: response.content || '',
                toolCalls: response.toolCalls
            } as any);

            // Execute ALL tool calls in parallel
            console.log(`[LLMService] Executing ${response.toolCalls.length} tool calls in parallel`);
            const results = await this.executeToolCallsBatch(response.toolCalls);

            // Process results and parse important data
            for (const toolCall of response.toolCalls) {
                const result = results.get(toolCall.id);
                await this.parseToolResult(toolCall.name, result);
                
                currentHistory.push({
                    role: 'tool',
                    content: JSON.stringify(result),
                    toolCallId: toolCall.id
                } as any);
            }

            // Sync state after ALL tools complete (batched)
            const toolNames = response.toolCalls.map(tc => tc.name);
            await this.handleBatchToolSync(toolNames);
        }

        return finalContent;
    }

    // Streaming method
    public async streamMessage(
        history: ChatMessage[],
        callbacks: {
            onChunk: (content: string) => void;
            onToolCall: (toolCall: any) => void;
            onToolResult: (toolName: string, result: any) => void;
            onStreamStart: () => void;
            onComplete: () => void;
            onError: (error: string) => void;
        }
    ): Promise<void> {
        try {
            const provider = this.getProvider();
            const apiKey = this.getApiKey();
            const model = useSettingsStore.getState().getSelectedModel();

            console.log(`[LLMService] Streaming - Provider: ${provider.provider}, Model: ${model}`);

            // Get tools (cached)
            let allTools = await this.getTools();

            if (provider.provider === 'openrouter' && model.includes(':free')) {
                console.log('[LLMService] Free model - skipping tools');
                allTools = [];
            }

            await (provider as any).streamMessage(
                history,
                apiKey,
                model,
                allTools,
                callbacks.onChunk,
                // Handle ALL tool calls as a batch
                async (toolCalls: any[]) => {
                    console.log(`[LLMService] Received ${toolCalls.length} tool call(s)`);
                    
                    // Notify UI about each tool call
                    for (const toolCall of toolCalls) {
                        callbacks.onToolCall(toolCall);
                    }

                    // Execute ALL tool calls in parallel
                    const results = await this.executeToolCallsBatch(toolCalls);

                    // Process results
                    const toolResults: { toolCall: any; result: any }[] = [];
                    
                    for (const toolCall of toolCalls) {
                        const result = results.get(toolCall.id);
                        
                        console.log(`[LLMService] Tool result for ${toolCall.name}:`, result);
                        callbacks.onToolResult(toolCall.name, result);

                        await this.parseToolResult(toolCall.name, result);
                        toolResults.push({ toolCall, result });
                    }

                    // Sync state ONCE after all tools complete
                    const toolNames = toolCalls.map(tc => tc.name);
                    await this.handleBatchToolSync(toolNames);

                    // Build history with ALL tool calls and results
                    const newHistory = [...history];
                    
                    // Add assistant's message with ALL tool calls
                    newHistory.push({
                        role: 'assistant',
                        content: '',
                        toolCalls: toolResults.map(({ toolCall }) => ({
                            id: toolCall.id,
                            type: 'function',
                            function: {
                                name: toolCall.name,
                                arguments: JSON.stringify(toolCall.arguments)
                            }
                        }))
                    } as any);

                    // Add ALL tool results
                    for (const { toolCall, result } of toolResults) {
                        newHistory.push({
                            role: 'tool',
                            content: JSON.stringify(result),
                            toolCallId: toolCall.id
                        } as any);
                    }

                    callbacks.onStreamStart();
                    
                    // Single recursive call with all results
                    await this.streamMessage(newHistory, callbacks);
                },
                callbacks.onComplete,
                callbacks.onError
            );

        } catch (error: any) {
            console.error('[LLMService] Streaming error:', error);
            callbacks.onError(error.message || 'Streaming failed');
        }
    }
}

export const llmService = new LLMService();
