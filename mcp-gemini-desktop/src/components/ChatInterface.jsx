import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameState';
import { ModelSelector } from './ModelSelector';
import './ChatInterface.css';

export function ChatInterface() {
  // NEW: Use conversation state instead of flat messages
  const currentMessages = useGameStore((state) => state.currentMessages);
  const currentConversationId = useGameStore((state) => state.currentConversationId);
  const conversations = useGameStore((state) => state.conversations);
  const sendMessage = useGameStore((state) => state.sendMessage);
  const addToolOutput = useGameStore((state) => state.addToolOutput);
  const character = useGameStore((state) => state.character);
  const createConversation = useGameStore((state) => state.createConversation);
  const updateConversationTitle = useGameStore((state) => state.updateConversationTitle);
  const deleteConversation = useGameStore((state) => state.deleteConversation);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Get current conversation details
  const currentConversation = conversations.find(c => c.id === currentConversationId);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

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

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // NEW: Use sendMessage from store (handles conversation creation if needed)
      const data = await sendMessage(messageText, selectedProvider, selectedModel);

      // Add tool outputs to tool output panel
      if (data.tool_calls && data.tool_calls.length > 0) {
        data.tool_calls.forEach(toolCall => {
          addToolOutput({
            ...toolCall,
            timestamp: Date.now()
          });
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Error is already handled in sendMessage, but show user-friendly message
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleEdit = async () => {
    if (!currentConversation || !editedTitle.trim()) return;
    await updateConversationTitle(currentConversationId, editedTitle.trim());
    setIsEditingTitle(false);
  };

  const handleDeleteConversation = async () => {
    if (!currentConversation) return;
    if (window.confirm(`Delete "${currentConversation.title}"? This cannot be undone.`)) {
      await deleteConversation(currentConversationId);
    }
  };

  const formatTokens = (tokens) => {
    if (tokens < 1000) return tokens;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(1)}M`;
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
        {/* Conversation Title */}
        {currentConversation ? (
          <div className="conversation-header">
            {isEditingTitle ? (
              <input
                type="text"
                className="title-edit-input"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleEdit}
                onKeyPress={(e) => e.key === 'Enter' && handleTitleEdit()}
                autoFocus
              />
            ) : (
              <h3
                className="conversation-title"
                onClick={() => {
                  setEditedTitle(currentConversation.title);
                  setIsEditingTitle(true);
                }}
                title="Click to edit title"
              >
                {currentConversation.title}
              </h3>
            )}
            <div className="conversation-info">
              <span className="token-display" title="Tokens used">
                🎯 {formatTokens(currentConversation.total_tokens)}
              </span>
              <span className="message-count" title="Messages">
                💬 {currentConversation.message_count}
              </span>
            </div>
          </div>
        ) : (
          <div className="no-conversation-header">
            <span>Select or create a conversation to start</span>
          </div>
        )}

        {/* Model Selector */}
        <ModelSelector onModelChange={handleModelChange} />
      </div>
      <div className="chat-messages">
        {currentMessages.length === 0 ? (
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
          currentMessages.map((message, idx) => (
            <div
              key={message.id || idx}
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
