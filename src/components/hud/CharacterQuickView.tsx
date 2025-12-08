import React from 'react';
import { useCombatStore } from '../../stores/combatStore';

/**
 * Displays details for the currently Selected Entity (Target).
 * Connects to `combatStore.selectedEntityId`.
 */
export const CharacterQuickView: React.FC = () => {
    const selectedEntityId = useCombatStore(s => s.selectedEntityId);
    const entities = useCombatStore(s => s.entities);
    
    // Find the selected entity
    const entity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;
    
    if (!entity) return null;

    const meta = entity.metadata;
    
    return (
        <div className="bg-black/80 border border-white/20 rounded-lg p-4 w-64 backdrop-blur-md shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-lg">{entity.name}</h3>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                   entity.type === 'character' ? 'bg-green-900 text-green-300' :
                   entity.type === 'monster' ? 'bg-red-900 text-red-300' : 
                   'bg-gray-700 text-gray-300'
                }`}>
                   {entity.type}
                </span>
            </div>
            
            {/* HP & AC */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-xs text-white/50 mb-1">HP</div>
                    <div className="font-mono text-xl text-green-400">
                        {meta.hp.current} <span className="text-sm text-gray-500">/ {meta.hp.max}</span>
                    </div>
                </div>
                <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-xs text-white/50 mb-1">AC</div>
                    <div className="font-mono text-xl text-blue-300">
                        {meta.ac}
                    </div>
                </div>
            </div>
            
            {/* Conditions */}
            {meta.conditions && meta.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {meta.conditions.map(c => (
                        <span 
                            key={c} 
                            title={c}
                            className="text-[10px] bg-yellow-900/50 text-yellow-200 border border-yellow-700/50 px-2 py-0.5 rounded-full cursor-help"
                        >
                           {c}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
