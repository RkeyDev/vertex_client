import React from 'react';
import { Rect, Group, Text, Line } from 'react-konva';
import type { ShapeProps } from './ShapeProps';
import { type UmlComponent } from '../../types/board.types';

const getScaledFontSize = (component: UmlComponent, baseSize: number) => {
  const manualFontSize = (component.data as any)?.fontSize || baseSize;
  const REFERENCE_WIDTH = 150;
  const ratio = component.width / REFERENCE_WIDTH;
  return Math.max(8, Math.round(manualFontSize * ratio));
};

export const ClassShape: React.FC<ShapeProps> = ({ component, isSelected }) => {
  const { width, height, data } = component;
  
  const headerFontSize = getScaledFontSize(component, 14);
  const bodyFontSize = getScaledFontSize(component, 12);

  const headerHeight = 35 * (width / 150);
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
        fontSize={headerFontSize}
      />

      <Text
        text={Array.isArray((data as any)?.attributes) ? (data as any).attributes.join('\n') : ''}
        x={5}
        y={headerHeight + 5}
        width={width - 10}
        fontSize={bodyFontSize}
        fontFamily="monospace"
      />

      <Text
        text={Array.isArray((data as any)?.methods) ? (data as any).methods.join('\n') : ''}
        x={5}
        y={secondLineY + 5}
        width={width - 10}
        fontSize={bodyFontSize}
        fontFamily="monospace"
      />
    </Group>
  );
};
