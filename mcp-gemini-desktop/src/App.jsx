import React, { useEffect, useState } from 'react';
import { CharacterSheet } from './components/CharacterSheet';
import { Inventory } from './components/Inventory';
import { QuestLog } from './components/QuestLog';
import { ToolOutputPanel } from './components/ToolOutputPanel';
import { ChatInterface } from './components/ChatInterface';
import { ConversationList } from './components/ConversationList';
import { useGameStore } from './stores/gameState';
import './styles/global.css';
import './App.css';

function App() {
  const character = useGameStore((state) => state.character);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const setAvailableTools = useGameStore((state) => state.setAvailableTools);
  const [activePanel, setActivePanel] = useState('inventory');

  useEffect(() => {
    // Fetch available tools on startup
    fetchTools();

    // Load saved character if any
    loadCharacter();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/mcp/tools');
      const data = await response.json();
      if (data.status === 'success') {
        setAvailableTools(data.tools);
      }
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    }
  };

  const loadCharacter = async () => {
    try {
      // Try to load the first character (for demo purposes)
      const response = await fetch('http://localhost:5001/api/characters');
      const data = await response.json();
      if (data.status === 'success' && data.characters.length > 0) {
        setCharacter(data.characters[0]);
      }
    } catch (error) {
      console.error('Failed to load character:', error);
    }
  };

  const handleSettingsClick = () => {
    // Open settings dialog via Electron IPC
    if (window.electronAPI && window.electronAPI.openSettingsDialog) {
      window.electronAPI.openSettingsDialog();
    } else {
      console.warn('Settings dialog not available in this environment');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">🎲</span>
            QuestKeeperAI
          </h1>
          <span className="app-subtitle">D&D 5e AI Assistant</span>
        </div>
        <div className="header-right">
          <button className="header-btn" title="Settings" onClick={handleSettingsClick}>
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-main">
        {/* Conversations Sidebar (Far Left) */}
        <aside className="sidebar-conversations">
          <ConversationList />
        </aside>

        {/* Left Sidebar - Character */}
        <aside className="sidebar-left">
          <CharacterSheet character={character} />
          <div className="sidebar-panels">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${activePanel === 'inventory' ? 'active' : ''}`}
                onClick={() => setActivePanel('inventory')}
              >
                🎒 Inventory
              </button>
              <button
                className={`panel-tab ${activePanel === 'quests' ? 'active' : ''}`}
                onClick={() => setActivePanel('quests')}
              >
                📜 Quests
              </button>
            </div>
            <div className="panel-content">
              {activePanel === 'inventory' && <Inventory />}
              {activePanel === 'quests' && <QuestLog />}
            </div>
          </div>
        </aside>

        {/* Center - Chat */}
        <main className="main-chat">
          <ChatInterface />
        </main>

        {/* Right Sidebar - Tool Outputs */}
        <aside className="sidebar-right">
          <ToolOutputPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
