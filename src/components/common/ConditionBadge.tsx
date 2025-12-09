import React from 'react';
import { CharacterCondition } from '../../stores/gameStateStore';

const CONDITION_COLORS: Record<string, string> = {
  'blinded': 'bg-gray-600',
  'charmed': 'bg-pink-600',
  'deafened': 'bg-gray-500',
  'frightened': 'bg-purple-600',
  'grappled': 'bg-yellow-600',
  'incapacitated': 'bg-red-800',
  'invisible': 'bg-blue-400/50',
  'paralyzed': 'bg-yellow-700',
  'petrified': 'bg-stone-500',
  'poisoned': 'bg-green-600',
  'prone': 'bg-amber-600',
  'restrained': 'bg-orange-600',
  'stunned': 'bg-yellow-500',
  'unconscious': 'bg-red-900',
  'exhaustion': 'bg-gray-700',
  'blessed': 'bg-yellow-400',
  'hasted': 'bg-cyan-500',
  'concentrating': 'bg-blue-500',
};

function getConditionColor(conditionName: string): string {
  const lower = conditionName.toLowerCase();
  return CONDITION_COLORS[lower] || 'bg-terminal-green/40';
}

interface ConditionBadgeProps {
  condition: CharacterCondition;
  size?: 'sm' | 'md';
}

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({ condition, size = 'md' }) => {
  const baseClasses = "inline-flex items-center font-medium rounded text-white transition-colors duration-200";
  const sizeClasses = size === 'sm' 
    ? "px-1 text-[10px] leading-tight" 
    : "px-2 py-1 text-xs";

  return (
    <span
      className={`${baseClasses} ${sizeClasses} ${getConditionColor(condition.name)}`}
      title={condition.source ? `Source: ${condition.source}\nDuration: ${condition.duration || 'Permanent'}` : undefined}
    >
      {condition.name}
      {condition.duration && condition.duration > 0 && (
        <span className="ml-1 opacity-75">({condition.duration}r)</span>
      )}
    </span>
  );
};

export const ConditionList: React.FC<{ conditions: CharacterCondition[], size?: 'sm' | 'md', limit?: number }> = ({ 
  conditions, 
  size = 'md',
  limit
}) => {
  if (!conditions || conditions.length === 0) return null;

  const displayConditions = limit ? conditions.slice(0, limit) : conditions;
  const remaining = limit ? conditions.length - limit : 0;

  return (
    <div className="inline-flex flex-wrap gap-1">
      {displayConditions.map((condition, idx) => (
        <ConditionBadge key={`${condition.name}-${idx}`} condition={condition} size={size} />
      ))}
      {remaining > 0 && (
        <span className={`text-terminal-green/60 ${size === 'sm' ? 'text-[10px]' : 'text-xs'} self-center`}>
          +{remaining}
        </span>
      )}
    </div>
  );
};
