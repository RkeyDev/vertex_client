import React, { memo, useState } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { type UmlComponent, type PortPosition } from '../types/board.types';

interface CanvasNodeProps {
  component: UmlComponent;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onPortMouseDown: (nodeId: string, port: PortPosition, x: number, y: number) => void;
  onPortMouseEnter: (nodeId: string, port: PortPosition) => void;
  onPortMouseLeave: () => void;
}

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ 
  component, 
  isSelected, 
  onClick, 
  onDragEnd,
  onPortMouseDown,
  onPortMouseEnter,
  onPortMouseLeave
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate local coordinates for the 4 connection ports
  const ports: { id: PortPosition; x: number; y: number }[] = [
    { id: 'top', x: component.width / 2, y: 0 },
    { id: 'right', x: component.width, y: component.height / 2 },
    { id: 'bottom', x: component.width / 2, y: component.height },
    { id: 'left', x: 0, y: component.height / 2 },
  ];

  const showPorts = isSelected || isHovered;

  return (
    <Group
      x={component.xPox}
      y={component.yPos}
      draggable
      onClick={onClick}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      {/* Render Connection Ports */}
      {showPorts && ports.map((port) => (
        <Circle
          key={port.id}
          x={port.x}
          y={port.y}
          radius={6}
          fill="#3b82f6"
          stroke="white"
          strokeWidth={2}
          /* Prevent dragging the node when clicking a port */
          onMouseDown={(e) => {
            e.cancelBubble = true; 
            // Send absolute coordinates to the parent
            onPortMouseDown(
              component.id!, 
              port.id, 
              component.xPox + port.x, 
              component.yPos + port.y
            );
          }}
          onMouseEnter={() => onPortMouseEnter(component.id!, port.id)}
          onMouseLeave={onPortMouseLeave}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  );
});

export default CanvasNode;