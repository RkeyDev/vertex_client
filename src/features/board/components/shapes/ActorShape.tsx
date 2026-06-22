import React from 'react';
import { Group, Circle, Line } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const ActorShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height } = component;
  const strokeColor = isSelected ? "#3b82f6" : "#475569";
  return (
    <Group>
      <Circle x={width / 2} y={height * 0.15} radius={height * 0.15} fill="#f8fafc" stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
      <Line points={[width / 2, height * 0.3, width / 2, height * 0.6]} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
      <Line points={[width * 0.1, height * 0.45, width * 0.9, height * 0.45]} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
      <Line points={[width / 2, height * 0.6, width * 0.1, height * 0.95]} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
      <Line points={[width / 2, height * 0.6, width * 0.9, height * 0.95]} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />
    </Group>
  );
};
