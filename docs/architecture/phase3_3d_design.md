# Phase 3: 3D Visualizer Architecture (R3F)

## 1. Overview

The **Visualizer** is the 3D representation of the game state, displayed in the Right Panel of the application. It provides a tactical view of combat encounters, dungeon exploration, and world maps. It is **read-only** in terms of game logic (actions happen via Chat/LLM), but **interactive** in terms of viewing (camera control, entity selection).

**Aesthetic:**
- **Style:** Retro-Futuristic / Tactical Terminal.
- **Visuals:** Wireframe grids, glowing vector lines, CRT shader effects, low-poly or symbolic tokens.
- **Background:** Deep void or grid expanse; no realistic skyboxes.

## 2. Tech Stack & Dependencies

We will utilize the standard React ecosystem for 3D:

*   **Core:** `three` (Three.js)
*   **React Renderer:** `@react-three/fiber` (R3F)
*   **Helpers:** `@react-three/drei` (Camera controls, shapes, text, shaders)
*   **State:** `zustand` (already present)

## 3. State Management: `useCombatStore`

We need a dedicated store to manage the *visual* state of the combat. This store synchronizes with the `rpg-combat-engine` sidecar but is optimized for 60fps rendering.

```typescript
// src/stores/combatStore.ts (Draft Interface)

interface Vector3 { x: number; y: number; z: number }

interface Entity {
  id: string;
  name: string;
  type: 'character' | 'npc' | 'monster';
  position: Vector3;
  hp: { current: number; max: number };
  status: string[]; // e.g., "Stunned", "Hasted"
  model: string;    // primitive type: 'box', 'sphere', or 'custom_model_id'
  color: string;    // Hex color for tactical identification
}

interface CombatState {
  // State
  entities: Record<string, Entity>;
  gridDimensions: { width: number; height: number; cellSize: number };
  selectedEntityId: string | null;
  isLoading: boolean;

  // Actions
  setEntities: (entities: Entity[]) => void;
  updateEntityPosition: (id: string, position: Vector3) => void;
  selectEntity: (id: string | null) => void;
  
  // Thunks (async actions to talk to MCP)
  syncGameState: () => Promise<void>;
}
```

**Synchronization Strategy:**
1.  **Poll/Event:** When the Chat Log receives a "Move" or "Combat" event, it triggers `syncGameState()`.
2.  **Interpolation:** The R3F components will interpolate positions to smooth out the movement updates (using `drei/useFrame` or `framer-motion-3d`).

## 4. Component Hierarchy

```text
AppLayout
 └── MainViewport
      └── ThreeCanvas (R3F Canvas)
           ├── PostProcessing (CRT Scanlines, Bloom)
           ├── TacticalCamera (OrbitControls with limits)
           ├── AmbientLight / PointLights (Minimal, dramatic)
           ├── GridSystem (The floor plane)
           │    └── GridHelper (Standard Three.js grid)
           └── EntityLayer (Group)
                └── Token (Component mapped from combatStore.entities)
                     ├── Mesh (Box/Sphere/Capsule)
                     ├── FloatingUI (HTML overlay for Name/HP)
                     └── SelectionRing (Visible when selected)
```

### 4.1 `BattlemapCanvas.tsx`
The entry point. Sets up the `Canvas`, shadows, and global lighting. Handles window resize automatically via R3F.

### 4.2 `GridSystem.tsx`
Renders the tactical grid.
- **Visuals:** Neon grid lines (Green/Amber based on theme).
- **Scale:** 1 Unit = 5ft (Standard D&D).
- **Features:** Dynamic highlighting of "Movement Range" (Phase 4 feature, planned here).

### 4.3 `EntityLayer.tsx`
Subscribes to `useCombatStore`. Maps the `entities` dictionary to `<Token />` components.

### 4.4 `Token.tsx`
Represents a single unit.
- **Geometry:** Simple primitives (Cone for players, Box for enemies) to maintain the abstract "Terminal" aesthetic.
- **Props:** `position`, `color`, `isSelected`.
- **Interaction:** `onClick` sets `selectedEntityId` in the store.
- **Overlay:** Uses `<Html>` from `@react-three/drei` to show a floating HP bar that scales with distance.

## 5. Visual Style Guidelines (The "Quest Keeper" Look)

To maintain immersion, the 3D view shouldn't look like a video game; it should look like a *tactical display* on a sci-fi terminal.

1.  **Wireframes:** Use `wireframe={true}` on terrain or obstacles.
2.  **Bloom:** High emission materials on Tokens to make them "glow" against the dark background.
3.  **Monochrome-ish:** Stick to the primary theme colors (Green #00ff00, Amber #ffb000) plus red for enemies.
4.  **Scanlines:** A post-processing effect overlay to simulate a CRT monitor.

## 6. Implementation Plan

1.  **Install Deps:** `npm install three @types/three @react-three/fiber @react-three/drei`
2.  **Create Store:** Implement `src/stores/combatStore.ts`.
3.  **Create Components:**
    *   `src/components/visualizer/BattlemapCanvas.tsx`
    *   `src/components/visualizer/GridSystem.tsx`
    *   `src/components/visualizer/Token.tsx`
4.  **Integrate:** Mount `BattlemapCanvas` inside `MainViewport.tsx` when the "3D" tab is active.