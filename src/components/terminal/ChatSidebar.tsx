import React from 'react';
import { useChatStore } from '../../stores/chatStore';

export const ChatSidebar: React.FC = () => {
  const sessions = useChatStore((state) => state.sessions);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const switchSession = useChatStore((state) => state.switchSession);
  const createSession = useChatStore((state) => state.createSession);
  const deleteSession = useChatStore((state) => state.deleteSession);

  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    sessionId: string;
  } | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sessionId,
    });
  };

  const handleNewChat = () => {
    createSession();
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent triggering session switch
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteSession(sessionId);
      setContextMenu(null); // Close the context menu
    }
  };

  return (
    <div className="w-64 bg-terminal-black border-r border-terminal-green-dim flex flex-col h-full relative">
      {/* Header */}
      <div className="p-4 border-b border-terminal-green-dim">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-all duration-200 uppercase tracking-wider font-bold text-sm"
        >
          <span className="codicon codicon-add" />
          New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => switchSession(session.id)}
            onContextMenu={(e) => handleContextMenu(e, session.id)}
            className={`group relative p-3 rounded cursor-pointer transition-colors border ${
              currentSessionId === session.id
                ? 'bg-terminal-green/10 border-terminal-green text-terminal-green'
                : 'border-transparent hover:bg-terminal-green/5 hover:border-terminal-green-dim text-terminal-green/70'
            }`}
          >
            <div className="pr-6 truncate font-mono text-sm">
              {session.title || 'New Chat'}
            </div>
            <div className="text-xs opacity-50 mt-1">
              {new Date(session.updatedAt).toLocaleDateString()}
            </div>

            {/* Delete Button (Hover) */}
            <button
              onClick={(e) => handleDeleteSession(e, session.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
              title="Delete Chat"
            >
              <span className="codicon codicon-trash" />
            </button>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center text-terminal-green/30 py-8 text-sm italic">
            No active chats
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-terminal-black border border-terminal-green shadow-lg rounded py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={(e) => handleDeleteSession(e, contextMenu.sessionId)}
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-terminal-green/10 flex items-center gap-2"
          >
            <span className="codicon codicon-trash" />
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
};
