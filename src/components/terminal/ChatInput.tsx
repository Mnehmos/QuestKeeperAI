import React, { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { mcpManager } from '../../services/mcpClient';

export const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const getMessages = useChatStore((state) => state.getMessages);
  const startStreamingMessage = useChatStore((state) => state.startStreamingMessage);
  const updateStreamingMessage = useChatStore((state) => state.updateStreamingMessage);
  const updateToolStatus = useChatStore((state) => state.updateToolStatus);
  const finalizeStreamingMessage = useChatStore((state) => state.finalizeStreamingMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Add user message
    addMessage({
      id: Date.now().toString(),
      sender: 'user',
      content: currentInput,
      timestamp: Date.now(),
      type: 'text',
    });

    // Handle /test command separately
    if (currentInput === '/test') {
      try {
        addMessage({
          id: Date.now().toString() + '-sys',
          sender: 'system',
          content: 'Testing MCP connection...',
          timestamp: Date.now(),
          type: 'info',
        });

        const tools = await mcpManager.gameStateClient.listTools();

        addMessage({
          id: Date.now().toString() + '-ai',
          sender: 'ai',
          content: `MCP Tools Response:\n${JSON.stringify(tools, null, 2)}`,
          timestamp: Date.now(),
          type: 'text',
        });
      } catch (error: any) {
        addMessage({
          id: Date.now().toString() + '-err',
          sender: 'system',
          content: `MCP Error: ${error.message}`,
          timestamp: Date.now(),
          type: 'error',
        });
      }
      setIsLoading(false);
      return;
    }

    // Send to LLM with streaming
    try {
      // Dynamic import to get settings and service
      const { useSettingsStore } = await import('../../stores/settingsStore');
      const { llmService } = await import('../../services/llm/LLMService');

      // Get system prompt from settings
      const systemPrompt = useSettingsStore.getState().systemPrompt;

      // Get current messages from store
      const currentMessages = getMessages();

      // Convert chat history to LLM format - filter out partial and system messages
      // We need to cast to any[] to avoid TS issues with the map return type if strictly typed
      const history: any[] = currentMessages
        .filter(msg => !msg.partial && (msg.sender === 'user' || msg.sender === 'ai'))
        .flatMap(msg => {
          const messages = [];

          // 1. Add the main message (User or Assistant)
          const mainMsg: any = {
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          };

          // If it's a tool call, add tool_calls array
          if (msg.isToolCall) {
            mainMsg.toolCalls = [{
              id: msg.toolCallId || msg.toolName, // Use stored ID or fallback to name
              type: 'function',
              function: {
                name: msg.toolName,
                arguments: JSON.stringify(msg.toolArguments)
              }
            }];
          }

          messages.push(mainMsg);

          // 2. If it's a tool call and has a response, add the Tool Result message
          if (msg.isToolCall && msg.toolResponse) {
            messages.push({
              role: 'tool',
              toolCallId: msg.toolCallId || msg.toolName, // MUST match the ID above
              content: msg.toolResponse
            });
          }

          return messages;
        });

      // Prepend system message if we have one
      if (systemPrompt) {
        history.unshift({ role: 'system', content: systemPrompt });
      }

      // Start streaming message
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
             // Update the tool status in the chat history
             updateToolStatus(currentStreamId, 'completed', JSON.stringify(result));
          },
          onStreamStart: () => {
             // Finalize previous stream
             finalizeStreamingMessage(currentStreamId);
             
             // Start new stream
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
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-terminal-green-dim bg-terminal-black">
      <div className="flex gap-2 items-center">
        <div className="flex-grow flex items-center bg-terminal-black border border-terminal-green-dim p-2">
          <span className="text-terminal-green mr-2 font-bold">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "PROCESSING..." : "ENTER_COMMAND..."}
            className="flex-grow bg-transparent focus:outline-none text-terminal-green placeholder-terminal-green/30 font-mono disabled:opacity-50"
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