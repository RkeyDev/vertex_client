import React from 'react';
import { Rect } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const ServerShape: React.FC<ShapeProps> = ({ component, isSelected }) => (
  <Rect
    width={component.width}
    height={component.height}
    fill="#f1f5f9"
    stroke={isSelected ? "#3b82f6" : "#475569"}
    strokeWidth={isSelected ? 3 : 2}
    cornerRadius={12}
  />
);
