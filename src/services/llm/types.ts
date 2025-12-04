import { LLMProvider } from '../../stores/settingsStore';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolCallId?: string;
}

export interface LLMResponse {
    content: string;
    toolCalls?: ToolCall[];
}

export interface ToolCall {
    id?: string;
    name: string;
    arguments: any;
    parseError?: string; // Set when argument parsing fails
}

export interface LLMProviderInterface {
    provider: LLMProvider;
    sendMessage(
        messages: ChatMessage[],
        apiKey: string,
        model: string,
        tools?: any[]
    ): Promise<LLMResponse>;
}
