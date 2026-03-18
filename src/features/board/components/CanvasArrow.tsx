import React, { memo } from 'react';
import { Group, Arrow, Circle } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { type UmlArrow, type UmlComponent, type PortPosition } from '../types/board.types';

interface CanvasArrowProps {
  arrow: UmlArrow;
  fromNode?: UmlComponent;
  toNode?: UmlComponent;
  isSelected: boolean;
  onClick: () => void;
  onControlPointDragEnd: (arrowId: string, newPos: { x: number, y: number }) => void;
}

// Utility to get absolute coords of a port
export const getPortCoordinates = (node: UmlComponent, port: PortPosition) => {
  switch (port) {
    case 'top': return { x: node.xPox + node.width / 2, y: node.yPos };
    case 'right': return { x: node.xPox + node.width, y: node.yPos + node.height / 2 };
    case 'bottom': return { x: node.xPox + node.width / 2, y: node.yPos + node.height };
    case 'left': return { x: node.xPox, y: node.yPos + node.height / 2 };
  }
};

const CanvasArrow: React.FC<CanvasArrowProps> = memo(({
  arrow,
  fromNode,
  toNode,
  isSelected,
  onClick,
  onControlPointDragEnd
}) => {
  if (!fromNode || !toNode) return null;

  const start = getPortCoordinates(fromNode, arrow.fromPort);
  const end = getPortCoordinates(toNode, arrow.toPort);

  // If no manual control point exists, default to the midpoint
  const control = arrow.controlPoint || {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return (
    <Group onClick={onClick}>
      <Arrow
        points={[start.x, start.y, control.x, control.y, end.x, end.y]}
        tension={0.5} // Konva uses this for smooth bezier curves
        stroke={isSelected ? "#3b82f6" : "#555"}
        strokeWidth={2}
        fill={isSelected ? "#3b82f6" : "#555"}
        dash={arrow.type === 'DASHED' ? [10, 5] : []}
        pointerLength={10}
        pointerWidth={10}
        perfectDrawEnabled={false}
      />
      
      {/* Draggable control point for curving the arrow, visible only when selected */}
      {isSelected && (
        <Circle
          x={control.x}
          y={control.y}
          radius={8}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={2}
          draggable
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            e.cancelBubble = true;
            onControlPointDragEnd(arrow.id, { x: e.target.x(), y: e.target.y() });
          }}
          onDragMove={(e) => e.cancelBubble = true}
        />
      )}
    </Group>
  );
});

export default CanvasArrow;