import React, { useState } from 'react';
import { useGameStateStore, InventoryItem } from '../../stores/gameStateStore';

export const InventoryView: React.FC = () => {
  const inventory = useGameStateStore((state) => state.inventory);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  return (
    <div className="h-full flex flex-col p-4 font-mono text-terminal-green overflow-hidden">
      <style>{`
        .inventory-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 255, 65, 0.6) rgba(0, 255, 65, 0.1);
        }
        .inventory-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .inventory-scroll::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.15);
          border-radius: 5px;
          border: 1px solid rgba(0, 255, 65, 0.3);
        }
        .inventory-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.6);
          border-radius: 5px;
          border: 1px solid rgba(0, 255, 65, 0.8);
        }
        .inventory-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.9);
        }
      `}</style>
      
      <h2 className="text-xl font-bold mb-4 border-b border-terminal-green-dim pb-2 uppercase tracking-wider text-glow flex-shrink-0">
        Inventory Protocol
      </h2>

      <div 
        className="flex-1 min-h-0 overflow-y-scroll pr-2 inventory-scroll border-r-2 border-terminal-green/20" 
        tabIndex={-1}
        style={{ outline: 'none', maxHeight: '100%' }}
      >
        {inventory.length === 0 ? (
          <div className="text-center opacity-50 py-8 italic">
            [NO_ITEMS_DETECTED]
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pb-4">
            {inventory.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="border border-terminal-green-dim bg-terminal-black/50 p-3 hover:bg-terminal-green/10 hover:border-terminal-green transition-all cursor-pointer group rounded-sm active:bg-terminal-green/20"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <div className="font-bold text-terminal-green-bright flex items-center gap-2">
                      <span className="text-lg group-hover:text-white transition-colors">{item.name}</span>
                      {item.equipped && (
                        <span className="text-[10px] bg-terminal-green text-terminal-black px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                          Equipped
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-terminal-green/60 mt-1 uppercase tracking-wider">{item.type}</div>
                  </div>
                  <div className="text-right flex-shrink-0 bg-terminal-green/10 px-3 py-1 rounded group-hover:bg-terminal-green/20 transition-colors">
                    <div className="font-bold text-lg">x{item.quantity}</div>
                    {item.weight && (
                      <div className="text-xs opacity-50">{item.weight} lbs</div>
                    )}
                  </div>
                </div>
                {item.description && item.description !== item.name && (
                  <div className="text-sm mt-2 text-terminal-green/80 border-t border-terminal-green-dim/30 pt-2 italic truncate">
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-terminal-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-terminal-black border-2 border-terminal-green p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,255,0,0.2)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
              className="absolute top-2 right-2 text-terminal-green hover:text-white p-2"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <div className="text-xs text-terminal-green/60 uppercase tracking-wider mb-2">{selectedItem.type}</div>
              <h3 className="text-2xl font-bold text-white mb-2 text-glow">{selectedItem.name}</h3>
              {selectedItem.equipped && (
                <span className="inline-block bg-terminal-green text-terminal-black px-2 py-0.5 rounded uppercase font-bold text-xs tracking-wide">
                  Currently Equipped
                </span>
              )}
            </div>

            <div className="space-y-4 border-t border-terminal-green/30 pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-terminal-green/5 p-2 rounded">
                  <div className="text-xs opacity-60 uppercase">Quantity</div>
                  <div className="text-xl font-bold">{selectedItem.quantity}</div>
                </div>
                {selectedItem.weight ? (
                  <div className="bg-terminal-green/5 p-2 rounded">
                    <div className="text-xs opacity-60 uppercase">Weight</div>
                    <div className="text-xl font-bold">{selectedItem.weight} <span className="text-xs font-normal opacity-50">lbs</span></div>
                  </div>
                ) : (
                  <div className="bg-terminal-green/5 p-2 rounded opacity-50">
                    <div className="text-xs opacity-60 uppercase">Weight</div>
                    <div className="text-xl font-bold">-</div>
                  </div>
                )}
              </div>

              {selectedItem.description && selectedItem.description !== selectedItem.name ? (
                <div className="bg-terminal-green/5 p-4 rounded min-h-[100px]">
                  <div className="text-xs opacity-60 uppercase mb-2">Description</div>
                  <p className="text-terminal-green-bright leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>
              ) : (
                <div className="bg-terminal-green/5 p-4 rounded min-h-[100px] flex items-center justify-center text-terminal-green/40 italic">
                  No additional details available.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2 bg-terminal-green text-terminal-black font-bold uppercase tracking-wider hover:bg-white transition-colors rounded-sm"
              >
                Close Protocol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
