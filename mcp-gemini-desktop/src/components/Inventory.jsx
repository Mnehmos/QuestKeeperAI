import React, { useState } from 'react';
import { useGameStore } from '../stores/gameState';
import './Inventory.css';

const RARITY_COLORS = {
  common: '#e0e0e0',
  uncommon: '#1eff00',
  rare: '#0070dd',
  very_rare: '#a335ee',
  legendary: '#ff8000'
};

export function Inventory() {
  const inventory = useGameStore((state) => state.inventory);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const tabs = ['all', 'equipped', 'consumables', 'quest_items'];

  const filteredItems = inventory.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'equipped') return item.location === 'equipped';
    if (activeTab === 'consumables') return item.item_type === 'consumable';
    if (activeTab === 'quest_items') return item.mcp_managed;
    return true;
  });

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <h3>Inventory</h3>
        <div className="inventory-stats">
          <span className="item-count">{inventory.length} items</span>
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="inventory-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-inventory">
            <p>No items in this category</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className="item-card"
              style={{ borderColor: RARITY_COLORS[item.rarity] || '#00ff88' }}
              onClick={() => setSelectedItem(item)}
            >
              <div className="item-header">
                <span className="item-name">{item.item_name}</span>
                <span className="item-qty">×{item.quantity}</span>
              </div>
              <div className="item-type">{item.item_type || 'misc'}</div>
              <div className="item-rarity" style={{ color: RARITY_COLORS[item.rarity] || '#00ff88' }}>
                {item.rarity}
              </div>
              {item.weight && (
                <div className="item-weight">{item.weight} lb</div>
              )}
              {item.mcp_managed && (
                <div className="mcp-badge" title="Managed by MCP tool">
                  MCP
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedItem && (
        <div className="item-detail-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>
            <h3 style={{ color: RARITY_COLORS[selectedItem.rarity] || '#00ff88' }}>
              {selectedItem.item_name}
            </h3>
            <div className="item-description">
              {selectedItem.description || 'No description available.'}
            </div>
            <div className="item-stats">
              <div className="stat-row">
                <span className="stat-label">Type:</span>
                <span className="stat-value">{selectedItem.item_type || 'misc'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Quantity:</span>
                <span className="stat-value">{selectedItem.quantity}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Rarity:</span>
                <span className="stat-value" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
                  {selectedItem.rarity}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Location:</span>
                <span className="stat-value">{selectedItem.location}</span>
              </div>
              {selectedItem.weight && (
                <div className="stat-row">
                  <span className="stat-label">Weight:</span>
                  <span className="stat-value">{selectedItem.weight} lb</span>
                </div>
              )}
              {selectedItem.mcp_managed && (
                <div className="stat-row">
                  <span className="stat-label">Source:</span>
                  <span className="stat-value">{selectedItem.mcp_source || 'MCP'}</span>
                </div>
              )}
            </div>
            {selectedItem.properties && Object.keys(selectedItem.properties).length > 0 && (
              <div className="item-properties">
                <h4>Properties</h4>
                {Object.entries(selectedItem.properties).map(([key, value]) => (
                  <div key={key} className="property-row">
                    <span className="property-key">{key}:</span>
                    <span className="property-value">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
