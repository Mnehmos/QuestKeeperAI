/**
 * Tests for Grid Helper Functions
 * 
 * Pure math functions for D&D 5e spatial positioning.
 * Based on dnd_spatial_rules.md specifications.
 */
import { describe, it, expect } from 'vitest';
import {
  CREATURE_SIZE_MAP,
  getSnappingOffset,
  calculateGridPosition,
  calculateDistance3D,
  getElevationAt,
  isTileBlocked,
  type CreatureSize,
} from './gridHelpers';

describe('gridHelpers', () => {
  describe('CREATURE_SIZE_MAP', () => {
    it('should have correct grid units for each size', () => {
      expect(CREATURE_SIZE_MAP.Tiny).toBe(1);
      expect(CREATURE_SIZE_MAP.Small).toBe(1);
      expect(CREATURE_SIZE_MAP.Medium).toBe(1);
      expect(CREATURE_SIZE_MAP.Large).toBe(2);
      expect(CREATURE_SIZE_MAP.Huge).toBe(3);
      expect(CREATURE_SIZE_MAP.Gargantuan).toBe(4);
    });

    it('should cover all D&D 5e size categories', () => {
      const sizes: CreatureSize[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
      sizes.forEach((size) => {
        expect(CREATURE_SIZE_MAP[size]).toBeDefined();
        expect(CREATURE_SIZE_MAP[size]).toBeGreaterThan(0);
      });
    });
  });

  describe('getSnappingOffset', () => {
    /**
     * Snapping rules:
     * - Odd-width tokens (1x1, 3x3): Position must end in .5 (center of cell)
     * - Even-width tokens (2x2, 4x4): Position must be an integer (grid line)
     * 
     * Offset = units / 2
     */
    
    it('should return 0.5 for Medium creatures (1x1)', () => {
      // 1x1 token centered at cell center: offset = 1/2 = 0.5
      expect(getSnappingOffset('Medium')).toBe(0.5);
    });

    it('should return 0.5 for Small creatures (1x1)', () => {
      expect(getSnappingOffset('Small')).toBe(0.5);
    });

    it('should return 0.5 for Tiny creatures (1x1)', () => {
      expect(getSnappingOffset('Tiny')).toBe(0.5);
    });

    it('should return 1.0 for Large creatures (2x2)', () => {
      // 2x2 token at (0,0) occupies (0,0)-(2,2), center at (1,1)
      // offset = 2/2 = 1.0
      expect(getSnappingOffset('Large')).toBe(1.0);
    });

    it('should return 1.5 for Huge creatures (3x3)', () => {
      // 3x3 token at (0,0) occupies (0,0)-(3,3), center at (1.5,1.5)
      // offset = 3/2 = 1.5
      expect(getSnappingOffset('Huge')).toBe(1.5);
    });

    it('should return 2.0 for Gargantuan creatures (4x4)', () => {
      // 4x4 token at (0,0) occupies (0,0)-(4,4), center at (2,2)
      // offset = 4/2 = 2.0
      expect(getSnappingOffset('Gargantuan')).toBe(2.0);
    });
  });

  describe('calculateGridPosition', () => {
    const STANDARD_HEIGHT = 0.8;
    const EXPECTED_Y = STANDARD_HEIGHT / 2; // 0.4

    describe('Medium creatures (1x1)', () => {
      it('should center at (0.5, 0.4, 0.5) for grid (0, 0)', () => {
        const [x, y, z] = calculateGridPosition(0, 0, 'Medium');
        expect(x).toBe(0.5);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(0.5);
      });

      it('should center at (5.5, 0.4, 3.5) for grid (5, 3)', () => {
        const [x, y, z] = calculateGridPosition(5, 3, 'Medium');
        expect(x).toBe(5.5);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(3.5);
      });
    });

    describe('Large creatures (2x2)', () => {
      it('should center at (1, 0.4, 1) for grid (0, 0)', () => {
        const [x, y, z] = calculateGridPosition(0, 0, 'Large');
        expect(x).toBe(1.0);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(1.0);
      });

      it('should center at (6, 0.4, 4) for grid (5, 3)', () => {
        const [x, y, z] = calculateGridPosition(5, 3, 'Large');
        expect(x).toBe(6.0);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(4.0);
      });
    });

    describe('Huge creatures (3x3)', () => {
      it('should center at (1.5, 0.4, 1.5) for grid (0, 0)', () => {
        const [x, y, z] = calculateGridPosition(0, 0, 'Huge');
        expect(x).toBe(1.5);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(1.5);
      });
    });

    describe('Gargantuan creatures (4x4)', () => {
      it('should center at (2, 0.4, 2) for grid (0, 0)', () => {
        const [x, y, z] = calculateGridPosition(0, 0, 'Gargantuan');
        expect(x).toBe(2.0);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(2.0);
      });
    });

    describe('edge cases', () => {
      it('should handle negative grid coordinates', () => {
        const [x, y, z] = calculateGridPosition(-5, -3, 'Medium');
        expect(x).toBe(-4.5);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(-2.5);
      });

      it('should handle large grid coordinates', () => {
        const [x, y, z] = calculateGridPosition(100, 200, 'Large');
        expect(x).toBe(101.0);
        expect(y).toBeCloseTo(EXPECTED_Y);
        expect(z).toBe(201.0);
      });
    });
  });

  describe('integration: grid snapping consistency', () => {
    it('should maintain consistent offset across all 1x1 sizes', () => {
      const smallOffset = getSnappingOffset('Small');
      const mediumOffset = getSnappingOffset('Medium');
      const tinyOffset = getSnappingOffset('Tiny');

      expect(smallOffset).toBe(mediumOffset);
      expect(mediumOffset).toBe(tinyOffset);
    });

    it('should produce correct token footprints', () => {
      // Verify that the grid position calculations produce correct footprints
      // A Medium creature at grid (2, 2) should occupy cell (2, 2)
      // A Large creature at grid (2, 2) should occupy cells (2,2), (2,3), (3,2), (3,3)
      
      const mediumPos = calculateGridPosition(2, 2, 'Medium');
      const largePos = calculateGridPosition(2, 2, 'Large');

      // Medium center should be in the middle of cell (2, 2)
      expect(mediumPos[0]).toBe(2.5);
      expect(mediumPos[2]).toBe(2.5);

      // Large center should be at the intersection of 4 cells starting at (2, 2)
      expect(largePos[0]).toBe(3.0);
      expect(largePos[2]).toBe(3.0);
    });
  });
  describe('calculateDistance3D', () => {
    it('should calculate distance between two points on the same plane', () => {
      const p1 = { x: 0, y: 0, z: 0 };
      const p2 = { x: 3, y: 0, z: 4 }; // 3-4-5 triangle
      expect(calculateDistance3D(p1, p2)).toBe(5);
    });

    it('should calculate distance with vertical difference', () => {
      const p1 = { x: 0, y: 0, z: 0 };
      const p2 = { x: 0, y: 3, z: 4 }; // 3-4-5 triangle in Y-Z
      expect(calculateDistance3D(p1, p2)).toBe(5);
    });

    it('should calculate full 3D distance', () => {
      const p1 = { x: 0, y: 0, z: 0 };
      const p2 = { x: 1, y: 2, z: 2 };
      // sqrt(1+4+4) = sqrt(9) = 3
      expect(calculateDistance3D(p1, p2)).toBe(3);
    });
  });

  // Mock Data for Elevation and Blocking tests
  const mockTerrain = [
    {
      id: 't1',
      position: { x: 0, y: 0, z: 0 }, // Fits MCP(10, 10) -> Viz(0,0)
      dimensions: { width: 1, height: 2, depth: 1 },
      type: 'obstacle',
      blocksMovement: true
    },
    {
      id: 't2',
      position: { x: 5, y: 0, z: 5 }, // Fits MCP(15, 15) -> Viz(5,5)
      dimensions: { width: 1, height: 1, depth: 1 },
      type: 'obstacle',
      blocksMovement: false // Non-blocking terrain
    }
  ] as any; // Cast to avoid full type mocking

  const mockEntities = [
    {
      id: 'e1',
      position: { x: 2, y: 0, z: 2 }, // MCP(12, 12)
      size: 'Medium',
      type: 'character'
    },
    {
      id: 'e2',
      position: { x: 3, y: 0, z: 3 }, // MCP(13, 13)
      size: 'Large', // 2x2, occupies 3,3 to 5,5? No check logic.
      type: 'monster'
    }
  ] as any;

  describe('getElevationAt', () => {
    // getElevationAt(x, z, ...) takes MCP coords.
    // Viz x = MCP x - 10.
    
    it('should return 0 for empty space', () => {
      expect(getElevationAt(0, 0, [], [])).toBe(0);
    });

    it('should return terrain height', () => {
      // Mock terrain at Viz(0,0) has height 2.
      // Top Y = 0 + 2/2 = 1? 
      // Wait, let's check getElevationAt logic:
      // topY = t.position.y + (t.dimensions.height / 2);
      // If position.y is center Y? Or bottom Y?
      // In ThreeJS, position is usually center. 
      // If box height is 2, and pos.y is 1, bottom is 0, top is 2.
      // If pos.y is 0, top is 1.
      // Let's assume input mock pos.y is 0. Height 2. Top is 1. 
      // Test code logic simply adds half height.
      
      // Let's use MCP coord matching Viz(0,0) -> MCP(10, 10).
      const elev = getElevationAt(10, 10, mockTerrain, []);
      // t1: y=0, h=2. Top = 1.
      expect(elev).toBe(1);
    });

    it('should return entity height for stacking', () => {
       // Entity e1 at Viz(2,2). MCP(12, 12).
       // Logic: e.position.y + 0.4.
       // e1 pos.y is 0. 0 + 0.4 = 0.4.
       const elev = getElevationAt(12, 12, [], mockEntities);
       expect(elev).toBe(0.4);
    });
  });

  describe('isTileBlocked', () => {
    it('should be blocked by blocking terrain', () => {
      // t1 at MCP(10,10) is blocking
      expect(isTileBlocked(10, 10, [], mockTerrain)).toBe(true);
    });

    it('should NOT be blocked by non-blocking terrain', () => {
      // t2 at MCP(15,15) is non-blocking
      expect(isTileBlocked(15, 15, [], mockTerrain)).toBe(false);
    });

    it('should be blocked by entity', () => {
      // e1 at MCP(12,12)
      expect(isTileBlocked(12, 12, mockEntities, [])).toBe(true);
    });

    it('should ignore specified entity IDs', () => {
      // e1 at MCP(12,12) but ignored
      expect(isTileBlocked(12, 12, mockEntities, [], { ignoreEntityIds: ['e1'] })).toBe(false);
    });
  });
});
