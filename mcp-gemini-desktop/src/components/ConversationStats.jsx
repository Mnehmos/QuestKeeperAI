import React, { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameState';
import './ConversationStats.css';

export function ConversationStats() {
  const character = useGameStore((state) => state.character);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadStats();
  }, [character?.id]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = character?.id
        ? `http://localhost:5001/api/conversations/stats?character_id=${character.id}`
        : 'http://localhost:5001/api/conversations/stats';

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'success') {
        setStats(data.stats);
      } else {
        setError('Failed to load statistics');
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    if (tokens < 1000) return tokens.toLocaleString();
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(1)}M`;
  };

  const formatNumber = (num) => {
    return num ? num.toLocaleString() : '0';
  };

  if (error) {
    return (
      <div className="conversation-stats-error">
        <span>⚠️ {error}</span>
        <button onClick={loadStats}>Retry</button>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="conversation-stats-loading">
        Loading statistics...
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`conversation-stats ${expanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div
        className="stats-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="stats-header-left">
          <span className="stats-icon">📊</span>
          <span className="stats-title">Statistics</span>
        </div>
        <button className="stats-toggle">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="stats-content">
          {/* Overview Cards */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">💬</div>
              <div className="stat-value">{formatNumber(stats.total_conversations)}</div>
              <div className="stat-label">Total Conversations</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{formatNumber(stats.active_conversations)}</div>
              <div className="stat-label">Active</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📌</div>
              <div className="stat-value">{formatNumber(stats.pinned_conversations)}</div>
              <div className="stat-label">Pinned</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-value">{formatNumber(stats.archived_conversations)}</div>
              <div className="stat-label">Archived</div>
            </div>
          </div>

          {/* Message & Token Stats */}
          <div className="stats-details">
            <div className="stat-row">
              <span className="stat-row-icon">💭</span>
              <span className="stat-row-label">Total Messages</span>
              <span className="stat-row-value">{formatNumber(stats.total_messages)}</span>
            </div>

            <div className="stat-row">
              <span className="stat-row-icon">🎯</span>
              <span className="stat-row-label">Total Tokens</span>
              <span className="stat-row-value">{formatTokens(stats.total_tokens)}</span>
            </div>

            {stats.total_conversations > 0 && (
              <>
                <div className="stat-row">
                  <span className="stat-row-icon">📊</span>
                  <span className="stat-row-label">Avg Messages/Conv</span>
                  <span className="stat-row-value">
                    {(stats.total_messages / stats.total_conversations).toFixed(1)}
                  </span>
                </div>

                <div className="stat-row">
                  <span className="stat-row-icon">📈</span>
                  <span className="stat-row-label">Avg Tokens/Conv</span>
                  <span className="stat-row-value">
                    {formatTokens(stats.total_tokens / stats.total_conversations)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Refresh Button */}
          <div className="stats-footer">
            <button
              className="stats-refresh"
              onClick={(e) => {
                e.stopPropagation();
                loadStats();
              }}
              disabled={loading}
            >
              {loading ? '⟳ Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
