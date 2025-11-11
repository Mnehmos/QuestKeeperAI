import React, { useState } from 'react';
import { useGameStore } from '../stores/gameState';
import './QuestLog.css';

const STATUS_COLORS = {
  active: '#00ff88',
  completed: '#0070dd',
  failed: '#ff006e'
};

export function QuestLog() {
  const quests = useGameStore((state) => state.quests);
  const completeQuest = useGameStore((state) => state.completeQuest);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedQuest, setSelectedQuest] = useState(null);

  const tabs = ['active', 'completed', 'failed', 'all'];

  const filteredQuests = quests.filter(quest => {
    if (activeTab === 'all') return true;
    return quest.status === activeTab;
  });

  return (
    <div className="quest-log-panel">
      <div className="quest-log-header">
        <h3>Quest Log</h3>
        <div className="quest-stats">
          <span className="quest-count">{filteredQuests.length} quests</span>
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="quest-list">
        {filteredQuests.length === 0 ? (
          <div className="empty-quests">
            <p>No quests in this category</p>
          </div>
        ) : (
          filteredQuests.map(quest => (
            <div
              key={quest.id}
              className="quest-card"
              style={{ borderLeftColor: STATUS_COLORS[quest.status] }}
              onClick={() => setSelectedQuest(quest)}
            >
              <div className="quest-header">
                <h4 className="quest-title">{quest.title}</h4>
                <span
                  className="quest-status"
                  style={{ color: STATUS_COLORS[quest.status] }}
                >
                  {quest.status}
                </span>
              </div>
              {quest.quest_giver && (
                <div className="quest-giver">Given by: {quest.quest_giver}</div>
              )}
              <div className="quest-description">
                {quest.description && quest.description.substring(0, 100)}
                {quest.description && quest.description.length > 100 ? '...' : ''}
              </div>
              {quest.objectives && quest.objectives.length > 0 && (
                <div className="quest-progress">
                  <span>{quest.objectives.filter(o => o.completed).length}/{quest.objectives.length} objectives</span>
                </div>
              )}
              {quest.mcp_managed && (
                <div className="mcp-badge" title="Managed by MCP tool">
                  MCP
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedQuest && (
        <div className="quest-detail-modal" onClick={() => setSelectedQuest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedQuest(null)}>×</button>
            <h3 style={{ color: STATUS_COLORS[selectedQuest.status] }}>
              {selectedQuest.title}
            </h3>
            <div className="quest-meta">
              <div className="meta-item">
                <span className="meta-label">Status:</span>
                <span
                  className="meta-value"
                  style={{ color: STATUS_COLORS[selectedQuest.status] }}
                >
                  {selectedQuest.status}
                </span>
              </div>
              {selectedQuest.quest_giver && (
                <div className="meta-item">
                  <span className="meta-label">Quest Giver:</span>
                  <span className="meta-value">{selectedQuest.quest_giver}</span>
                </div>
              )}
              {selectedQuest.mcp_managed && (
                <div className="meta-item">
                  <span className="meta-label">Source:</span>
                  <span className="meta-value">{selectedQuest.mcp_source || 'MCP'}</span>
                </div>
              )}
            </div>

            <div className="quest-description-full">
              {selectedQuest.description || 'No description available.'}
            </div>

            {selectedQuest.objectives && selectedQuest.objectives.length > 0 && (
              <div className="objectives-section">
                <h4>Objectives</h4>
                <div className="objectives-list">
                  {selectedQuest.objectives.map((objective, idx) => (
                    <div key={idx} className={`objective-item ${objective.completed ? 'completed' : ''}`}>
                      <span className="objective-check">{objective.completed ? '✓' : '○'}</span>
                      <span className="objective-text">{objective.text || objective.description || 'Objective'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedQuest.reward_xp || selectedQuest.reward_gold || selectedQuest.reward_items) && (
              <div className="rewards-section">
                <h4>Rewards</h4>
                <div className="rewards-list">
                  {selectedQuest.reward_xp > 0 && (
                    <div className="reward-item">
                      <span className="reward-icon">⭐</span>
                      <span>{selectedQuest.reward_xp} XP</span>
                    </div>
                  )}
                  {selectedQuest.reward_gold > 0 && (
                    <div className="reward-item">
                      <span className="reward-icon">💰</span>
                      <span>{selectedQuest.reward_gold} gold</span>
                    </div>
                  )}
                  {selectedQuest.reward_items && (
                    <div className="reward-item">
                      <span className="reward-icon">🎁</span>
                      <span>{selectedQuest.reward_items}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
