import React from 'react';
import { Rect, Group, Text, Line, Path } from 'react-konva';
import { type UmlComponent, ComponentType } from '../types/board.types';

interface ShapeProps {
  component: UmlComponent;
  isSelected: boolean;
}

export const ClassShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height, data } = component;
  
  // Professional UML proportions
  const headerHeight = 35;
  // We'll split the remaining height into two equal sections for attributes and methods
  const bodyHeight = height - headerHeight;
  const attributeSectionHeight = bodyHeight / 2;
  const secondLineY = headerHeight + attributeSectionHeight;
  
  const strokeColor = isSelected ? "#3b82f6" : "#303030";

  return (
    <Group>
      {/* Main Container */}
      <Rect
        width={width}
        height={height}
        fill="white"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={2}
      />

      {/* Header Separator */}
      <Line 
        points={[0, headerHeight, width, headerHeight]} 
        stroke={strokeColor} 
        strokeWidth={1} 
      />

      {/* Attributes/Methods Separator */}
      <Line 
        points={[0, secondLineY, width, secondLineY]} 
        stroke={strokeColor} 
        strokeWidth={1} 
      />

      {/* Header Text */}
      <Text
        text={data && 'header' in data ? data.header : 'Class'}
        width={width}
        height={headerHeight}
        align="center"
        verticalAlign="middle"
        fontStyle="bold"
        fontSize={14}
      />

      {/* Attributes Placeholder (Top half of body) */}
      <Text
        text={data && 'attributes' in data ? data.attributes?.join('\n') : ''}
        x={5}
        y={headerHeight + 5}
        width={width - 10}
        fontSize={12}
        fontFamily="monospace"
      />

      {/* Methods Placeholder (Bottom half of body) */}
      <Text
        text={data && 'methods' in data ? data.methods?.join('\n') : ''}
        x={5}
        y={secondLineY + 5}
        width={width - 10}
        fontSize={12}
        fontFamily="monospace"
      />
    </Group>
  );
};

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

export const DatabaseShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height } = component;
  const rx = width / 2;
  const ry = 10;
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