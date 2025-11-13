import React, { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameState';
import { ConversationStats } from './ConversationStats';
import { MessageSearch } from './MessageSearch';
import './ConversationList.css';

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    conversationsLoading,
    conversationError,
    character,
    loadConversations,
    switchConversation,
    createConversation,
    deleteConversation,
    pinConversation,
    archiveConversation
  } = useGameStore();

  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations(character?.id);
  }, [character?.id]);

  // Load templates when modal opens
  useEffect(() => {
    if (showNewModal && templates.length === 0) {
      fetch('http://localhost:5001/api/conversations/templates')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setTemplates(data.templates);
          }
        })
        .catch(err => console.error('Failed to load templates:', err));
    }
  }, [showNewModal]);

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Filter by archived status
    if (!showArchived && conv.archived) return false;

    // Filter by search query
    if (searchQuery && !conv.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Sort: pinned first, then by last modified
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.last_modified) - new Date(a.last_modified);
  });

  const handleCreateConversation = async () => {
    if (selectedTemplate) {
      // Create from template
      try {
        const response = await fetch('http://localhost:5001/api/conversations/from-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: selectedTemplate,
            character_id: character?.id,
            custom_title: newConvTitle || undefined
          })
        });
        const data = await response.json();
        if (data.status === 'success') {
          await loadConversations(character?.id);
          await switchConversation(data.conversation.id);
        }
      } catch (error) {
        console.error('Failed to create from template:', error);
      }
    } else {
      // Create blank conversation
      await createConversation(newConvTitle || null, character?.id);
    }

    setShowNewModal(false);
    setNewConvTitle('');
    setSelectedTemplate(null);
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      await deleteConversation(convId);
    }
  };

  const handlePinConversation = async (convId, currentlyPinned, e) => {
    e.stopPropagation();
    await pinConversation(convId, !currentlyPinned);
  };

  const handleExportConversation = async (convId, format, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(
        `http://localhost:5001/api/conversations/${convId}/export?format=${format}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `conversation.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export conversation');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatTokens = (tokens) => {
    if (tokens < 1000) return tokens;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="conversation-list">
      {/* Header */}
      <div className="conversation-list-header">
        <h2>Conversations</h2>
        <div className="header-actions">
          <button
            className="header-action-btn"
            onClick={() => setShowSearchModal(true)}
            title="Search Messages"
          >
            🔍
          </button>
          <button
            className="new-conversation-btn"
            onClick={() => setShowNewModal(true)}
            title="New Conversation"
          >
            ＋
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="conversation-search">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="conversation-filters">
        <label>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {/* Statistics Dashboard */}
      <ConversationStats />

      {/* Error Display */}
      {conversationError && (
        <div className="conversation-error">
          {conversationError}
        </div>
      )}

      {/* Loading State */}
      {conversationsLoading && conversations.length === 0 && (
        <div className="conversation-loading">
          Loading conversations...
        </div>
      )}

      {/* Conversation List */}
      <div className="conversations">
        {sortedConversations.length === 0 && !conversationsLoading && (
          <div className="no-conversations">
            <p>No conversations yet</p>
            <button onClick={() => setShowNewModal(true)}>
              Create your first conversation
            </button>
          </div>
        )}

        {sortedConversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''} ${conv.archived ? 'archived' : ''}`}
            onClick={() => switchConversation(conv.id)}
          >
            <div className="conversation-item-header">
              <div className="conversation-title">
                {conv.pinned && <span className="pin-icon" title="Pinned">📌</span>}
                {conv.title}
              </div>
              <div className="conversation-actions">
                <button
                  className="pin-btn"
                  onClick={(e) => handlePinConversation(conv.id, conv.pinned, e)}
                  title={conv.pinned ? 'Unpin' : 'Pin'}
                >
                  {conv.pinned ? '📌' : '📍'}
                </button>
                <button
                  className="export-btn"
                  onClick={(e) => handleExportConversation(conv.id, 'json', e)}
                  title="Export as JSON"
                >
                  📥
                </button>
                <button
                  className="export-btn"
                  onClick={(e) => handleExportConversation(conv.id, 'markdown', e)}
                  title="Export as Markdown"
                >
                  📝
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="conversation-meta">
              <span className="message-count" title="Messages">
                💬 {conv.message_count}
              </span>
              <span className="token-count" title="Tokens">
                🎯 {formatTokens(conv.total_tokens)}
              </span>
              <span className="last-modified">
                {formatDate(conv.last_modified)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => {
          setShowNewModal(false);
          setSelectedTemplate(null);
        }}>
          <div className="modal-content template-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Conversation</h3>

            {/* Template Selection */}
            <div className="template-section">
              <label>Choose a template:</label>
              <div className="template-grid">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="template-icon">{template.icon}</div>
                    <div className="template-name">{template.name}</div>
                    <div className="template-description">{template.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Title Input */}
            <input
              type="text"
              placeholder={`Title (optional${selectedTemplate ? ', uses template default' : ''})`}
              value={newConvTitle}
              onChange={(e) => setNewConvTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateConversation()}
            />

            <div className="modal-actions">
              <button onClick={handleCreateConversation}>
                {selectedTemplate ? 'Create from Template' : 'Create'}
              </button>
              <button onClick={() => {
                setShowNewModal(false);
                setSelectedTemplate(null);
                setNewConvTitle('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Search Modal */}
      {showSearchModal && (
        <MessageSearch onClose={() => setShowSearchModal(false)} />
      )}
    </div>
  );
}
