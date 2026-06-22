import React from 'react';
import { Path } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const DatabaseShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height } = component;
  const rx = width / 2;
  const ry = 10;
  // Note: For a database shape, you might want to scale 'ry' as well if the width gets huge
  const pathData = `M 0,${ry} a ${rx},${ry} 0 1,1 ${width},0 a ${rx},${ry} 0 1,1 -${width},0 l 0,${height - ry * 2} a ${rx},${ry} 0 0,0 ${width},0 l 0,-${height - ry * 2}`;

  return (
    <Path 
      data={pathData} 
      fill="white" 
      stroke={isSelected ? "#3b82f6" : "#1e293b"} 
      strokeWidth={isSelected ? 3 : 2} 
    />
  );
};
