
import React, { useState } from 'react';
import type { CustomEffect } from '../../stores/gameStateStore';

interface CustomEffectsDisplayProps {
  effects: CustomEffect[];
  className?: string;
}

const CATEGORY_CONFIG = {
  boon: {
    label: 'BOONS',
    icon: '🌟',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-600/30'
  },
  curse: {
    label: 'CURSES',
    icon: '💀',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-600/30'
  },
  transformative: {
    label: 'TRANSFORMATIONS',
    icon: '🔮',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-600/30'
  },
  neutral: {
    label: 'EFFECTS',
    icon: '⚖️',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/30',
    borderColor: 'border-gray-600/30'
  }
};

const CustomEffectsDisplay: React.FC<CustomEffectsDisplayProps> = ({ effects, className = '' }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!effects || effects.length === 0) return null;

  const groupedEffects = effects.reduce((acc, effect) => {
    const cat = effect.category || 'neutral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(effect);
    return acc;
  }, {} as Record<string, CustomEffect[]>);

  const categories = Object.keys(groupedEffects).sort((a, b) => {
    // Order: Curse, Boon, Transformation, Neutral
    const order = { curse: 0, boon: 1, transformative: 2, neutral: 3 };
    return (order[a as keyof typeof order] ?? 4) - (order[b as keyof typeof order] ?? 4);
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {categories.map(category => {
        const items = groupedEffects[category];
        const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.neutral;

        return (
          <div key={category} className={`border ${config.borderColor} rounded-lg overflow-hidden`}>
            <div className={`px-3 py-2 ${config.bgColor} border-b ${config.borderColor} flex items-center justify-between`}>
              <span className={`font-bold ${config.color} flex items-center gap-2`}>
                <span>{config.icon}</span>
                {config.label}
              </span>
              <span className="text-xs opacity-60 font-mono">{items.length} ACTIVE</span>
            </div>
            
            <div className="divide-y divide-gray-700/30">
              {items.map(effect => (
                <div key={effect.id} className="bg-black/20">
                  <div 
                    className="p-3 cursor-pointer hover:bg-white/5 transition-colors flex justify-between items-start"
                    onClick={() => setExpandedId(expandedId === effect.id ? null : effect.id)}
                  >
                    <div>
                      <div className={`font-bold ${config.color} mb-1 flex items-center gap-2`}>
                        {effect.name}
                        {effect.power_level > 0 && (
                          <span className="text-[10px] opacity-70 tracking-widest">
                            {Array(effect.power_level).fill('★').join('')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-[250px]">
                        {effect.source_type} • {effect.duration_type} 
                        {effect.rounds_remaining ? ` (${effect.rounds_remaining} rounds)` : ''}
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs">
                       {expandedId === effect.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {expandedId === effect.id && (
                    <div className="px-3 pb-3 pt-0 text-sm animate-fadeIn">
                       <p className="text-gray-300 italic mb-2 border-l-2 border-gray-600 pl-2 text-xs">
                         {effect.description || 'No description available.'}
                       </p>
                       
                       {effect.mechanics && effect.mechanics.length > 0 && (
                         <div className="space-y-1 bg-black/40 p-2 rounded text-xs font-mono">
                           {effect.mechanics.map((mech: any, i: number) => (
                             <div key={i} className="flex gap-2">
                               <span className="text-terminal-green">[{mech.type}]</span>
                               <span className="text-gray-400">{mech.value}</span>
                               {mech.condition && <span className="text-gray-500 italic">({mech.condition})</span>}
                             </div>
                           ))}
                         </div>
                       )}
                       
                       <div className="mt-2 text-[10px] text-gray-600 flex justify-between">
                          <span>Source: {effect.source_entity_name || 'Unknown'}</span>
                          <span>ID: {effect.id}</span>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CustomEffectsDisplay;
