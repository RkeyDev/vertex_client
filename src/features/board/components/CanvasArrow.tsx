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
  onHandleDragMove: (arrowId: string, handleType: 'start' | 'end', newPos: { x: number, y: number }, e: KonvaEventObject<DragEvent>) => void;
  onHandleDragEnd: (arrowId: string, handleType: 'start' | 'end') => void;
  onControlPointDragMove: (arrowId: string, newPos: { x: number, y: number }) => void;
}

export const getPortCoordinates = (node: UmlComponent, port: PortPosition) => {
  switch (port) {
    case 'top': return { x: node.xPox + node.width / 2, y: node.yPos };
    case 'right': return { x: node.xPox + node.width, y: node.yPos + node.height / 2 };
    case 'bottom': return { x: node.xPox + node.width / 2, y: node.yPos + node.height };
    case 'left': return { x: node.xPox, y: node.yPos + node.height / 2 };
  }
};

const CanvasArrow: React.FC<CanvasArrowProps> = memo(({
  arrow, fromNode, toNode, isSelected, onClick, 
  onHandleDragMove, onHandleDragEnd, onControlPointDragMove
}) => {
  const start = fromNode && arrow.fromPort ? getPortCoordinates(fromNode, arrow.fromPort) : (arrow.fromCoords || { x: 0, y: 0 });
  const end = toNode && arrow.toPort ? getPortCoordinates(toNode, arrow.toPort) : (arrow.toCoords || { x: 0, y: 0 });
  const control = arrow.controlPoint || { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  return (
    <Group onClick={onClick}>
      <Arrow
        points={[start.x, start.y, control.x, control.y, end.x, end.y]}
        tension={0.5}
        stroke={isSelected ? "#3b82f6" : "#555"}
        strokeWidth={2}
        fill={isSelected ? "#3b82f6" : "#555"}
        dash={arrow.type === 'DASHED' ? [10, 5] : []}
        pointerLength={10}
        pointerWidth={10}
      />
      
      {isSelected && (
        <>
          <Circle
            x={start.x} y={start.y} radius={5} fill="#3b82f6" draggable
            onDragMove={(e) => onHandleDragMove(arrow.id, 'start', { x: e.target.x(), y: e.target.y() }, e)}
            onDragEnd={() => onHandleDragEnd(arrow.id, 'start')}
          />
          <Circle
            x={end.x} y={end.y} radius={5} fill="#3b82f6" draggable
            onDragMove={(e) => onHandleDragMove(arrow.id, 'end', { x: e.target.x(), y: e.target.y() }, e)}
            onDragEnd={() => onHandleDragEnd(arrow.id, 'end')}
          />
          <Circle
            x={control.x} y={control.y} radius={6} fill="white" stroke="#3b82f6" strokeWidth={2} draggable
            onDragMove={(e) => onControlPointDragMove(arrow.id, { x: e.target.x(), y: e.target.y() })}
          />
        </>
      )}
    </Group>
  );
});

export default CanvasArrow;