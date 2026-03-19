import React, { memo } from 'react';
import { Stage, Layer, Arrow } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { 
  type UmlComponent, 
  type UmlArrow, 
  type DraftConnection, 
  type PortPosition 
} from '../types/board.types';
import CanvasNode from './CanvasNode';
import CanvasArrow, { getPortCoordinates } from './CanvasArrow';

interface BoardProps {
  components: UmlComponent[];
  arrows: UmlArrow[];
  selectedId: string | null;
  draftConnection: DraftConnection | null;
  stageSize: { width: number; height: number };
  stagePos: { x: number; y: number };
  stageScale: number;
  onStageDrag: (e: KonvaEventObject<DragEvent>) => void;
  onWheel: (e: KonvaEventObject<WheelEvent>) => void;
  onSelect: (id: string | null) => void;
  onComponentDragMove: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onComponentDragEnd: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onStageMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onStageMouseUp: (e: KonvaEventObject<MouseEvent>) => void;
  onPortMouseDown: (nodeId: string, port: PortPosition, x: number, y: number) => void;
  onPortMouseEnter: (nodeId: string, port: PortPosition) => void;
  onPortMouseLeave: () => void;
  onArrowControlPointDragMove: (arrowId: string, newPos: { x: number, y: number }) => void;
  onArrowHandleDragMove: (arrowId: string, handleType: 'start' | 'end', newPos: { x: number, y: number }, e: KonvaEventObject<DragEvent>) => void;
  onArrowHandleDragEnd: (arrowId: string, handleType: 'start' | 'end') => void;
}

const Board: React.FC<BoardProps> = memo(({
  components, arrows, selectedId, draftConnection, stageSize, stagePos, stageScale,
  onStageDrag, onWheel, onSelect, onComponentDragMove, onComponentDragEnd,
  onStageMouseMove, onStageMouseUp, onPortMouseDown, onPortMouseEnter, onPortMouseLeave,
  onArrowControlPointDragMove, onArrowHandleDragMove, onArrowHandleDragEnd,
}) => {
  const GRID_STEP = 40;
  const scaledGridSize = GRID_STEP * stageScale;

  const gridStyle: React.CSSProperties = {
    width: '100%', height: '100%', backgroundColor: '#ffffff',
    backgroundImage: `linear-gradient(to right, rgb(39, 107, 159) 1px, transparent 1px), linear-gradient(to bottom, rgb(39, 107, 159) 1px, transparent 1px)`,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
    backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
    cursor: draftConnection ? 'crosshair' : 'default',
    overflow: 'hidden', position: 'relative', display: 'flex'
  };

  const getDraftStartCoords = () => {
    if (!draftConnection) return { x: 0, y: 0 };
    const startNode = components.find(c => c.id === draftConnection.startNodeId);
    if (!startNode) return { x: 0, y: 0 };
    return getPortCoordinates(startNode, draftConnection.startPort);
  };

  const draftStart = getDraftStartCoords();

  return (
    <div style={gridStyle}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        draggable={!draftConnection} 
        onDragMove={onStageDrag}
        onWheel={onWheel}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onClick={(e) => { if (e.target === e.target.getStage()) onSelect(null); }}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
      >
        <Layer>
          {arrows.map((arrow) => (
            <CanvasArrow
              key={arrow.id}
              arrow={arrow}
              fromNode={components.find(c => c.id === arrow.fromId)}
              toNode={components.find(c => c.id === arrow.toId)}
              isSelected={selectedId === arrow.id}
              onClick={() => onSelect(arrow.id)}
              onControlPointDragMove={onArrowControlPointDragMove}
              onHandleDragMove={onArrowHandleDragMove}
              onHandleDragEnd={onArrowHandleDragEnd}
            />
          ))}

          {components.map((comp) => (
            <CanvasNode
              key={comp.id}
              component={comp}
              isSelected={selectedId === comp.id}
              onClick={() => onSelect(comp.id!)}
              onDragMove={(e) => onComponentDragMove(e, comp.id!)}
              onDragEnd={(e) => onComponentDragEnd(e, comp.id!)}
              onPortMouseDown={onPortMouseDown}
              onPortMouseEnter={onPortMouseEnter}
              onPortMouseLeave={onPortMouseLeave}
            />
          ))}

          {draftConnection && (
            <Arrow
              points={[draftStart.x, draftStart.y, draftConnection.currentX, draftConnection.currentY]}
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[10, 5]}
              pointerLength={10}
              pointerWidth={10}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
});

export default Board;