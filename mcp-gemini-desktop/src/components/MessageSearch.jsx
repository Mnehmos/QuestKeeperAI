import React, { useState } from 'react';
import { useGameStore } from '../stores/gameState';
import './MessageSearch.css';

export function MessageSearch({ onClose }) {
  const character = useGameStore((state) => state.character);
  const switchConversation = useGameStore((state) => state.switchConversation);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchScope, setSearchScope] = useState('all'); // 'all' or 'character'

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      // Build URL with query params
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        limit: '50'
      });

      // Add character filter if needed
      if (searchScope === 'character' && character?.id) {
        params.append('character_id', character.id);
      }

      const response = await fetch(
        `http://localhost:5001/api/conversations/search?${params.toString()}`
      );
      const data = await response.json();

      if (data.status === 'success') {
        setResults(data.results);
        setTotal(data.total);
      } else {
        setError(data.error || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const handleResultClick = async (result) => {
    // Switch to the conversation containing this message
    await switchConversation(result.conversation_id);

    // Close the search modal
    onClose();

    // TODO: Scroll to the specific message (future enhancement)
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
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

  const highlightMatch = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="search-modal-header">
          <h3>🔍 Search Messages</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Search Input */}
        <div className="search-input-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search for text in messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />

          {/* Search Scope */}
          <div className="search-scope">
            <label>
              <input
                type="radio"
                value="all"
                checked={searchScope === 'all'}
                onChange={(e) => setSearchScope(e.target.value)}
              />
              All conversations
            </label>
            {character && (
              <label>
                <input
                  type="radio"
                  value="character"
                  checked={searchScope === 'character'}
                  onChange={(e) => setSearchScope(e.target.value)}
                />
                Current character ({character.name})
              </label>
            )}
          </div>

          <button
            className="search-btn"
            onClick={performSearch}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="search-error">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        <div className="search-results">
          {loading && (
            <div className="search-loading">
              Searching...
            </div>
          )}

          {!loading && searchPerformed && results.length === 0 && (
            <div className="search-no-results">
              <p>No messages found matching "{searchQuery}"</p>
              <p className="search-tip">Try different keywords or check your search scope</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="search-results-header">
                Found {total} result{total !== 1 ? 's' : ''} for "{searchQuery}"
              </div>

              <div className="search-results-list">
                {results.map((result) => (
                  <div
                    key={result.message_id}
                    className="search-result-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="result-header">
                      <span className="result-conversation">
                        📜 {result.conversation_title}
                      </span>
                      <span className="result-timestamp">
                        {formatTimestamp(result.timestamp)}
                      </span>
                    </div>

                    <div className="result-role">
                      {result.role === 'user' ? '👤 User' : '🤖 Assistant'}
                    </div>

                    <div className="result-context">
                      {highlightMatch(result.context, searchQuery)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !searchPerformed && (
            <div className="search-empty-state">
              <p>💡 Enter a search term to find messages</p>
              <p className="search-tip">Search is case-insensitive and finds partial matches</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
