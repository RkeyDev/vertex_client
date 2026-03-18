import React, { memo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { type UmlComponent } from '../types/board.types';

interface CanvasNodeProps {
  component: UmlComponent;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ component, isSelected, onClick, onDragEnd }) => {
  return (
    <Group
      x={component.xPox}
      y={component.yPos}
      draggable
      onClick={onClick}
      onDragEnd={onDragEnd}
    >
      <Rect
        width={component.width}
        height={component.height}
        fill="white"
        stroke={isSelected ? "#3b82f6" : "#303030"}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        shadowBlur={isSelected ? 10 : 5}
        shadowOpacity={0.1}
        /* Performance: Disables double-buffering for standard shapes */
        perfectDrawEnabled={false}
      />
      <Text
        text={component.content}
        width={component.width}
        height={component.height}
        verticalAlign="middle"
        align="center"
        fontSize={18}
        fontStyle="bold"
        fill="#333"
        perfectDrawEnabled={false}
      />
    </Group>
  );
});

export default CanvasNode;