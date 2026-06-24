import React from 'react';
import { Circle, Text, Group } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const InterfaceShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const radius = Math.min(component.width, component.height) / 2;

  return (
    <Group>
      <Circle
        x={component.width / 2}
        y={component.height / 2}
        radius={radius}
        fill="#f8fafc"
        stroke={isSelected ? "#3b82f6" : "#475569"}
        strokeWidth={isSelected ? 3 : 2}
      />
      <Text
        x={0}
        y={component.height / 2 - 8}
        width={component.width}
        align="center"
        text={component.data?.header}
        fontSize={16}
        fontFamily="Inter, sans-serif"
        fill="#1e293b"
        listening={false}
      />
    </Group>
  );
};