import React, { useState } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { v4 as uuidv4 } from 'uuid';

export const NotesView: React.FC = () => {
  const notes = useGameStateStore((state) => state.notes);
  const quests = useGameStateStore((state) => state.quests);
  const addNote = useGameStateStore((state) => state.addNote);
  const deleteNote = useGameStateStore((state) => state.deleteNote);
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'quests' | 'notes'>('quests');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    addNote({
      id: uuidv4(),
      title: 'New Note',
      content: newNoteContent,
      author: 'player',
      timestamp: Date.now()
    });

    setNewNoteContent('');
    setIsAdding(false);
  };

  // Filter out quest notes (we display quests directly from the quests store)
  const playerNotes = notes.filter(n => !n.id.startsWith('quest-'));

  return (
    <div className="h-full flex flex-col p-4 font-mono text-terminal-green overflow-hidden">
      {/* Tab Header */}
      <div className="flex gap-4 mb-4 border-b border-terminal-green-dim pb-2">
        <button
          onClick={() => setActiveTab('quests')}
          className={`text-lg font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'quests' 
              ? 'text-terminal-green text-glow' 
              : 'text-terminal-green/50 hover:text-terminal-green/80'
          }`}
        >
          Quests ({quests.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`text-lg font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'notes' 
              ? 'text-terminal-green text-glow' 
              : 'text-terminal-green/50 hover:text-terminal-green/80'
          }`}
        >
          Field Notes ({playerNotes.length})
        </button>
        
        {activeTab === 'notes' && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="ml-auto px-3 py-1 border border-terminal-green text-xs uppercase hover:bg-terminal-green hover:text-terminal-black transition-colors"
          >
            {isAdding ? 'Cancel' : '+ Add Note'}
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {activeTab === 'notes' && isAdding && (
        <form onSubmit={handleAddNote} className="mb-4">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Enter observation data..."
            className="w-full bg-terminal-black border border-terminal-green p-2 text-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green h-24 resize-none"
            autoFocus
          />
          <button
            type="submit"
            className="w-full mt-2 bg-terminal-green/10 border border-terminal-green py-1 hover:bg-terminal-green hover:text-terminal-black transition-colors uppercase text-sm"
          >
            Save Entry
          </button>
        </form>
      )}

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto space-y-3 pr-2">
        {activeTab === 'quests' ? (
          /* Quest List */
          quests.length === 0 ? (
            <div className="text-center opacity-50 py-8 italic">
              [NO_ACTIVE_QUESTS]
            </div>
          ) : (
            quests.map((quest) => (
              <div
                key={quest.id}
                className="border border-terminal-green-dim bg-terminal-black/30 p-3"
              >
                {/* Quest Header */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-terminal-green-bright">
                    {quest.status === 'completed' ? '✅' : quest.status === 'failed' ? '❌' : '📜'} {quest.title || quest.name}
                  </h3>
                  <span className={`text-xs uppercase px-2 py-0.5 rounded ${
                    quest.status === 'completed' ? 'bg-green-700 text-green-100' :
                    quest.status === 'failed' ? 'bg-red-700 text-red-100' :
                    'bg-terminal-amber text-terminal-black'
                  }`}>
                    {quest.status}
                  </span>
                </div>
                
                {/* Quest Giver */}
                {quest.questGiver && (
                  <div className="text-xs text-terminal-green/60 mb-2">
                    Given by: {quest.questGiver}
                  </div>
                )}
                
                {/* Description */}
                <p className="text-sm opacity-80 mb-3">{quest.description}</p>
                
                {/* Objectives */}
                {quest.objectives.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs uppercase text-terminal-green/60 mb-1">Objectives:</div>
                    <div className="space-y-1 pl-2">
                      {quest.objectives.map((obj) => (
                        <div 
                          key={obj.id} 
                          className={`text-sm flex items-start gap-2 ${obj.completed ? 'text-green-400 line-through opacity-60' : ''}`}
                        >
                          <span className="flex-shrink-0">{obj.completed ? '✓' : '○'}</span>
                          <span className="flex-grow">{obj.description}</span>
                          <span className="text-xs opacity-60">{obj.progress || `${obj.current}/${obj.required}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Rewards */}
                {(quest.rewards?.experience || quest.rewards?.gold || (quest.rewards?.items && quest.rewards.items.length > 0)) && (
                  <div className="border-t border-terminal-green-dim pt-2 mt-2">
                    <div className="text-xs uppercase text-terminal-green/60 mb-1">Rewards:</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {quest.rewards.experience ? (
                        <span className="text-terminal-cyan">⭐ {quest.rewards.experience} XP</span>
                      ) : null}
                      {quest.rewards.gold ? (
                        <span className="text-terminal-amber">💰 {quest.rewards.gold} gold</span>
                      ) : null}
                      {quest.rewards.items?.map((item, i) => (
                        <span key={i} className="text-terminal-green">📦 {item}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          /* Player Notes */
          playerNotes.length === 0 ? (
            <div className="text-center opacity-50 py-8 italic">
              [NO_DATA_RECORDED]
            </div>
          ) : (
            playerNotes.map((note) => (
              <div
                key={note.id}
                className="border border-terminal-green-dim bg-terminal-black/30 p-3 relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-terminal-green-bright">
                    {note.title}
                  </span>
                  <span className="text-xs opacity-50">
                    {new Date(note.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap opacity-90 text-sm">
                  {note.content}
                </div>
                
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity text-xs"
                  title="Delete Note"
                >
                  [DELETE]
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
