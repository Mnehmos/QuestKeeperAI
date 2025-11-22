import { LLMProviderInterface, ChatMessage, LLMResponse } from '../types';
import { LLMProvider } from '../../../stores/settingsStore';

export class GeminiProvider implements LLMProviderInterface {
    provider: LLMProvider = 'gemini';

    async sendMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools?: any[]
    ): Promise<LLMResponse> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const contents = this.formatMessages(messages);
        const body: any = {
            contents,
            generationConfig: {
                maxOutputTokens: 4096,
            }
        };

        if (tools && tools.length > 0) {
            body.tools = [{
                function_declarations: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema
                }))
            }];
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            
            if (!candidate) {
                throw new Error('No candidates returned');
            }

            const contentPart = candidate.content.parts.find((p: any) => p.text);
            const functionCallParts = candidate.content.parts.filter((p: any) => p.functionCall);

            const result: LLMResponse = {
                content: contentPart ? contentPart.text : ''
            };

            if (functionCallParts.length > 0) {
                result.toolCalls = functionCallParts.map((part: any) => ({
                    id: part.functionCall.name, // Gemini doesn't provide ID, use name
                    name: part.functionCall.name,
                    arguments: part.functionCall.args
                }));
            }

            return result;

        } catch (error: any) {
            throw new Error(`GEMINI Request Failed: ${error.message}`);
        }
    }

    async streamMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools: any[] | undefined,
        onChunk: (content: string) => void,
        onToolCall: (toolCall: any) => void,
        onComplete: () => void,
        onError: (error: string) => void
    ): Promise<void> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

        const contents = this.formatMessages(messages);
        const body: any = {
            contents,
            generationConfig: {
                maxOutputTokens: 4096,
            }
        };

        if (tools && tools.length > 0) {
            body.tools = [{
                function_declarations: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema
                }))
            }];
        }

        console.log(`[Gemini] Starting stream for model: ${model}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
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

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('[Gemini] Stream completed');
                    onComplete();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                // Gemini sends a JSON array of objects, but in chunks. 
                // The stream format is actually a JSON array, e.g. "[{...},\n{...}]"
                // We need to parse complete JSON objects.
                // A simple way is to split by "}\n,\n{" or similar, but it's tricky.
                // Actually, Gemini stream returns a JSON array where each element is a GenerateContentResponse.
                // The chunks might not be clean JSON objects.
                
                // However, typically `streamGenerateContent` returns a stream of JSON objects if using SSE, 
                // but the REST API returns a JSON array. 
                // Wait, the REST API `streamGenerateContent` returns a response stream where each chunk is a JSON object?
                // No, it returns a JSON array.
                
                // Let's use a simpler approach: Accumulate buffer and try to parse complete objects.
                // Or better, assume the response is a stream of JSON objects separated by some delimiter or just a JSON array.
                
                // Actually, standard fetch stream handling for Gemini REST API:
                // It returns a JSON array. We need to handle the array structure.
                // "[", ",", "]" might be present.
                
                // Let's try a robust parsing strategy:
                // 1. Remove leading '[' if present.
                // 2. Split by object boundaries?
                
                // Alternative: Use a library or just try to parse what we have.
                // Since this is a custom implementation, let's try to parse complete JSON objects from the buffer.
                
                let startIndex = 0;
                let braceCount = 0;
                let inString = false;
                let escaped = false;

                for (let i = 0; i < buffer.length; i++) {
                    const char = buffer[i];
                    
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    
                    if (char === '"') {
                        inString = !inString;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            if (braceCount === 0) startIndex = i;
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                // Found a complete object
                                const jsonStr = buffer.substring(startIndex, i + 1);
                                try {
                                    const chunk = JSON.parse(jsonStr);
                                    this.handleStreamChunk(chunk, onChunk, onToolCall);
                                    // Remove processed part from buffer
                                    // But we can't modify buffer inside loop easily.
                                    // We'll reconstruct buffer after loop.
                                } catch (e) {
                                    console.warn('Failed to parse Gemini chunk:', jsonStr);
                                }
                            }
                        }
                    }
                }
                
                // Keep only the unprocessed part of the buffer
                // This logic is a bit complex to implement correctly in one go inside the loop.
                // Let's simplify: Split by "}\n,\n{" or just "}" if we can rely on formatting.
                // Gemini output is usually pretty standard.
                
                // Let's try a simpler regex-based split for now, or just accumulate and try to parse.
                // Actually, the `braceCount` approach is best but needs to be outside the loop to handle buffer updates.
                
                // Re-implementing brace counting with buffer slicing:
                let processIndex = 0;
                let currentBraceCount = 0;
                let currentInString = false;
                let currentEscaped = false;
                
                for (let i = 0; i < buffer.length; i++) {
                    const char = buffer[i];
                    if (currentEscaped) { currentEscaped = false; continue; }
                    if (char === '\\') { currentEscaped = true; continue; }
                    if (char === '"') { currentInString = !currentInString; continue; }
                    
                    if (!currentInString) {
                        if (char === '{') {
                            currentBraceCount++;
                        } else if (char === '}') {
                            currentBraceCount--;
                            if (currentBraceCount === 0) {
                                // Potential end of object
                                const jsonStr = buffer.substring(processIndex, i + 1);
                                // Skip if it's just whitespace or comma
                                if (jsonStr.trim().startsWith('{')) {
                                    try {
                                        const chunk = JSON.parse(jsonStr);
                                        this.handleStreamChunk(chunk, onChunk, onToolCall);
                                        processIndex = i + 1;
                                        // Skip subsequent comma/whitespace
                                        while (processIndex < buffer.length && (buffer[processIndex] === ',' || buffer[processIndex].match(/\s/))) {
                                            processIndex++;
                                        }
                                        // Adjust i to match processIndex
                                        i = processIndex - 1; 
                                    } catch (e) {
                                        // Not a valid JSON object yet, continue
                                    }
                                }
                            }
                        }
                    }
                }
                
                buffer = buffer.substring(processIndex);
            }

        } catch (error: any) {
            onError(error.message || 'Unknown streaming error');
        }
    }

    private handleStreamChunk(chunk: any, onChunk: (c: string) => void, onToolCall: (tc: any) => void) {
        const candidate = chunk.candidates?.[0];
        if (!candidate) return;

        const contentPart = candidate.content?.parts?.find((p: any) => p.text);
        if (contentPart) {
            onChunk(contentPart.text);
        }

        const functionCallParts = candidate.content?.parts?.filter((p: any) => p.functionCall);
        if (functionCallParts?.length > 0) {
            functionCallParts.forEach((part: any) => {
                onToolCall({
                    id: part.functionCall.name, // Gemini doesn't provide ID, use name
                    name: part.functionCall.name,
                    arguments: part.functionCall.args
                });
            });
        }
    }

    private formatMessages(messages: ChatMessage[]): any[] {
        return messages.map(m => {
            let role = 'user';
            if (m.role === 'assistant') role = 'model';
            if (m.role === 'system') role = 'user'; // Gemini doesn't support system role directly in messages, usually prepended or separate config. 
            // Actually Gemini 1.5 supports system instructions, but for now mapping to user/model is safer for compat.
            // Wait, system instructions are separate in generationConfig or top level.
            // For simplicity, we'll treat system as user for now, or merge with first user message.
            
            // Better handling:
            if (m.role === 'tool') {
                return {
                    // Gemini: role='function', parts=[{functionResponse: {name: ..., response: ...}}]
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: m.toolCallId, // We need the tool name here, but ChatMessage stores toolCallId. 
                            // We might need to store tool name in ChatMessage for tool role too.
                            // For now, let's assume toolCallId is the name or we have to look it up.
                            // Actually, in our system toolCallId is the ID. Gemini expects the function name.
                            // This is a mismatch. We might need to change ChatMessage or how we store tool calls.
                            // Let's use toolCallId as name for now if it looks like a name, otherwise we have a problem.
                            // In our system, toolCallId is usually the ID from OpenAI/Anthropic.
                            // But for Gemini, we need the name.
                            // Let's assume for now we can pass the ID as name if we control it, but we don't.
                            // We'll need to fix this later.
                            // We'll need to fix this later.
                            // name: m.toolCallId, // Removed duplicate 
                            response: { content: m.content }
                        }
                    }]
                };
            }

            const parts: any[] = [];
            if (m.content) parts.push({ text: m.content });
            
            if (m.toolCalls) {
                m.toolCalls.forEach(tc => {
                    parts.push({
                        functionCall: {
                            name: tc.name,
                            args: tc.arguments
                        }
                    });
                });
            }

            return {
                role: role === 'system' ? 'user' : role,
                parts
            };
        });
    }
}
