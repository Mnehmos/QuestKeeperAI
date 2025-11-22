import React, { useState } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { v4 as uuidv4 } from 'uuid';

export const NotesView: React.FC = () => {
  const notes = useGameStateStore((state) => state.notes);
  const addNote = useGameStateStore((state) => state.addNote);
  const deleteNote = useGameStateStore((state) => state.deleteNote);
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div className="h-full flex flex-col p-4 font-mono text-terminal-green overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-terminal-green-dim pb-2">
        <h2 className="text-xl font-bold uppercase tracking-wider text-glow">
          Field Notes
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1 border border-terminal-green text-xs uppercase hover:bg-terminal-green hover:text-terminal-black transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Note'}
        </button>
      </div>

      {isAdding && (
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

      <div className="flex-grow overflow-y-auto space-y-3 pr-2">
        {notes.length === 0 ? (
          <div className="text-center opacity-50 py-8 italic">
            [NO_DATA_RECORDED]
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="border border-terminal-green-dim bg-terminal-black/30 p-3 relative group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs uppercase px-1 rounded ${
                  note.author === 'ai' ? 'bg-terminal-cyan text-terminal-black' : 'bg-terminal-amber text-terminal-black'
                }`}>
                  {note.author === 'ai' ? 'SYSTEM' : 'PLAYER'}
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
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                title="Delete Note"
              >
                <span className="codicon codicon-trash" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
