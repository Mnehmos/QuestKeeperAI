import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameState';
import { ModelSelector } from './ModelSelector';
import './ChatInterface.css';

export function ChatInterface() {
  const messages = useGameStore((state) => state.messages);
  const addMessage = useGameStore((state) => state.addMessage);
  const addToolOutput = useGameStore((state) => state.addToolOutput);
  const character = useGameStore((state) => state.character);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  const handleModelChange = (provider, model) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: input.trim(),
          character_id: character?.id,
          enable_tools: true,
          provider: selectedProvider,
          model: selectedModel
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Add assistant message
        const assistantMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          execution_ms: data.execution_ms
        };
        addMessage(assistantMessage);

        // Add tool outputs to tool output panel
        if (data.tool_calls && data.tool_calls.length > 0) {
          data.tool_calls.forEach(toolCall => {
            addToolOutput({
              ...toolCall,
              timestamp: Date.now()
            });
          });
        }
      } else {
        // Error message
        const errorMessage = {
          role: 'system',
          content: `Error: ${data.error}`,
          timestamp: Date.now(),
          isError: true
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'system',
        content: `Connection error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <ModelSelector onModelChange={handleModelChange} />
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>Welcome to QuestKeeperAI</h2>
            <p>Your D&D 5e AI Assistant</p>
            <div className="welcome-hints">
              <div className="hint-card">
                <span className="hint-icon">🎲</span>
                <span>Roll dice and manage combat</span>
              </div>
              <div className="hint-card">
                <span className="hint-icon">📜</span>
                <span>Create and track quests</span>
              </div>
              <div className="hint-card">
                <span className="hint-icon">🗡️</span>
                <span>Manage inventory and equipment</span>
              </div>
              <div className="hint-card">
                <span className="hint-icon">✨</span>
                <span>Generate characters and stories</span>
              </div>
            </div>
            {character && (
              <div className="active-character-notice">
                <span className="notice-icon">👤</span>
                <span>Active Character: <strong>{character.name}</strong></span>
              </div>
            )}
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={`message ${message.role} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '🧙 You' :
                   message.role === 'assistant' ? '🎲 DM' : '⚙️ System'}
                </span>
                <span className="message-timestamp">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <div className="message-content">
                {message.content}
              </div>
              {message.execution_ms && (
                <div className="message-meta">
                  <span>⚡ {message.execution_ms}ms</span>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-header">
              <span className="message-role">🎲 DM</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder={character
            ? `Ask your DM anything about ${character.name}'s adventure...`
            : "Ask your DM anything..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? '⏳' : '▶'}
        </button>
      </form>
    </div>
  );
}
