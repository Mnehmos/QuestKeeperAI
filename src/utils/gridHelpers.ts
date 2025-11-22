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
export const calculateGridPosition = (x: number, z: number, size: CreatureSize): [number, number, number] => {
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
  const y = STANDARD_HEIGHT / 2;

  return [x + offset, y, z + offset];
};