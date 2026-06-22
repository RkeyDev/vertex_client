import React from 'react';
import { Ellipse } from 'react-konva';
import type { ShapeProps } from './ShapeProps';

export const UseCaseShape: React.FC<ShapeProps> = ({ component, isSelected }) => (
  <Ellipse
    x={component.width / 2}
    y={component.height / 2}
    radiusX={component.width / 2}
    radiusY={component.height / 2}
    fill="#f8fafc"
    stroke={isSelected ? "#3b82f6" : "#475569"}
    strokeWidth={isSelected ? 3 : 2}
  />
);
