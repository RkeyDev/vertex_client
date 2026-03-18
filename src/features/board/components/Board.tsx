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

/**
 * Board Component
 * * Renders the main drawing canvas for UML components. 
 * Uses React-Konva for high-performance canvas manipulation and 
 * standard CSS for the background grid to keep the canvas layer clean.
 */
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
  
  // Base grid size in pixels
  const GRID_STEP = 40;
  const scaledGridSize = GRID_STEP * stageScale;

  const gridStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    /* Using two linear gradients to create a cross-hatch grid.
       The first defines horizontal lines, the second defines vertical lines.
    */
    backgroundImage: `
      linear-gradient(to right, rgb(26, 105, 190) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(26, 105, 190) 1px, transparent 1px)
    `,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,

    backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
    cursor: 'crosshair',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex'
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