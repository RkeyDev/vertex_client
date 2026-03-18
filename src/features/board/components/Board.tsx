import React, { memo } from 'react';
import { Stage, Layer } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { type UmlComponent } from '../types/board.types';
import CanvasNode from './CanvasNode';

interface BoardProps {
  components: UmlComponent[];
  selectedId: string | null;
  stageSize: { width: number; height: number };
  stagePos: { x: number; y: number };
  stageScale: number;
  onStageDrag: (e: KonvaEventObject<DragEvent>) => void;
  onWheel: (e: KonvaEventObject<WheelEvent>) => void;
  onSelect: (id: string | null) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, id: string) => void;
}

const Board: React.FC<BoardProps> = memo(({
  components,
  selectedId,
  stageSize,
  stagePos,
  stageScale,
  onStageDrag,
  onWheel,
  onSelect,
  onDragEnd,
}) => {
  
  // Use CSS for the grid. This is significantly faster than Konva Rects for large areas.
  const gridStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#ffffff',
    backgroundImage: `
      linear-gradient(#1a6abe1a 1px, transparent 1px),
      linear-gradient(90deg, #1a6abe1a 1px, transparent 1px)
    `,
    backgroundSize: `${40 * stageScale}px ${40 * stageScale}px`,
    backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
    cursor: 'crosshair',
    overflow: 'hidden',
  };

  return (
    <div style={gridStyle}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        draggable
        onDragMove={onStageDrag}
        onWheel={onWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
      >
        <Layer>
          {components.map((comp) => (
            <CanvasNode
              key={comp.id}
              component={comp}
              isSelected={selectedId === comp.id}
              onClick={() => onSelect(comp.id!)}
              onDragEnd={(e) => onDragEnd(e, comp.id!)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
});

export default Board;