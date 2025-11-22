# Phase 3.5: Interaction Design & Data Model Refinement

## 1. Overview
This phase refines the 3D Visualizer from a passive display into an interactive, data-rich interface. It defines the schema for "programmable" entities and specifies the UI patterns for displaying this data via retro-futuristic HUD tooltips.

## 2. Extended Entity Schema
To support rich RPG data, the flat `Entity` interface in `combatStore.ts` will be extended with a flexible `metadata` object. This separates core 3D rendering props from game-specific data.

### 2.1 Interface Definition
```typescript
export interface EntityMetadata {
  // Core Stats
  hp: {
    current: number;
    max: number;
    temp?: number;
  };
  ac: number;
  
  // Identity
  creatureType: string; // e.g., "Humanoid (Elf)", "Construct", "Undead"
  
  // State
  conditions: string[]; // e.g., ["Prone", "Blinded", "Concentrating"]
  
  // Detailed Stats (Optional, for full inspection)
  stats?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  
  // Narrative/Flavor
  description?: string;
  notes?: string;
}

export interface Entity {
  // Existing 3D Props
  id: string;
  name: string;
  type: 'character' | 'npc' | 'monster';
  size: CreatureSize;
  position: Vector3;
  color: string;
  model?: string;

  // New Metadata Container
  metadata: EntityMetadata;
}
```

## 3. Tooltip UI Design
The Tooltip acts as a "Heads-Up Display" (HUD) overlay for the selected entity. It should feel like a tactical scan result on a sci-fi terminal.

### 3.1 Technical Implementation
-   **Library:** `@react-three/drei` -> `<Html>` component.
-   **Positioning:** anchored to the `Token` mesh, with `center` prop to offset it slightly above the model.
-   **Visibility:**
    -   Rendered ONLY when `isSelected === true`.
    -   Optional: "Hover" state shows a minimal version (Name + HP bar only).

### 3.2 Visual Style ("Retro-Futuristic HUD")
-   **Container:**
    -   Background: Semi-transparent black (`rgba(0, 10, 0, 0.85)`).
    -   Border: 1px solid Neon Green (`#00ff00`) or Amber (`#ffb000`).
    -   Effect: CSS `box-shadow` for glow.
-   **Layout (Data Grid):**
    -   **Header:** Entity Name (Bold, Uppercase) | Type (Small, Italic).
    -   **Bar Row:** HP Bar (Segmented blocks or continuous gradient).
    -   **Stats Row:** `AC: 15` | `HP: 12/20` | `COND: Prone`.
    -   **Footer:** "Scanning..." or decorative hex codes.
-   **Decoration:**
    -   CSS scanlines overlay (repeating linear-gradient).
    -   Corner brackets (SVG or CSS pseudo-elements).

### 3.3 Mockup Structure
```tsx
<Html position={[0, units * 1.5, 0]} center>
  <div className="hud-tooltip pointer-events-none select-none">
    <div className="hud-header">
      <span className="text-neon-green font-bold">{name}</span>
      <span className="text-xs text-neon-dim">{metadata.creatureType}</span>
    </div>
    
    <div className="hud-body grid grid-cols-2 gap-2 text-sm">
      <div className="col-span-2">
        <HealthBar current={metadata.hp.current} max={metadata.hp.max} />
      </div>
      <div className="text-neon-amber">AC: {metadata.ac}</div>
      <div className="text-neon-blue">
        {metadata.conditions.map(c => <span key={c} className="badge">{c}</span>)}
      </div>
    </div>
  </div>
</Html>
```

## 4. LLM Interaction Pattern
The LLM (Orchestrator/Worker) manipulates the scene via "Tool Calls" that map directly to `combatStore` actions.

### 4.1 Tool: `spawn_entity`
-   **LLM Input:**
    ```json
    {
      "name": "Goblin Archer",
      "type": "monster",
      "size": "small",
      "hp": 7,
      "ac": 15,
      "position": { "x": 5, "z": 5 }
    }
    ```
-   **Store Action:** `addEntity(entity)`
    -   Generates UUID.
    -   Maps flat inputs to nested `metadata` schema.
    -   Assigns default color based on `type`.

### 4.2 Tool: `update_entity_stats`
-   **LLM Input:**
    ```json
    {
      "id": "goblin-1-uuid",
      "updates": {
        "hp": { "current": 0 },
        "conditions": ["Dead"]
      }
    }
    ```
-   **Store Action:** `updateEntity(id, partial_metadata)`
    -   Merges `updates` deeply into the existing `metadata`.
    -   Triggers React re-render of the specific `Token` and its tooltip.

### 4.3 Tool: `inspect_entity` (LLM Query)
-   **Action:** LLM requests current state of an entity.
-   **Return:** Full JSON dump of the `Entity` object including `position` and `metadata` for reasoning context.

## 5. Next Steps
1.  Update `src/stores/combatStore.ts` with the new `Entity` and `EntityMetadata` interfaces.
2.  Update `src/components/viewport/Token.tsx` to include the `<Html>` tooltip.
3.  Implement the CSS styles for the HUD in `src/App.css`.