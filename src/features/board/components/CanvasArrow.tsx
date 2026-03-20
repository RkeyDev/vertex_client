import React, { memo } from 'react';
import { Group, Arrow, Circle } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { 
  type UmlArrow, 
  type UmlComponent, 
  type PortPosition 
} from '../types/board.types';

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
  const { xPos, yPos, width, height } = node;
  switch (port) {
    case 'top':    return { x: xPos + width / 2, y: yPos };
    case 'right':  return { x: xPos + width,     y: yPos + height / 2 };
    case 'bottom': return { x: xPos + width / 2, y: yPos + height };
    case 'left':   return { x: xPos,             y: yPos + height / 2 };
    default:       return { x: xPos,             y: yPos };
  }
};

const CanvasArrow: React.FC<CanvasArrowProps> = memo(({
  arrow, fromNode, toNode, isSelected, onClick, 
  onHandleDragMove, onHandleDragEnd, onControlPointDragMove
}) => {
  // Calculate Start Point
  const start = fromNode && arrow.fromPort 
    ? getPortCoordinates(fromNode, arrow.fromPort) 
    : (arrow.fromCoords || { x: 0, y: 0 });

  // Calculate End Point
  const end = toNode && arrow.toPort 
    ? getPortCoordinates(toNode, arrow.toPort) 
    : (arrow.toCoords || { x: 0, y: 0 });

  // Calculate/Retrieve Control Point for the curve
  const control = arrow.controlPoint || { 
    x: (start.x + end.x) / 2, 
    y: (start.y + end.y) / 2 
  };

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
        hitStrokeWidth={20}
      />
      
      {isSelected && (
        <>
          {/* Start Point Handle */}
          <Circle
            x={start.x} y={start.y} radius={5} fill="#3b82f6" draggable
            onDragMove={(e) => onHandleDragMove(arrow.id, 'start', { x: e.target.x(), y: e.target.y() }, e as any)}
            onDragEnd={() => onHandleDragEnd(arrow.id, 'start')}
          />
          {/* End Point Handle */}
          <Circle
            x={end.x} y={end.y} radius={5} fill="#3b82f6" draggable
            onDragMove={(e) => onHandleDragMove(arrow.id, 'end', { x: e.target.x(), y: e.target.y() }, e as any)}
            onDragEnd={() => onHandleDragEnd(arrow.id, 'end')}
          />
          {/* Quadratic Curve Control Handle */}
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