import React from 'react';
import { useUIStore, ActiveTab } from '../../stores/uiStore';
import { BattlemapCanvas } from '../viewport/BattlemapCanvas';
import { InventoryView } from '../viewport/InventoryView';
import { WorldStateView } from '../viewport/WorldStateView';
import { NotesView } from '../viewport/NotesView';
import { CharacterHeader } from '../viewport/CharacterHeader';
import { CharacterSheetView } from '../viewport/CharacterSheetView';

interface MainViewportProps {
  className?: string;
}

export const MainViewport: React.FC<MainViewportProps> = ({ className }) => {
  const { activeTab, setActiveTab } = useUIStore();

  const renderContent = () => {
    switch (activeTab) {
      case '3d':
        return <BattlemapCanvas />;
      case 'character':
        return <CharacterSheetView />;
      case 'inventory':
        return <InventoryView />;
      case 'world':
        return <WorldStateView />;
      case 'notes':
        return <NotesView />;
      default:
        return <div>Unknown View</div>;
    }
  };

  const TabButton = ({ tab, label }: { tab: ActiveTab; label: string }) => (
    <button
      className={`px-4 py-2 font-medium transition-all duration-200 uppercase tracking-wider text-sm border-t-2 ${
        activeTab === tab
          ? 'bg-terminal-black text-terminal-green border-terminal-green border-x'
          : 'bg-terminal-dim text-terminal-green/40 border-transparent hover:text-terminal-green hover:bg-terminal-dim/80'
      }`}
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </button>
  );

  return (
    <div className={`flex flex-col bg-terminal-black h-full border-l border-terminal-green-dim ${className || ''}`}>
      {/* Tab Bar */}
      <div className="flex space-x-1 bg-terminal-dim px-2 pt-2 border-b border-terminal-green-dim">
        <TabButton tab="3d" label="VISUALIZER" />
        <TabButton tab="character" label="CHARACTER" />
        <TabButton tab="inventory" label="INVENTORY" />
        <TabButton tab="world" label="WORLD" />
        <TabButton tab="notes" label="NOTES" />
      </div>

      {/* Character Header */}
      <CharacterHeader />

      {/* Content Area */}
      <div className={`flex-1 text-terminal-green font-mono flex relative overflow-hidden ${activeTab === '3d' ? '' : 'bg-terminal-black'}`}>
        {/* CRT Grid Effect Background - Only for 3D view or if we want it everywhere */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-10"
             style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #003300 25%, #003300 26%, transparent 27%, transparent 74%, #003300 75%, #003300 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #003300 25%, #003300 26%, transparent 27%, transparent 74%, #003300 75%, #003300 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};