import React, { useMemo } from 'react';
import { Html, Line, Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useCombatStore } from '../../stores/combatStore';
import { isTileBlocked, getElevationAt, calculateDistance3D } from '../../utils/gridHelpers';

export const GridSystem: React.FC = () => {
  const entities = useCombatStore((state) => state.entities);
  const terrain = useCombatStore((state) => state.terrain);
  const setClickedTileCoord = useCombatStore((state) => state.setClickedTileCoord);
  const clickedTileCoord = useCombatStore((state) => state.clickedTileCoord);
  
  // Calculate dynamic bounds from all entities and terrain
  const bounds = useMemo(() => {
    let minX = 0, maxX = 20, minZ = 0, maxZ = 20;
    
    // Check entity positions (in MCP coords)
    entities.forEach(entity => {
      const mcpX = entity.position.x + 10; // Convert viz to MCP
      const mcpZ = entity.position.z + 10;
      minX = Math.min(minX, mcpX);
      maxX = Math.max(maxX, mcpX);
      minZ = Math.min(minZ, mcpZ);
      maxZ = Math.max(maxZ, mcpZ);
    });
    
    // Check terrain positions (in MCP coords)
    terrain.forEach(t => {
      const mcpX = t.position.x + 10; // Convert viz to MCP
      const mcpZ = t.position.z + 10;
      minX = Math.min(minX, mcpX);
      maxX = Math.max(maxX, mcpX);
      minZ = Math.min(minZ, mcpZ);
      maxZ = Math.max(maxZ, mcpZ);
    });
    
    // Add padding and round to nice numbers
    const padding = 5;
    minX = Math.floor((minX - padding) / 5) * 5;
    maxX = Math.ceil((maxX + padding) / 5) * 5;
    minZ = Math.floor((minZ - padding) / 5) * 5;
    maxZ = Math.ceil((maxZ + padding) / 5) * 5;
    
    // Calculate the center offset for visualization
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const gridSize = Math.max(rangeX, rangeZ, 20);
    
    return { minX, maxX, minZ, maxZ, centerX, centerZ, gridSize };
  }, [entities, terrain]);
  
  const gridSize = Math.max(bounds.gridSize, 100);
  const divisions = Math.max(bounds.gridSize, 100);
  const labels: React.ReactElement[] = [];
  
  // Helper to convert MCP coord to visualizer coord  
  const toViz = (mcpCoord: number) => mcpCoord - 10;
  
  // REMOVED: Numbered axis labels per user request
  // The grid lines themselves provide visual reference
  // Compass rose provides orientation

  const measureMode = useCombatStore((state) => state.measureMode);
  const measureStart = useCombatStore((state) => state.measureStart);
  const measureEnd = useCombatStore((state) => state.measureEnd);
  const cursorPosition = useCombatStore((state) => state.cursorPosition);
  const setMeasureStart = useCombatStore((state) => state.setMeasureStart);
  const setMeasureEnd = useCombatStore((state) => state.setMeasureEnd);
  const setCursorPosition = useCombatStore((state) => state.setCursorPosition);

  // Helper to calculate Y at a specific grid coordinate (Viz coords)
  const calcElevation = (vizX: number, vizZ: number) => {
    // Viz coords -> MCP coords
    const mcpX = vizX + 10;
    const mcpZ = vizZ + 10;
    // getElevationAt returns Y height (Viz Y)
    return getElevationAt(mcpX, mcpZ, terrain, entities);
  };

  const onPlaneClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const vizX = Math.floor(e.point.x);
    const vizZ = Math.floor(e.point.z);
    
    if (measureMode) {
      if (!measureStart) {
        setMeasureStart({ x: vizX, y: vizZ }); 
      } else if (!measureEnd) {
        setMeasureEnd({ x: vizX, y: vizZ });
      } else {
        setMeasureStart({ x: vizX, y: vizZ });
        setMeasureEnd(null);
      }
    } else {
      const mcpX = vizX + 10;
      const mcpZ = vizZ + 10;
      if (clickedTileCoord && clickedTileCoord.x === mcpX && clickedTileCoord.y === mcpZ) {
        setClickedTileCoord(null);
      } else {
        setClickedTileCoord({ x: mcpX, y: mcpZ });
      }
    }
  };

  const onPointerMove = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const vizX = Math.floor(e.point.x);
    const vizZ = Math.floor(e.point.z);
    setCursorPosition({ x: vizX, y: vizZ });
  };

  return (
    <group>
      {/* Visible Ground Plane - Earth tones (tan, green, brown) */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.02, 0]} 
        receiveShadow
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial 
          color="#3d3228"  // Dark earthy brown base
          roughness={0.95} 
          metalness={0.0}
        />
      </mesh>
      
      {/* Grid overlay - terminal green aesthetic */}
      <gridHelper args={[gridSize, divisions, '#00ff41', '#1a1a1a']} />
      
      {labels}
      
      {/* Compass Rose */}
      <group position={[toViz(bounds.maxX - 5), 0.2, toViz(bounds.minZ + 5)]}>
        <Html position={[0, 0, -3]} center style={{ color: '#ff4444', fontSize: '16px', fontFamily: 'monospace', fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none', textShadow: '0 0 4px #ff4444' }}>N</Html>
        <Html position={[3, 0, 0]} center style={{ color: '#00ff41', fontSize: '14px', fontFamily: 'monospace', pointerEvents: 'none', userSelect: 'none' }}>E</Html>
        <Html position={[0, 0, 3]} center style={{ color: '#00ff41', fontSize: '14px', fontFamily: 'monospace', pointerEvents: 'none', userSelect: 'none' }}>S</Html>
        <Html position={[-3, 0, 0]} center style={{ color: '#00ff41', fontSize: '14px', fontFamily: 'monospace', pointerEvents: 'none', userSelect: 'none' }}>W</Html>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshStandardMaterial color="#00ff41" emissive="#00ff41" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.1, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 1.2, 3]} />
          <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.8} />
        </mesh>
      </group>
      
      {/* Clicked Tile Indicator */}
      {clickedTileCoord && (
        <group position={[toViz(clickedTileCoord.x) + 0.5, calcElevation(toViz(clickedTileCoord.x), toViz(clickedTileCoord.y)) + 0.1, toViz(clickedTileCoord.y) + 0.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial color="#ffff00" opacity={0.8} transparent side={2} />
          </mesh>
          <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.8)', color: '#ffff00', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid #ffff00', whiteSpace: 'nowrap' }}>
              ({clickedTileCoord.x}, {clickedTileCoord.y})
            </div>
          </Html>
        </group>
      )}
      
      {/* Measurement Visualization */}
      {measureMode && measureStart && (
        <group>
          {(() => {
             // START POINT
             const startY = calcElevation(measureStart.x, measureStart.y);
             const startPos = { x: measureStart.x + 0.5, y: startY + 0.05, z: measureStart.y + 0.5 };
             
             // END POINT (Target)
             const target2D = measureEnd || cursorPosition;
             
             return (
               <>
                 {/* Start Marker */}
                 <mesh position={[startPos.x, startPos.y, startPos.z]} rotation={[-Math.PI/2, 0, 0]}>
                    <ringGeometry args={[0.2, 0.3, 16]} />
                    <meshBasicMaterial color="#00ffff" />
                 </mesh>
                 
                 {target2D && (() => {
                     const endY = calcElevation(target2D.x, target2D.y);
                     const endPos = { x: target2D.x + 0.5, y: endY + 0.05, z: target2D.y + 0.5 };
                     
                     // 3D Distance
                     const dist = calculateDistance3D(startPos, endPos);
                     const distFeet = Math.round(dist * 5 * 10) / 10;
                     
                     return (
                        <group>
                           <Line
                              points={[
                                [startPos.x, startPos.y + 0.1, startPos.z],
                                [endPos.x, endPos.y + 0.1, endPos.z]
                              ]}
                              color="#00ffff"
                              lineWidth={2}
                              dashed
                              dashScale={2}
                           />
                           {/* End Marker */}
                           <mesh position={[endPos.x, endPos.y, endPos.z]} rotation={[-Math.PI/2, 0, 0]}>
                             <ringGeometry args={[0.1, 0.2, 16]} />
                             <meshBasicMaterial color="#00ffff" />
                           </mesh>
                           {/* Label */}
                           <Html position={[(startPos.x + endPos.x)/2, (startPos.y + endPos.y)/2 + 0.5, (startPos.z + endPos.z)/2]} center>
                              <div style={{ background: 'rgba(0,0,0,0.8)', color: '#00ffff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', pointerEvents: 'none' }}>
                                {distFeet} ft
                              </div>
                           </Html>
                        </group>
                     );
                 })()}
               </>
             );
          })()}
        </group>
      )}

      {/* Hover Cursor Highlight */}
      {cursorPosition && (
        (() => {
          const mcpX = cursorPosition.x + 10;
          const mcpY = cursorPosition.y + 10;
          const isBlocked = isTileBlocked(mcpX, mcpY, entities, terrain);
          const color = isBlocked ? '#ff0000' : '#00ff41';
          const y = calcElevation(cursorPosition.x, cursorPosition.y);
          
          return (
            <group position={[cursorPosition.x + 0.5, y + 0.05, cursorPosition.y + 0.5]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshBasicMaterial color={color} opacity={0.3} transparent />
                <Edges color={color} />
              </mesh>
            </group>
          );
        })()
      )}

      {/* Invisible plane for raycasting and shadows */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow 
        onClick={onPlaneClick}
        onPointerMove={onPointerMove}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
};