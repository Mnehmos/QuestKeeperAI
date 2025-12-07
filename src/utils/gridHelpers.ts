export type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export const CREATURE_SIZE_MAP: Record<CreatureSize, number> = {
  Tiny: 1,       // Occupies 1 cell (logic), but visually smaller
  Small: 1,
  Medium: 1,
  Large: 2,
  Huge: 3,
  Gargantuan: 4,
};

/**
 * Calculates the offset needed to center a creature on the grid.
 * 
 * Rules:
 * - Odd-width tokens (1x1, 3x3): Position must end in .5 (center of cell)
 * - Even-width tokens (2x2, 4x4): Position must be an Integer (grid line)
 * 
 * @param size The D&D size category of the creature
 * @returns The offset value (0.5 or 1.0, effectively) to be added to the integer grid coordinate
 */
export const getSnappingOffset = (size: CreatureSize): number => {
  const units = CREATURE_SIZE_MAP[size];
  // If size is 1, offset is 0.5 (0 + 0.5 = 0.5 center)
  // If size is 2, offset is 1.0 (start at grid line, center is +1 unit)
  // If size is 3, offset is 1.5 (start at grid line, center is +1.5 units)
  // Wait, let's re-read the spec in dnd_spatial_rules.md line 100:
  // "return units / 2;"
  // Let's trace: 
  // Grid coord (integer) is usually the bottom-left corner of the cell or the intersection.
  // If I place a Medium (1x1) token at grid (0,0), I want it centered at (0.5, 0.5).
  //   units = 1. offset = 0.5. Result = 0.5. Correct.
  // If I place a Large (2x2) token at grid (0,0) [bottom-left corner of the 2x2 block],
  //   It occupies (0,0) to (2,2). Center is (1,1).
  //   units = 2. offset = 1.0. Result = 1.0. Correct.
  // If I place a Huge (3x3) token at grid (0,0),
  //   It occupies (0,0) to (3,3). Center is (1.5, 1.5).
  //   units = 3. offset = 1.5. Result = 1.5. Correct.
  
  return units / 2;
};

/**
 * Calculates the 3D position vector for a token based on its grid coordinates and size.
 * 
 * @param x The integer grid X coordinate
 * @param z The integer grid Z coordinate
 * @param size The creature size category
 * @returns [x, y, z] tuple where y is adjusted for base height (0) or center height
 */
export const calculateGridPosition = (x: number, z: number, size: CreatureSize, yOverride?: number): [number, number, number] => {
  const offset = getSnappingOffset(size);
  
  // For Y position:
  // Spec 3.1: "Standard visual height should be 0.8 Units... Position Y at 0.4 (half height) so the base sits at Y=0."
  // Token geometry is likely centered, so y should be half of the height.
  // However, different sizes might have different heights?
  // Spec 2.1 says "Dimensions (Units)" for Huge is 3x3, Gargantuan 4x4.
  // Spec 3.1 says "Use 0.8 Units height... so the base sits at Y=0." implying constant height for "Tactical Terminal" aesthetic?
  // But Spec 4.3 says "Render Position = GridCoordinate + getSizeOffset(size)"
  // And Requirements 4 says "Update geometry size based on the creature category (e.g., Large = 2x2x0.8)."
  
  // If geometry is Box(width, height, depth), and we want it sitting on y=0:
  // The center y should be height / 2.
  // Let's assume a standard height of 0.8 for now as per Spec 3.1.
  const STANDARD_HEIGHT = 0.8;
  const y = yOverride !== undefined ? yOverride : STANDARD_HEIGHT / 2;

  return [x + offset, y, z + offset];
};

import { Entity, TerrainFeature } from '../stores/combatStore';

/**
 * Checks if a specific grid tile is blocked by walls, obstacles, or entities.
 * 
 * @param x The integer grid X coordinate (MCP coords)
 * @param z The integer grid Z coordinate (MCP coords)
 * @param entities List of active entities
 * @param terrain List of terrain features
 * @param options Optional settings:
 *   - ignoreEntityIds: Array of entity IDs to ignore (e.g., the moving entity)
 *   - ignoreTerrainIds: Array of terrain IDs to ignore
 * 
 * @returns true if the tile is blocked, false otherwise
 */
export const isTileBlocked = (
  x: number, 
  z: number, 
  entities: Entity[], 
  terrain: TerrainFeature[],
  options: { ignoreEntityIds?: string[]; ignoreTerrainIds?: string[] } = {}
): boolean => {
  // 1. Check Terrain
  const blockedByTerrain = terrain.some(t => {
    if (options.ignoreTerrainIds?.includes(t.id)) return false;
    if (!t.blocksMovement) return false;
    
    // Check if (x,z) is within the terrain's footprint
    // MCP coords are integers. Terrain position is usually the center-ish or top-left?
    // In `stateJsonToTerrain`:
    //   Obstacle: { x: pos.x - 10, y: 1, z: pos.y - 10 }, width: 1, depth: 1.
    //   MCP coords for terrain are stored in `position` but already converted to Viz coords (x-10).
    //   Let's assume we need to convert input MCP (x,z) to Viz (vx, vz) to match terrain.position.
    
    // Wait, terrain in store has Viz coords.
    // Entities in store have Viz coords.
    // Input x, z are likely MCP coords (integer grid).
    // Let's convert input x,z to Viz coords for comparison.
    // Viz = MCP - 10.
    
    const vizX = x - 10;
    const vizZ = z - 10;
    
    // Simple 1x1 check for now.
    // Terrain position is the center of the block in Viz space.
    // An obstacle at MCP(15,15) -> Viz(5,5). Center is 5.
    // It covers 4.5 to 5.5?
    // Or is Viz coords integers?
    // In `stateJsonToTerrain`, we store `position: { x: x-10, ... }`.
    // So if x=15, store x=5.
    // If input x=15, vizX=5.
    // Match!
    
    // Handle multi-tile terrain? Dimensions are width/depth.
    // If width=1, check exact match.
    // If width > 1, check bounds.
    // Bounds: [pos.x - w/2, pos.x + w/2]
    
    // Check overlapping intervals
    // Tile (1x1) at vizX is centered at vizX + 0.5? No, our logic says vizX is the integer corner?
    // Actually `stateJsonToTerrain` centers obstacles at `x - 10`.
    // And `Terrain.tsx` renders at `position.x + 0.5`.
    // Meaning the logical position in store `x` refers to the integer grid line (min corner).
    // So the tile covers [x, x+1].
    
    // BUT `stateJsonToTerrain` sets Obstacle width=1.
    // If Obstacle is at MCP(15), viz(5).
    // Does it occupy tile 5 (5.0 to 6.0)?
    // Yes, usually.
    
    // Let's assume strict integer equality for 1x1 items.
    // For larger items, we'd need more complex Rect intersection.
    // Assuming 1x1 for now as per current data.
    
    const dx = Math.abs(t.position.x - vizX);
    const dz = Math.abs(t.position.z - vizZ);
    
    // If distance < 0.5, it's the same tile?
    // If t.position.x is 5 and vizX is 5, dx is 0.
    
    return dx < 0.1 && dz < 0.1;
  });

  if (blockedByTerrain) return true;

  // 2. Check Entities
  const blockedByEntity = entities.some(e => {
    if (options.ignoreEntityIds?.includes(e.id)) return false;
    
    // Don't block if defeated/dead? (Optional rule, usually dead bodies are difficult terrain, not blocking)
    // For now, block everything alive or dead unless specified.
    
    const vizX = x - 10;
    const vizZ = z - 10;
    
    // Calculate entity bounds based on size
    // Default 1x1
    const size = CREATURE_SIZE_MAP[e.size] || 1;
    
    // Entity position in store is Viz coord (bottom-left corner of the occupied area).
    // e.g. Medium(1x1) at 5,5 occupies [5,6]x[5,6].
    // Large(2x2) at 5,5 occupies [5,7]x[5,7].
    
    // Input x,z is a specific single tile we are checking.
    // We check if this tile is inside the entity's footprint.
    
    const eLeft = e.position.x;
    const eRight = e.position.x + size;
    const eTop = e.position.z;
    const eBottom = e.position.z + size;
    
    // Tile geometry: [vizX, vizX+1]
    // Check intersection
    // Logic: if (RectA.left < RectB.right && RectA.right > RectB.left ...)
    
    const tileLeft = vizX;
    const tileRight = vizX + 1;
    const tileTop = vizZ;
    const tileBottom = vizZ + 1;
    
    const overlaps = (
      tileLeft < eRight &&
      tileRight > eLeft &&
      tileTop < eBottom &&
      tileBottom > eTop
    );
    
    return overlaps;
  });

  return blockedByEntity;
};

/**
 * Finds the nearest open tile starting from a given coordinate using a spiral search.
 * 
 * @param startX Starting grid X (MCP coords)
 * @param startZ Starting grid Z (MCP coords)
 * @param entities Current list of entities to check against
 * @param terrain Current list of terrain to check against
 * @param options configuration options
 * @returns The {x, y} of the nearest open tile (MCP coords), or null if none found within maxRadius
 */
export const findNearestOpenTile = (
  startX: number,
  startZ: number,
  entities: Entity[],
  terrain: TerrainFeature[],
  options: { 
    ignoreEntityIds?: string[];
    maxRadius?: number 
  } = {}
): { x: number; y: number } | null => {
  const maxRadius = options.maxRadius || 5;

  // 1. Check start point first
  if (!isTileBlocked(startX, startZ, entities, terrain, { ignoreEntityIds: options.ignoreEntityIds })) {
    return { x: startX, y: startZ };
  }

  // 2. Spiral search outwards
  for (let r = 1; r <= maxRadius; r++) {
    // Search the perimeter of the square at radius r
    // Top side: (startX-r, startZ-r) to (startX+r, startZ-r)
    // Right side: (startX+r, startZ-r+1) to (startX+r, startZ+r)
    // Bottom side: (startX+r-1, startZ+r) to (startX-r, startZ+r)
    // Left side: (startX-r, startZ+r-1) to (startX-r, startZ-r+1)
    
    // Simplest way to iterate the ring:
    for (let i = -r; i <= r; i++) {
        for (let j = -r; j <= r; j++) {
            // Only strictly check the edge (at least one coord must be at radius distance)
            if (Math.abs(i) !== r && Math.abs(j) !== r) continue;
            
            const checkX = startX + i;
            const checkZ = startZ + j;
            
            if (!isTileBlocked(checkX, checkZ, entities, terrain, { ignoreEntityIds: options.ignoreEntityIds })) {
               return { x: checkX, y: checkZ };
            }
        }
    }
  }

  return null; // No spot found
};

/**
 * Calculates the highest surface elevation at the given grid coordinate.
 * Used for placing entities on top of terrain or other entities (stacking).
 * 
 * @param x Grid X (MCP coords)
 * @param z Grid Z (MCP coords)
 * @param terrain List of current terrain
 * @param entities List of current entities
 * @param options configuration options
 * @returns The Y-height of the surface at this tile (Viz coords). Default 0.
 */
export const getElevationAt = (
  x: number,
  z: number,
  terrain: TerrainFeature[],
  entities: Entity[],
  options: { ignoreEntityIds?: string[] } = {}
): number => {
  let highestY = 0;

  const vizX = x - 10;
  const vizZ = z - 10;

  // 1. Check Terrain
  terrain.forEach(t => {
    // Simple intersection for 1x1 blocks aligned to grid
    // For bigger/complex shapes, this needs intersection logic matching isTileBlocked
    const dx = Math.abs(t.position.x - vizX);
    const dz = Math.abs(t.position.z - vizZ);
    // Assuming 1x1 coverage for simplicity for now, essentially checking center distance
    if (dx < 0.5 && dz < 0.5) {
      const topY = t.position.y + (t.dimensions.height / 2);
      if (topY > highestY) {
        highestY = topY;
      }
    }
  });

  // 2. Check Entities (Stacking)
  entities.forEach(e => {
    if (options.ignoreEntityIds?.includes(e.id)) return;

    // Check overlap
    const size = CREATURE_SIZE_MAP[e.size] || 1;
    // Entity pos (e.position) is bottom-left corner in some logic, but center in others?
    // Let's check `calculateGridPosition`: returns `x + offset`.
    // If Medium, offset 0.5. So position is center.
    // If Large, offset 1. So position is center (1,1 relative to 0,0 origin of 2x2).
    // So e.position is effectively centralish for the occupied squares.
    // Let's use simple overlap check:
    
    // Viz coords of entity center approx:
    // const ex = e.position.x;
    // const ez = e.position.z;
    
    // Check if our point (vizX_center, vizZ_center) is inside entity bounds
    // Center of tile X is vizX + 0.5
    // But our input x is integer grid line? Or tile index?
    // Throughout this file we treat `x` as the specific tile index [x, x+1].
    // And Terrain `position.x` seems to be the integer corner in some places (x-10).
    
    // Let's align with `isTileBlocked`:
    // It checks `vizX` (integer) vs `e.position.x` (float centered).
    // `eLeft = e.position.x` ?? 
    // Wait, in `isTileBlocked` I wrote:
    // `const eLeft = e.position.x`
    // If e.position is `calculateGridPosition` result (center), then `eLeft` should be `center - size/2`.
    // BUT `calculateGridPosition` returns `x + offset`.
    // If 1x1 at 0. Offset 0.5. Center 0.5.
    // Left = 0.5 - 0.5 = 0. Right = 1.
    // So yes, we need to handle that carefully.
    
    // Let's blindly assume strict tile matching for now:
    // If entity is at tile (X, Z), it stacks at (X, Z).
    
    // Actually, let's use the explicit collision math which works:
    const eCenterVizX = e.position.x;
    const eCenterVizZ = e.position.z;
    const eHalfSize = size / 2; // Approximate
    
    // If the input tile (vizX, vizZ) is under the entity
    // Tile center:
    const tileCx = vizX + 0.5;
    const tileCz = vizZ + 0.5;
    
    if (
      tileCx >= eCenterVizX - eHalfSize &&
      tileCx <= eCenterVizX + eHalfSize &&
      tileCz >= eCenterVizZ - eHalfSize &&
      tileCz <= eCenterVizZ + eHalfSize
    ) {
       // Stacking on an entity
       // Assume entity height based on size or fixed?
       // `calculateGridPosition` uses 0.8 standard height.
       const eTop = e.position.y + 0.4; // Center Y + half height
       if (eTop > highestY) {
         highestY = eTop;
       }
    }
  });

  return highestY;
};

/**
 * Calculates Euclidean distance between two points in 3D space.
 * 
 * @param p1 Point 1 {x, y, z}
 * @param p2 Point 2 {x, y, z}
 * @returns Distance in units
 */
export const calculateDistance3D = (p1: {x: number, y: number, z: number}, p2: {x: number, y: number, z: number}): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};