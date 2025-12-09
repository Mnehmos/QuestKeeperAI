import React, { useState } from 'react';
import type { CharacterCondition } from '../../stores/gameStateStore';

// Standard D&D 5e conditions for quick selection
const STANDARD_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion'
];

// Color mappings for conditions  
const CONDITION_COLORS: Record<string, string> = {
  blinded: 'bg-gray-600',
  charmed: 'bg-pink-600',
  deafened: 'bg-slate-600',
  frightened: 'bg-purple-600',
  grappled: 'bg-orange-600',
  incapacitated: 'bg-gray-700',
  invisible: 'bg-blue-400/50',
  paralyzed: 'bg-yellow-600',
  petrified: 'bg-stone-600',
  poisoned: 'bg-green-600',
  prone: 'bg-amber-700',
  restrained: 'bg-red-700',
  stunned: 'bg-yellow-500',
  unconscious: 'bg-gray-800',
  exhaustion: 'bg-orange-800',
  concentrating: 'bg-blue-600',
  flying: 'bg-sky-500',
  hidden: 'bg-slate-700',
};

interface ConditionsDisplayProps {
  conditions: CharacterCondition[];
  onAddCondition: (condition: CharacterCondition) => Promise<void>;
  onRemoveCondition: (conditionName: string) => Promise<void>;
  readOnly?: boolean;
}

export const ConditionsDisplay: React.FC<ConditionsDisplayProps> = ({
  conditions,
  onAddCondition,
  onRemoveCondition,
  readOnly = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [customCondition, setCustomCondition] = useState('');

  const handleAddStandard = async (name: string) => {
    await onAddCondition({ name });
    setIsAdding(false);
  };

  const handleAddCustom = async () => {
    if (customCondition.trim()) {
      await onAddCondition({ name: customCondition.trim() });
      setCustomCondition('');
      setIsAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    await onRemoveCondition(name);
  };

  const getConditionColor = (name: string) => {
    return CONDITION_COLORS[name.toLowerCase()] || 'bg-gray-600';
  };

  return (
    <div className="border border-terminal-green/30 p-4 rounded">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-terminal-green">CONDITIONS</h3>
        {!readOnly && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs px-2 py-1 border border-terminal-green text-terminal-green hover:bg-terminal-green/10 transition-colors rounded"
          >
            {isAdding ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {/* Add Condition Panel */}
      {isAdding && (
        <div className="mb-4 p-3 bg-terminal-green/5 border border-terminal-green/20 rounded">
          <div className="text-xs text-terminal-green/60 mb-2 uppercase">Quick Add:</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {STANDARD_CONDITIONS.map((cond) => (
              <button
                key={cond}
                onClick={() => handleAddStandard(cond)}
                disabled={conditions.some(c => c.name.toLowerCase() === cond.toLowerCase())}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  conditions.some(c => c.name.toLowerCase() === cond.toLowerCase())
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={customCondition}
              onChange={(e) => setCustomCondition(e.target.value)}
              placeholder="Custom condition..."
              className="flex-1 bg-gray-900 border border-terminal-green/30 text-terminal-green px-2 py-1 text-sm rounded focus:outline-none focus:border-terminal-green"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            />
            <button
              onClick={handleAddCustom}
              disabled={!customCondition.trim()}
              className="px-3 py-1 bg-terminal-green text-black text-sm font-bold rounded hover:bg-terminal-green-bright disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <div className="text-terminal-green/40 italic text-sm">No active conditions</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {conditions.map((condition, idx) => (
            <div
              key={`${condition.name}-${idx}`}
              className={`group relative inline-flex items-center gap-1 px-2 py-1 rounded text-white text-sm ${getConditionColor(condition.name)}`}
            >
              <span>{condition.name}</span>
              {condition.duration && condition.duration > 0 && (
                <span className="text-xs opacity-75">({condition.duration}r)</span>
              )}
              {!readOnly && (
                <button
                  onClick={() => handleRemove(condition.name)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white"
                  title="Remove condition"
                >
                  ×
                </button>
              )}
              {condition.source && (
                <span className="absolute -bottom-5 left-0 text-[10px] text-terminal-green/60 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  from: {condition.source}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
