/**
 * CreatureLibrary.test.tsx
 * TDD tests for the creature model library
 */
import { describe, it, expect } from 'vitest';
import { MODEL_REGISTRY, getModelDefinition, inferModelTagFromName } from './modelRegistry';
import { CREATURE_COMPONENTS, getCreatureComponent } from './CreatureLibrary';

describe('modelRegistry', () => {
  it('should have 25 creature definitions', () => {
    expect(Object.keys(MODEL_REGISTRY).length).toBe(25);
  });

  it('should return model definition for valid tag', () => {
    const knight = getModelDefinition('knight');
    expect(knight).toBeDefined();
    expect(knight?.baseArchetype).toBe('humanoid');
    expect(knight?.defaultColor).toBe('#c0c0c0');
  });

  it('should return undefined for invalid tag', () => {
    expect(getModelDefinition('nonexistent')).toBeUndefined();
  });

  it('should infer model tag from creature name', () => {
    expect(inferModelTagFromName('Goblin Archer')).toBe('goblin');
    expect(inferModelTagFromName('Ancient Red Dragon')).toBe('dragon');
    expect(inferModelTagFromName('Fire Elemental')).toBe('fire_elemental');
  });
});

describe('CreatureLibrary', () => {
  it('should export CREATURE_COMPONENTS map with 25 entries', () => {
    expect(Object.keys(CREATURE_COMPONENTS).length).toBe(25);
  });

  it('should have a component for each modelRegistry entry', () => {
    for (const tag of Object.keys(MODEL_REGISTRY)) {
      expect(CREATURE_COMPONENTS[tag]).toBeDefined();
    }
  });

  it('getCreatureComponent returns correct component for valid tag', () => {
    const KnightComponent = getCreatureComponent('knight');
    expect(KnightComponent).toBeDefined();
  });

  it('getCreatureComponent returns null for invalid tag', () => {
    expect(getCreatureComponent('nonexistent')).toBeNull();
  });
});
