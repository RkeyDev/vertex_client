import React, { memo, useState, useRef, useEffect } from 'react';
import { Group, Circle, Text } from 'react-konva';
import { type UmlComponent, type PortPosition, ComponentType } from '../types/board.types';
import { ClassShape, ServerShape, DatabaseShape } from './NodeShapes';

interface CanvasNodeProps {
  component: UmlComponent; // ACCEPT THE UNION HERE
  isSelected: boolean;
  onClick: () => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onPortMouseDown: (nodeId: string, port: PortPosition, x: number, y: number) => void;
  onPortMouseEnter: (nodeId: string, port: PortPosition) => void;
  onPortMouseLeave: () => void;
}

const CanvasNode: React.FC<CanvasNodeProps> = memo(({ 
  component, isSelected, onClick, onDragMove, onDragEnd, 
  onPortMouseDown, onPortMouseEnter, onPortMouseLeave 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<any>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.position({ x: component.xPox, y: component.yPos });
    }
  }, [component.xPox, component.yPos]);

  const renderShape = () => {
    const props = { component, isSelected };
    switch (component.type) {
      case ComponentType.SERVER: return <ServerShape {...props} />;
      case ComponentType.DATABASE: return <DatabaseShape {...props} />;
      default: return <ClassShape {...props} />;
    }
  };

  const ports: { id: PortPosition; x: number; y: number }[] = [
    { id: 'top', x: component.width / 2, y: 0 },
    { id: 'right', x: component.width, y: component.height / 2 },
    { id: 'bottom', x: component.width / 2, y: component.height },
    { id: 'left', x: 0, y: component.height / 2 },
  ];

  return (
    <Group
      ref={groupRef}
      draggable
      onClick={onClick}
      onDragStart={() => { isDragging.current = true; }}
      onDragMove={onDragMove}
      onDragEnd={(e) => { isDragging.current = false; onDragEnd(e); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderShape()}
      {component.type !== 'CLASS' && (
        <Text
          text={component.data?.header || ''}
          width={component.width}
          height={component.height}
          verticalAlign="middle"
          align="center"
          fontSize={14}
          fontStyle="bold"
          listening={false}
        />
      )}
      {(isSelected || isHovered) && ports.map((port) => (
        <Circle
          key={port.id}
          x={port.x} y={port.y} radius={6} fill="#3b82f6" stroke="white" strokeWidth={2}
          onMouseDown={(e) => {
            e.cancelBubble = true; 
            onPortMouseDown(component.id, port.id, component.xPox + port.x, component.yPos + port.y);
          }}
          onMouseEnter={() => onPortMouseEnter(component.id, port.id)}
          onMouseLeave={onPortMouseLeave}
        />
      ))}
    </Group>
  );
});

export default CanvasNode;