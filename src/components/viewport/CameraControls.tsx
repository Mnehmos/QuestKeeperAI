import React from 'react';
import { OrbitControls } from '@react-three/drei';

export const CameraControls: React.FC = () => {
  return (
    <OrbitControls 
      makeDefault 
      maxPolarAngle={Math.PI / 2 - 0.1} // Restrict to above ground, slight buffer
      minDistance={2}
      maxDistance={50}
      enableDamping={true}
      dampingFactor={0.1}
    />
  );
};