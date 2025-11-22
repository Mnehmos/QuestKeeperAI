import React from 'react';
import { Html } from '@react-three/drei';

export const GridSystem: React.FC = () => {
  const gridSize = 100;
  const divisions = 100;
  
  // MCP uses 0-20 coordinates, visualizer is centered at 0,0
  // So MCP 0-20 maps to visualizer -10 to +10
  const mcpGridSize = 20;
  const labelInterval = 5;
  const labels: React.ReactElement[] = [];
  
  // Helper to convert visualizer coordinate to MCP coordinate for labels
  const toMCP = (vizCoord: number) => vizCoord + (mcpGridSize / 2);
  
  // CENTER AXIS LABELS (X-axis at z=0, horizontal center)
  for (let vizX = -10; vizX <= 10; vizX += labelInterval) {
    const mcpX = toMCP(vizX);
    labels.push(
      <Html
        key={`center-x-${vizX}`}
        position={[vizX, 0.15, 0]}
        center
        style={{
          color: '#00ff41',
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.9,
          textShadow: '0 0 2px #00ff41',
        }}
      >
        {mcpX}
      </Html>
    );
  }

  // CENTER AXIS LABELS (Z-axis at x=0, vertical center)
  for (let vizZ = -10; vizZ <= 10; vizZ += labelInterval) {
    const mcpZ = toMCP(vizZ);
    labels.push(
      <Html
        key={`center-z-${vizZ}`}
        position={[0, 0.15, vizZ]}
        center
        style={{
          color: '#00ff41',
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.9,
          textShadow: '0 0 2px #00ff41',
        }}
      >
        {mcpZ}
      </Html>
    );
  }

  return (
    <group>
      {/* Size 100, Divisions 100, Center Color (terminal-green), Grid Color (terminal-dim) */}
      <gridHelper args={[gridSize, divisions, '#00ff41', '#1a1a1a']} />
      
      {/* Grid coordinate labels - MCP style (0-20) */}
      {labels}
      
      {/* Center point label showing MCP origin */}
      <Html
        position={[-10, 0.2, -10]}
        center
        style={{
          color: '#00ff41',
          fontSize: '14px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.7,
          fontWeight: 'bold',
          textShadow: '0 0 3px #00ff41',
        }}
      >
        0,0
      </Html>
      
      {/* Compass Rose */}
      <group position={[8, 0.2, -8]}>
        {/* North */}
        <Html
          position={[0, 0, -3]}
          center
          style={{
            color: '#ff4444',
            fontSize: '16px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '0 0 4px #ff4444',
          }}
        >
          N
        </Html>
        
        {/* East */}
        <Html
          position={[3, 0, 0]}
          center
          style={{
            color: '#00ff41',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          E
        </Html>
        
        {/* South */}
        <Html
          position={[0, 0, 3]}
          center
          style={{
            color: '#00ff41',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          S
        </Html>
        
        {/* West */}
        <Html
          position={[-3, 0, 0]}
          center
          style={{
            color: '#00ff41',
            fontSize: '14px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          W
        </Html>
        
        {/* Compass center indicator */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
          <meshStandardMaterial color="#00ff41" emissive="#00ff41" emissiveIntensity={0.5} />
        </mesh>
        
        {/* North pointer arrow */}
        <mesh position={[0, 0.1, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 1.2, 3]} />
          <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.8} />
        </mesh>
      </group>
      
      {/* Invisible plane for raycasting and shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
};