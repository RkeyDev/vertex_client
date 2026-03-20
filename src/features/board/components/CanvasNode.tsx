import React, { memo, useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { Group, Circle, Text } from 'react-konva';
import { type UmlComponent, type PortPosition, ComponentType } from '../types/board.types';
import { ClassShape, ServerShape, DatabaseShape } from './NodeShapes';

interface CanvasNodeProps {
  component: UmlComponent;
  isSelected: boolean;
  isTransforming: boolean;
  onClick: (e: any) => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransform?: (e: any) => void;
  onTransformEnd: (e: any) => void;
  onPortMouseDown: (nodeId: string, port: PortPosition, x: number, y: number) => void;
  onPortMouseEnter: (nodeId: string, port: PortPosition) => void;
  onPortMouseLeave: () => void;
}

const CanvasNode = memo(forwardRef<any, CanvasNodeProps>(({ 
  component, isSelected, isTransforming, onClick, onDragMove, onDragEnd, 
  onTransform, onTransformEnd, onPortMouseDown, onPortMouseEnter, onPortMouseLeave 
}, ref) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const internalRef = useRef<any>(null);
  const textRef = useRef<any>(null);

  useImperativeHandle(ref, () => internalRef.current);

  /**
   * --- DYNAMIC TYPOGRAPHY LOGIC ---
   * Get the custom font size from the PropertiesPanel (stored in component.data)
   * If it doesn't exist, default to 14.
   * Apply a multiplier if the user is currently transforming the node.
   */
  const displayFontSize = useMemo(() => {
    const baseSize = (component.data as any)?.fontSize || 14;
    
    // If you want the font to still scale relatively when the box is resized:
    // we use a reference width (e.g. 150) to calculate the current ratio.
    const REFERENCE_WIDTH = 150;
    const ratio = component.width / REFERENCE_WIDTH;
    
    // This allows manual overrides from the panel to be the "starting point"
    return Math.max(8, Math.round(baseSize * ratio));
  }, [component.width, (component.data as any)?.fontSize]);

  // Ensure Konva text internal cache clears when font changes
  useEffect(() => {
    if (textRef.current) {
      textRef.current.fontSize(displayFontSize);
      // Force redraw of the text layer
      textRef.current.getLayer()?.batchDraw();
    }
  }, [displayFontSize]);

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
      ref={internalRef}
      id={component.id}
      x={component.xPos} 
      y={component.yPos}
      width={component.width}
      height={component.height}
      draggable
      onClick={onClick}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderShape()}
      
      {component.type !== ComponentType.CLASS && (
        <Text
          ref={textRef}
          text={component.data?.header || ''}
          width={component.width}
          height={component.height}
          verticalAlign="middle"
          align="center"
          fontSize={displayFontSize}
          fontStyle="bold"
          listening={false}
          wrap="none"
          ellipsis={true}
        />
      )}

      {(isSelected || isHovered) && !isTransforming && ports.map((port) => (
        <Circle
          key={port.id}
          x={port.x} 
          y={port.y} 
          radius={6} 
          fill="#3b82f6" 
          stroke="white" 
          strokeWidth={2}
          onMouseDown={(e) => {
            e.cancelBubble = true; 
            onPortMouseDown(
              component.id, 
              port.id, 
              component.xPos + port.x, 
              component.yPos + port.y
            );
          }}
          onMouseEnter={() => onPortMouseEnter(component.id, port.id)}
          onMouseLeave={onPortMouseLeave}
        />
      ))}
    </Group>
  );
}));

export default CanvasNode;