import { LLMProviderInterface, ChatMessage, LLMResponse } from '../types';
import { LLMProvider } from '../../../stores/settingsStore';

export class AnthropicProvider implements LLMProviderInterface {
    provider: LLMProvider = 'anthropic';

    async sendMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools?: any[]
    ): Promise<LLMResponse> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'anthropic-beta': 'advanced-tool-use-2025-11-20' // Enable tool search with defer_loading
        };

        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system').map(m => {
            if (m.role === 'tool') {
                return {
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: m.toolCallId,
                            content: m.content
                        }
                    ]
                };
            }
            if (m.role === 'assistant' && m.toolCalls) {
                return {
                    role: 'assistant',
                    content: [
                        ...(m.content ? [{ type: 'text', text: m.content }] : []),
                        ...m.toolCalls.map((tc: any) => ({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.name,
                            input: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments
                        }))
                    ]
                };
            }
            return {
                role: m.role,
                content: m.content
            };
        });

        const body: any = {
            model,
            messages: conversationMessages,
            max_tokens: 4096,
            stream: false,
        };

        if (systemMessage) {
            body.system = systemMessage.content;
        }

        if (tools && tools.length > 0) {
            body.tools = tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
                // MCP spec: defer_loading for on-demand tool loading
                ...(tool.deferLoading !== undefined && { defer_loading: tool.deferLoading })
            }));
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            const contentBlock = data.content.find((c: any) => c.type === 'text');
            const toolUseBlocks = data.content.filter((c: any) => c.type === 'tool_use');

            const result: LLMResponse = {
                content: contentBlock ? contentBlock.text : '',
            };

            if (toolUseBlocks.length > 0) {
                result.toolCalls = toolUseBlocks.map((tc: any) => ({
                    id: tc.id,
                    name: tc.name,
                    arguments: tc.input,
                }));
            }

            return result;
        } catch (error: any) {
            throw new Error(`ANTHROPIC Request Failed: ${error.message}`);
        }
    }

    async streamMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools: any[] | undefined,
        onChunk: (content: string) => void,
        onToolCalls: (toolCalls: any[]) => void, // Changed to batch callback
        onComplete: () => void | Promise<void>,
        onError: (error: string) => void
    ): Promise<void> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'anthropic-beta': 'advanced-tool-use-2025-11-20' // Enable tool search with defer_loading
        };

        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system').map(m => {
             if (m.role === 'tool') {
                return {
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: m.toolCallId,
                            content: m.content
                        }
                    ]
                };
            }
            if (m.role === 'assistant' && m.toolCalls) {
                return {
                    role: 'assistant',
                    content: [
                        ...(m.content ? [{ type: 'text', text: m.content }] : []),
                        ...m.toolCalls.map((tc: any) => ({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.name,
                            input: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments
                        }))
                    ]
                };
            }
            return {
                role: m.role,
                content: m.content
            };
        });

        const body: any = {
            model,
            messages: conversationMessages,
            max_tokens: 4096,
            stream: true,
        };

        if (systemMessage) {
            body.system = systemMessage.content;
        }

        if (tools && tools.length > 0) {
            body.tools = tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
                // MCP spec: defer_loading for on-demand tool loading
                ...(tool.deferLoading !== undefined && { defer_loading: tool.deferLoading })
            }));
        }

        console.log(`[Anthropic] Starting stream for model: ${model}`);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
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
            
            // Tool call accumulation - collect ALL tool calls
            let currentToolCall: { index: number; id: string; name: string; arguments: string } | null = null;
            const completedToolCalls: any[] = [];

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        // Emit all collected tool calls at once when stream ends
                        if (completedToolCalls.length > 0) {
                            console.log(`[Anthropic] Stream ended, emitting ${completedToolCalls.length} tool call(s) as batch`);
                            onToolCalls(completedToolCalls);
                        } else {
                            console.log(`[Anthropic] Stream completed (no tool calls)`);
                        }
                        // FIX: Always call onComplete to resolve the promise in LLMService
                        await onComplete();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) continue;
                        
                        const jsonStr = trimmed.substring(6);
                        if (jsonStr === '[DONE]') continue;

                        try {
                            const event = JSON.parse(jsonStr);
                            
                            switch (event.type) {
                                case 'content_block_start':
                                    if (event.content_block.type === 'tool_use') {
                                        currentToolCall = {
                                            index: event.index,
                                            id: event.content_block.id,
                                            name: event.content_block.name,
                                            arguments: ''
                                        };
                                    }
                                    break;
                                
                                case 'content_block_delta':
                                    if (event.delta.type === 'text_delta') {
                                        onChunk(event.delta.text);
                                    } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
                                        currentToolCall.arguments += event.delta.partial_json;
                                    }
                                    break;

                                case 'content_block_stop':
                                    if (currentToolCall && currentToolCall.index === event.index) {
                                        try {
                                            console.log(`[Anthropic] Tool call "${currentToolCall.name}" finished, collecting...`);
                                            completedToolCalls.push({
                                                id: currentToolCall.id,
                                                name: currentToolCall.name,
                                                arguments: JSON.parse(currentToolCall.arguments)
                                            });
                                            currentToolCall = null;
                                        } catch (e) {
                                            console.error(`[Anthropic] Failed to parse tool arguments:`, currentToolCall?.arguments);
                                        }
                                    }
                                    break;

                                case 'message_stop':
                                    // Message is done - emit collected tool calls
                                    if (completedToolCalls.length > 0) {
                                        console.log(`[Anthropic] Message stopped, emitting ${completedToolCalls.length} tool call(s) as batch`);
                                        onToolCalls(completedToolCalls);
                                        // FIX: Must call onComplete to resolve the promise, don't just return
                                        await onComplete();
                                        return;
                                    }
                                    break;
                                
                                case 'ping':
                                case 'message_start':
                                case 'message_delta':
                                    // Ignore these events
                                    break;
                            }

                        } catch (e) {
                            console.warn(`[Anthropic] Failed to parse SSE line:`, trimmed);
                        }
                    }
                }
            } catch (streamError: any) {
                console.error(`[Anthropic] Stream reading error:`, streamError);
                onError(streamError.message || 'Stream reading failed');
            }
        } catch (error: any) {
            onError(error.message || 'Unknown streaming error');
        }
    }
}
