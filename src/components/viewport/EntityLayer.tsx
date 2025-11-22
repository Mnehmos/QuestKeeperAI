import React from 'react';
import { useCombatStore } from '../../stores/combatStore';
import { Token } from './Token';

export const EntityLayer: React.FC = () => {
  const entities = useCombatStore((state) => state.entities);
  const selectedEntityId = useCombatStore((state) => state.selectedEntityId);

  return (
    <group>
      {entities.map((entity) => (
        <Token
          key={entity.id}
          entity={entity}
          isSelected={entity.id === selectedEntityId}
        />
      ))}
    </group>
  );
};