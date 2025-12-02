import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { AdventureView } from '../adventure/AdventureView';
import { BattlemapCanvas } from '../viewport/BattlemapCanvas';
import { WorldMapCanvas } from '../viewport/WorldMapCanvas';
import { NotesView } from '../viewport/NotesView';
import { CharacterSheetView } from '../viewport/CharacterSheetView';
import { SettingsView } from '../viewport/SettingsView';

interface MainViewportProps {
  className?: string;
}

export const MainViewport: React.FC<MainViewportProps> = ({ className }) => {
  const { activeTab } = useUIStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'adventure':
        return <AdventureView />;
      case 'combat':
        return <BattlemapCanvas />;
      case 'character':
        return <CharacterSheetView />;
      case 'map':
        return <WorldMapCanvas />;
      case 'journal':
        return <NotesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <div className="p-8 text-center text-terminal-green">Unknown View Module</div>;
    }
  };

  return (
    <div className={`flex flex-col bg-terminal-black h-full border-l border-terminal-green-dim ${className || ''}`}>
      {/* Content Area */}
      <div className={`flex-1 text-terminal-green font-mono flex relative overflow-hidden ${activeTab === 'combat' ? '' : 'bg-terminal-black'}`}>
        {/* CRT Grid Effect Background - Only for 3D view */}
        {activeTab === 'combat' && (
          <div className="absolute inset-0 opacity-10 pointer-events-none z-10"
            style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #003300 25%, #003300 26%, transparent 27%, transparent 74%, #003300 75%, #003300 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #003300 25%, #003300 26%, transparent 27%, transparent 74%, #003300 75%, #003300 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};