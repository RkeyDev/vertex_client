import React from 'react';
import { Circle } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const InterfaceShape: React.FC<ShapeProps> = ({ component, isSelected }) => (
  <Circle
    x={component.width / 2}
    y={component.height / 2}
    radius={Math.min(component.width, component.height) / 2}
    fill="#f8fafc"
    stroke={isSelected ? "#3b82f6" : "#475569"}
    strokeWidth={isSelected ? 3 : 2}
  />
);
