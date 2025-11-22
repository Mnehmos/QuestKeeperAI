import React, { useState } from 'react';
import { ChatHistory } from '../terminal/ChatHistory';
import { ChatInput } from '../terminal/ChatInput';
import { ChatSidebar } from '../terminal/ChatSidebar';
import { SettingsModal } from '../settings/SettingsModal';

interface TerminalPanelProps {
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ className }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`border-r border-terminal-green-dim bg-terminal-black text-terminal-green flex ${className || ''}`}>
      {/* Sidebar */}
      {isSidebarOpen && <ChatSidebar />}

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-terminal-green-dim p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-terminal-green hover:text-terminal-green-bright"
              title="Toggle Sidebar"
            >
              <span className="codicon codicon-menu" />
            </button>
            <h2 className="text-xl font-bold text-glow uppercase tracking-wider">Terminal_Panel</h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-terminal-green hover:text-terminal-green-bright"
            title="Settings"
          >
            [CONFIG]
          </button>
        </div>
        <ChatHistory />
        <ChatInput />
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};