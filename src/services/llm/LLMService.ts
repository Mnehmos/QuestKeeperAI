import { useSettingsStore } from '../../stores/settingsStore';
import { mcpManager } from '../mcpClient';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { ChatMessage, LLMProviderInterface, LLMResponse } from './types';

class LLMService {
    private providers: Record<string, LLMProviderInterface>;

    constructor() {
        this.providers = {
            openai: new OpenAIProvider('openai'),
            openrouter: new OpenAIProvider('openrouter'), // OpenRouter uses OpenAI interface
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

    public async sendMessage(history: ChatMessage[]): Promise<string> {
        const provider = this.getProvider();
        const apiKey = this.getApiKey();
        const model = useSettingsStore.getState().getSelectedModel();

        console.log(`[LLMService] Selected Provider: ${provider.provider}`);
        console.log(`[LLMService] Selected Model: ${model}`);
        console.log(`[LLMService] API Key present: ${!!apiKey}`);

        // 1. Fetch available tools from MCP
        // We need to aggregate tools from all connected clients
        const gameStateTools = await mcpManager.gameStateClient.listTools().catch(() => ({ tools: [] }));
        const combatTools = await mcpManager.combatClient.listTools().catch(() => ({ tools: [] }));

        let allTools = [
            ...(gameStateTools.tools || []),
            ...(combatTools.tools || []),
        ];

        // IMPORTANT: Free OpenRouter models don't support tools, so don't send them
        if (provider.provider === 'openrouter' && model.includes(':free')) {
            console.log(`[LLMService] Free model detected, skipping tools`);
            allTools = [];
        }

        // 2. Send message to LLM with tools
        // We might need a loop here to handle multiple tool calls in sequence
        let currentHistory = [...history];
        let finalContent = '';

        // Max turns to prevent infinite loops
        for (let i = 0; i < 5; i++) {
            console.log(`[LLMService] Turn ${i + 1}, sending to ${provider.provider}...`);
            const response: LLMResponse = await provider.sendMessage(currentHistory, apiKey, model, allTools);

            // If there's content, append it
            if (response.content) {
                finalContent = response.content; // In a real chat, we might want to stream or accumulate
            }

            // If no tool calls, we're done
            if (!response.toolCalls || response.toolCalls.length === 0) {
                break;
            }

            // Add assistant's message with tool calls to history
            currentHistory.push({
                role: 'assistant',
                content: response.content || '', // Content might be null if only tool calls
                toolCalls: response.toolCalls
            } as any);

            // 3. Execute tool calls
            for (const toolCall of response.toolCalls) {
                console.log(`[LLMService] Executing tool: ${toolCall.name}`, toolCall.arguments);

                let result;
                try {
                    // Try to find which client has this tool
                    // This is a bit inefficient, ideally we map tools to clients beforehand
                    const isGameStateTool = gameStateTools.tools?.some((t: any) => t.name === toolCall.name);

                    if (isGameStateTool) {
                        result = await mcpManager.gameStateClient.callTool(toolCall.name, toolCall.arguments);
                    } else {
                        result = await mcpManager.combatClient.callTool(toolCall.name, toolCall.arguments);
                    }
                } catch (error: any) {
                    result = { error: error.message };
                }

                console.log(`[LLMService] Tool result:`, result);

                // Auto-sync combat state if combat tool was used
                const combatToolsList = ['place_creature', 'move_creature', 'initialize_battlefield', 'batch_place_creatures', 'batch_move_creatures'];
                if (combatToolsList.includes(toolCall.name)) {
                    console.log(`[LLMService] Combat tool used - syncing 3D combat state`);
                    try {
                        const { useCombatStore } = await import('../../stores/combatStore');
                        await useCombatStore.getState().syncCombatState();
                    } catch (e) {
                        console.warn('[LLMService] Failed to sync combat state:', e);
                    }
                }

                // Add tool result to history
                currentHistory.push({
                    role: 'tool', // In OpenAI API, this should be 'tool' role, but for generic interface we might need to adapt
                    content: JSON.stringify(result),
                    toolCallId: (toolCall as any).id // Assuming ID is present or we need to mock it? 
                                                     // OpenAIProvider adds it.
                } as any);
            }
        }

        return finalContent;
    }

    // NEW: Streaming method
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

            console.log(`[LLMService] Streaming with Provider: ${provider.provider}, Model: ${model}`);

            // Fetch tools (but skip for free models)
            const gameStateTools = await mcpManager.gameStateClient.listTools().catch(() => ({ tools: [] }));
            const combatTools = await mcpManager.combatClient.listTools().catch(() => ({ tools: [] }));

            let allTools = [
                ...(gameStateTools.tools || []),
                ...(combatTools.tools || []),
            ];

            // Free models don't support tools
            if (provider.provider === 'openrouter' && model.includes(':free')) {
                console.log(`[LLMService] Free model detected, skipping tools`);
                allTools = [];
            }

            // Call the provider's streaming method
            await (provider as any).streamMessage(
                history,
                apiKey,
                model,
                allTools,
                callbacks.onChunk,
                async (toolCall: any) => {
                    // Handle Tool Call
                    console.log(`[LLMService] Received tool call:`, toolCall);
                    callbacks.onToolCall(toolCall);

                    // Execute Tool
                    let result;
                    try {
                        // Determine which client to use (simplified logic)
                        const isGameStateTool = gameStateTools.tools?.some((t: any) => t.name === toolCall.name);
                        
                        if (isGameStateTool) {
                            result = await mcpManager.gameStateClient.callTool(toolCall.name, toolCall.arguments);
                        } else {
                            result = await mcpManager.combatClient.callTool(toolCall.name, toolCall.arguments);
                        }
                    } catch (error: any) {
                        result = { error: error.message };
                    }

                    console.log(`[LLMService] Tool result:`, result);
                    callbacks.onToolResult(toolCall.name, result);

                    // Auto-sync combat state if combat tool was used
                    const combatTools = ['place_creature', 'move_creature', 'initialize_battlefield', 'batch_place_creatures', 'batch_move_creatures'];
                    if (combatTools.includes(toolCall.name)) {
                        console.log(`[LLMService] Combat tool used - syncing 3D combat state`);
                        try {
                            const { useCombatStore } = await import('../../stores/combatStore');
                            await useCombatStore.getState().syncCombatState();
                        } catch (e) {
                            console.warn('[LLMService] Failed to sync combat state:', e);
                        }
                    }

                    // Prepare history for recursion
                    const newHistory = [...history];
                    
                    // Add the assistant's message (which included the tool call)
                    newHistory.push({
                        role: 'assistant',
                        content: '', // The content was streamed
                        toolCalls: [{
                            id: toolCall.id,
                            type: 'function',
                            function: {
                                name: toolCall.name,
                                arguments: JSON.stringify(toolCall.arguments)
                            }
                        }]
                    } as any);

                    // Add the tool result
                    newHistory.push({
                        role: 'tool',
                        content: JSON.stringify(result),
                        toolCallId: toolCall.id
                    } as any);

                    // Notify start of next stream (recursion)
                    callbacks.onStreamStart();

                    // Recurse
                    await this.streamMessage(
                        newHistory,
                        callbacks
                    );
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
