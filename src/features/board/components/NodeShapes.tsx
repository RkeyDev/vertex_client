import React from 'react';
import { 
  type UmlComponent, 
  ComponentType 
} from '../types/board.types';
import { Rect, Group, Text, Line, Path } from 'react-konva';

interface ShapeProps {
  component: UmlComponent;
  isSelected: boolean;
}

/**
 * Helper to calculate the scaled font size based on the component's 
 * current width vs a reference width, plus any manual overrides.
 */
const getScaledFontSize = (component: UmlComponent, baseSize: number) => {
  const manualFontSize = (component.data as any)?.fontSize || baseSize;
  const REFERENCE_WIDTH = 150;
  const ratio = component.width / REFERENCE_WIDTH;
  return Math.max(8, Math.round(manualFontSize * ratio));
};

export const ClassShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height, data } = component;
  
  // Dynamic font sizes based on the scaling logic
  const headerFontSize = getScaledFontSize(component, 14);
  const bodyFontSize = getScaledFontSize(component, 12);

  const headerHeight = 35 * (width / 150); // Scale header height too so it looks proportional
  const bodyHeight = height - headerHeight;
  const attributeSectionHeight = bodyHeight / 2;
  const secondLineY = headerHeight + attributeSectionHeight;
  
  const strokeColor = isSelected ? "#3b82f6" : "#303030";

  return (
    <Group>
      <Rect
        width={width}
        height={height}
        fill="white"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={2}
      />

      <Line 
        points={[0, headerHeight, width, headerHeight]} 
        stroke={strokeColor} 
        strokeWidth={1} 
      />

      <Line 
        points={[0, secondLineY, width, secondLineY]} 
        stroke={strokeColor} 
        strokeWidth={1} 
      />

      <Text
        text={(data as any)?.header || 'Class'}
        width={width}
        height={headerHeight}
        align="center"
        verticalAlign="middle"
        fontStyle="bold"
        fontSize={headerFontSize} // UPDATED
      />

      <Text
        text={Array.isArray((data as any)?.attributes) ? (data as any).attributes.join('\n') : ''}
        x={5}
        y={headerHeight + 5}
        width={width - 10}
        fontSize={bodyFontSize} // UPDATED
        fontFamily="monospace"
      />

      <Text
        text={Array.isArray((data as any)?.methods) ? (data as any).methods.join('\n') : ''}
        x={5}
        y={secondLineY + 5}
        width={width - 10}
        fontSize={bodyFontSize} // UPDATED
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