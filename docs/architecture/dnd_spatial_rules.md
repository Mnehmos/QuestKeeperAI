# D&D 5e Spatial & Visual Rules

## 1. Coordinate System Standards

To ensure consistency between the game logic (D&D 5e rules) and the 3D Visualizer (Three.js), the following coordinate system contracts are enforced.

### 1.1 Scale Ratio
**1 Three.js Unit = 5 Feet**

*   **Grid Cell:** 1x1 Unit.
*   **Vertical Scale:** 1 Unit = 5 Feet vertical.
*   **Ground Plane:** XZ Plane (Y = 0).

### 1.2 Grid Alignment
*   **Grid Lines:** Rendered at **Integer** coordinates (e.g., x=0, x=1, x=2).
*   **Cell Centers:** Located at **Half-Integer** coordinates (e.g., x=0.5, z=0.5).
*   **Origin:** (0,0,0) is the intersection of the central grid lines.

## 2. Creature Size & Token Scaling

Creature sizes determine the footprint and visual scale of the token. Tokens must scale according to their D&D size category.

| Size Category | Dimensions (ft) | Dimensions (Units) | Footprint (Grid Cells) | Center Alignment |
| :--- | :--- | :--- | :--- | :--- |
| **Tiny** | 2.5 x 2.5 | 0.5 x 0.5 | 1x1 (occupies same space as Medium) | Snap to Cell Center (x.5) |
| **Small** | 5 x 5 | 1 x 1 | 1x1 | Snap to Cell Center (x.5) |
| **Medium** | 5 x 5 | 1 x 1 | 1x1 | Snap to Cell Center (x.5) |
| **Large** | 10 x 10 | 2 x 2 | 2x2 | Snap to Grid Line (Integer) |
| **Huge** | 15 x 15 | 3 x 3 | 3x3 | Snap to Cell Center (x.5) |
| **Gargantuan** | 20 x 20 | 4 x 4 | 4x4 | Snap to Grid Line (Integer) |

### 2.1 Centering Logic
*   **Odd-width Tokens (1x1, 3x3):** Position must end in `.5` (e.g., `1.5, 0, 3.5`).
*   **Even-width Tokens (2x2, 4x4):** Position must be an **Integer** (e.g., `2.0, 0, 4.0`).
*   **Implementation Note:** The `Token` component must automatically calculate this offset based on the creature's `size` prop.

## 3. Visual Presentation

### 3.1 Token Geometry
To maintain the "Tactical Terminal" aesthetic while distinguishing sizes:

*   **Base Geometry:**
    *   **PC (Player):** Cylinder or Cone.
    *   **NPC/Enemy:** Box.
*   **Height:**
    *   Standard visual height should be **0.8 Units** (representing ~4ft visual representation within the 5ft cube) to allow grid lines to remain visible around the unit, or translucent full-height.
    *   *Decision:* Use **0.8 Units** height. Position Y at `0.4` (half height) so the base sits at Y=0.

### 3.2 Selection Indicators
Selection must encompass the entire footprint of the creature.

*   **Visual:** `Edges` geometry or a glowing ground decal.
*   **Scaling:** The selection ring/box must scale to match the **Dimensions (Units)** defined in Section 2.
    *   *Example:* A Large creature gets a 2x2 unit selection box.

### 3.3 Verticality & Flying
*   Tokens at elevation > 0 should render a "stem" or "shadow line" connecting them to the grid (Y=0) to visually indicate their ground position.
*   Fly/Climb height should be displayed in the UI overlay.

## 4. Implementation Specs (Token Component)

### 4.1 Props Interface
```typescript
type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

interface Entity {
  // ... existing props
  size: CreatureSize;
}
```

### 4.2 Size Helper Map
```typescript
export const CREATURE_SIZE_MAP: Record<CreatureSize, number> = {
  Tiny: 1,       // Visually smaller geometry, but logic occupies 1 cell
  Small: 1,
  Medium: 1,
  Large: 2,
  Huge: 3,
  Gargantuan: 4,
};
```

### 4.3 Position Correction
When receiving a raw grid coordinate (e.g., "The creature is at 5,5"), the visualizer must apply the offset:

```typescript
const getSizeOffset = (size: CreatureSize) => {
  const units = CREATURE_SIZE_MAP[size];
  // If odd units (1, 3), we need .5 offset. If even (2, 4), we need 0 offset (integer).
  // However, typically grid coordinates assume (0,0) is the bottom-left of a cell.
  // If (5,5) is the bottom-left corner of the cell at column 5, row 5:
  // Center of 1x1 is 5.5, 5.5
  // Center of 2x2 at (5,5) would be 6.0, 6.0 (covering 5,5 to 7,7)
  
  return units % 2 !== 0 ? 0.5 : 1.0; 
  // Wait, let's verify standard behavior:
  // A 2x2 unit starts at grid line 5. It spans 5->7. Center is 6. 
  // Offset from "start line" is size / 2.
  return units / 2;
};

// Render Position = GridCoordinate + getSizeOffset(size)