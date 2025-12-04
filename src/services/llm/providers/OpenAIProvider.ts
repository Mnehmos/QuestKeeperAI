import { LLMProviderInterface, ChatMessage, LLMResponse } from '../types';
import { LLMProvider } from '../../../stores/settingsStore';

export class OpenAIProvider implements LLMProviderInterface {
    provider: LLMProvider;

    constructor(provider: LLMProvider = 'openai') {
        this.provider = provider;
    }

    async sendMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools?: any[]
    ): Promise<LLMResponse> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'QuestKeeperAI/1.0',
        };

        let baseUrl = 'https://api.openai.com/v1/chat/completions';

        if (model.includes('/') || this.provider === 'openrouter') {
            baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
            headers['HTTP-Referer'] = 'https://questkeeper.ai';
            headers['X-Title'] = 'Quest Keeper AI';
        }

        const body: any = {
            model,
            messages: this.formatMessages(messages),
            stream: false,
        };

        if (tools && tools.length > 0) {
            body.tools = tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema
                },
            }));
        }

        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const choice = data.choices[0];
            const message = choice.message;

            const result: LLMResponse = {
                content: message.content || '',
            };

            if (message.tool_calls) {
                result.toolCalls = [];
                for (const tc of message.tool_calls) {
                    try {
                        result.toolCalls.push({
                            id: tc.id,
                            name: tc.function.name,
                            arguments: JSON.parse(tc.function.arguments),
                        });
                    } catch (parseError) {
                        console.error(`[${this.provider}] Failed to parse tool arguments for ${tc.function.name}:`, parseError);
                        console.error(`[${this.provider}] Raw arguments: '${tc.function.arguments}'`);
                        // Include the tool call with empty arguments so the error can be reported back
                        result.toolCalls.push({
                            id: tc.id,
                            name: tc.function.name,
                            arguments: {},
                            parseError: `Failed to parse arguments: ${tc.function.arguments}`,
                        });
                    }
                }
            }

            return result;
        } catch (error: any) {
            throw new Error(`${this.provider.toUpperCase()} Request Failed: ${error.message}`);
        }
    }

    async streamMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools: any[] | undefined,
        onChunk: (content: string) => void,
        onToolCalls: (toolCalls: any[]) => void, // Changed to batch callback
        onComplete: () => void,
        onError: (error: string) => void
    ): Promise<void> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'QuestKeeperAI/1.0',
        };

        let baseUrl = 'https://api.openai.com/v1/chat/completions';

        if (model.includes('/') || this.provider === 'openrouter') {
            baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
            headers['HTTP-Referer'] = 'https://questkeeper.ai';
            headers['X-Title'] = 'Quest Keeper AI';
        }

        const body: any = {
            model,
            messages: this.formatMessages(messages),
            stream: true,
        };

        if (tools && tools.length > 0) {
            body.tools = tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema
                },
            }));
        }

        console.log(`[${this.provider}] Starting stream for model: ${model}`);

        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                onError(`API Error: ${response.status} - ${errorText}`);
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
                onError('No response body');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';
            
            // Tool call accumulation
            const toolCallAccumulator = new Map<number, { id: string; name: string; arguments: string }>();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        console.log(`[${this.provider}] Stream completed`);
                        onComplete();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === 'data: [DONE]') continue;
                        
                        if (trimmed.startsWith('data: ')) {
                            try {
                                const jsonStr = trimmed.substring(6);
                                const data = JSON.parse(jsonStr);
                                const delta = data.choices[0]?.delta;
                                const finishReason = data.choices[0]?.finish_reason;
                                
                                // Handle text content
                                if (delta?.content) {
                                    onChunk(delta.content);
                                }

                                // Handle tool calls
                                if (delta?.tool_calls) {
                                    for (const tc of delta.tool_calls) {
                                        const index = tc.index;
                                        const existing = toolCallAccumulator.get(index);

                                        if (existing) {
                                            if (tc.function?.arguments) {
                                                existing.arguments += tc.function.arguments;
                                            }
                                        } else {
                                            toolCallAccumulator.set(index, {
                                                id: tc.id || '',
                                                name: tc.function?.name || '',
                                                arguments: tc.function?.arguments || '',
                                            });
                                        }
                                    }
                                }

                                // Check for tool call completion - emit ALL at once
                                if (finishReason === 'tool_calls' && toolCallAccumulator.size > 0) {
                                    console.log(`[${this.provider}] Tool calls finished, emitting ${toolCallAccumulator.size} tool calls as batch`);
                                    
                                    const parsedToolCalls: any[] = [];
                                    for (const toolCall of toolCallAccumulator.values()) {
                                        try {
                                            const argsString = toolCall.arguments || '{}';
                                            parsedToolCalls.push({
                                                id: toolCall.id,
                                                name: toolCall.name,
                                                arguments: JSON.parse(argsString)
                                            });
                                        } catch (e) {
                                            console.error(`[${this.provider}] Failed to parse tool arguments for ${toolCall.name}. Raw arguments: '${toolCall.arguments}'`);
                                        }
                                    }
                                    
                                    // Emit ALL tool calls at once
                                    if (parsedToolCalls.length > 0) {
                                        onToolCalls(parsedToolCalls);
                                    }
                                    
                                    toolCallAccumulator.clear();
                                }

                            } catch (e) {
                                console.warn(`[${this.provider}] Failed to parse SSE line:`, trimmed);
                            }
                        }
                    }
                }
            } catch (streamError: any) {
                console.error(`[${this.provider}] Stream reading error:`, streamError);
                onError(streamError.message || 'Stream reading failed');
            }
        } catch (error: any) {
            onError(error.message || 'Unknown streaming error');
        }
    }

    private formatMessages(messages: ChatMessage[]): any[] {
        return messages.map(msg => {
            const formatted: any = {
                role: msg.role,
                content: msg.content
            };

            // Map toolCalls to tool_calls (snake_case)
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                // Check if it's already in OpenAI format (from LLMService recursion) or internal format
                const firstCall = msg.toolCalls[0] as any;
                
                if (firstCall.type === 'function') {
                    // Already formatted (likely from LLMService recursion)
                    formatted.tool_calls = msg.toolCalls;
                } else {
                    // Internal format, needs mapping
                    formatted.tool_calls = msg.toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: typeof tc.arguments === 'string' 
                                ? tc.arguments 
                                : JSON.stringify(tc.arguments)
                        }
                    }));
                }
            }

            // Map toolCallId to tool_call_id (snake_case)
            if (msg.toolCallId) {
                formatted.tool_call_id = msg.toolCallId;
            }

            return formatted;
        });
    }
}
