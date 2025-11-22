# LLM Tool Mappings & Execution Architecture

## Overview

This document defines the "Bridge" layer between the LLM (The Brain) and the 3D Visualization (The Body). The system is designed to be programmable: the LLM outputs structured JSON "tool calls," and the frontend executes these calls to update the `combatStore`.

## Flow

1.  **User Input**: "Spawn a goblin at (5,5) and move the hero to (2,2)."
2.  **LLM Processing**: The LLM interprets the intent and generates a list of tool calls.
    ```json
    [
      {
        "tool": "spawn_entity",
        "args": { "name": "Goblin Grunt", "type": "monster", "position": { "x": 5, "y": 0, "z": 5 }, ... }
      },
      {
        "tool": "move_entity",
        "args": { "id": "hero-1", "position": { "x": 2, "y": 0, "z": 2 } }
      }
    ]
    ```
3.  **Execution**: The `ToolRegistry` iterates through this list and executes the corresponding functions.
4.  **State Update**: The `combatStore` updates, triggering a re-render of the 3D scene via React/Zustand.

## Tool Definitions

### 1. `spawn_entity`

Creates a new token on the battlemap.

*   **Trigger**: "Add a [monster/npc]", "Spawn a [creature]", "A wild [enemy] appears".
*   **Schema**:
    ```typescript
    {
      name: string;
      type: 'character' | 'npc' | 'monster';
      color: string; // Hex code
      size: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
      hp: { current: number; max: number };
      ac: number;
      position: { x: number; y: number; z: number };
    }
    ```

### 2. `move_entity`

Updates the position of an existing token.

*   **Trigger**: "Move [entity] to [location]", "[Entity] runs to [location]".
*   **Schema**:
    ```typescript
    {
      id: string; // The entity's unique ID
      position: { x: number; y: number; z: number };
    }
    ```

### 3. `update_stats`

Modifies the metadata of an entity (damage, healing, status effects).

*   **Trigger**: "[Entity] takes 5 damage", "[Entity] is prone", "Heal [entity] for 10".
*   **Schema**:
    ```typescript
    {
      id: string;
      hp?: { current: number; max: number; temp: number }; // Partial update allowed
      ac?: number;
      conditions?: string[]; // Replaces the entire list
    }
    ```

### 4. `delete_entity`

Removes a token from the board.

*   **Trigger**: "[Entity] dies", "Remove [entity]", "Clean up the dead bodies".
*   **Schema**:
    ```typescript
    {
      id: string;
    }
    ```

## Implementation Details

The mapping logic resides in `src/services/toolRegistry.ts`. This registry maps string keys (e.g., "spawn_entity") to executable functions that interact directly with `useCombatStore.getState()`.

### Future Expansion

*   **`roll_dice`**: To visualize dice rolls in 3D.
*   **`highlight_zone`**: To show spell effects or areas of interest.
*   **`camera_focus`**: To programmatically move the user's view.