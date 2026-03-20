import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Arrow, Transformer } from 'react-konva';
import { type KonvaEventObject } from 'konva/lib/Node';
import { 
  type UmlComponent, 
  type UmlArrow, 
  type DraftConnection, 
  type PortPosition,
  ComponentType 
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
  // State Actions
  onStageDrag: (e: KonvaEventObject<DragEvent>) => void;
  onWheel: (e: KonvaEventObject<WheelEvent>) => void;
  onSelect: (id: string | null) => void;
  onComponentDragMove: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onComponentDragEnd: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onUpdateComponent: (id: string, updates: Partial<UmlComponent>) => void;
  onStageMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onStageMouseUp: (e: KonvaEventObject<MouseEvent>) => void;
  onPortMouseDown: (nodeId: string, port: PortPosition, x: number, y: number) => void;
  onPortMouseEnter: (nodeId: string, port: PortPosition) => void;
  onPortMouseLeave: () => void;
  onArrowControlPointDragMove: (arrowId: string, newPos: { x: number, y: number }) => void;
  onArrowHandleDragMove: (arrowId: string, handleType: 'start' | 'end', newPos: { x: number, y: number }, e: KonvaEventObject<DragEvent>) => void;
  onArrowHandleDragEnd: (arrowId: string, handleType: 'start' | 'end') => void;
  // History Actions (Command Pattern)
  onUndo: () => void;
  onRedo: () => void;
  onTakeSnapshot: () => void;
}

const Board: React.FC<BoardProps> = memo(({
  components, arrows, selectedId, draftConnection, stageSize, stagePos, stageScale,
  onStageDrag, onWheel, onSelect, onComponentDragMove, onComponentDragEnd, onUpdateComponent,
  onStageMouseMove, onStageMouseUp, onPortMouseDown, onPortMouseEnter, onPortMouseLeave,
  onArrowControlPointDragMove, onArrowHandleDragMove, onArrowHandleDragEnd,
  onUndo, onRedo, onTakeSnapshot
}) => {
  const trRef = useRef<any>(null);
  const nodesRef = useRef<Map<string, any>>(new Map());
  const [isTransforming, setIsTransforming] = useState(false);

  // --- Keyboard Shortcuts (Undo/Redo) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey; // Support Windows & Mac
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);

  // --- Selection Logic ---
  useEffect(() => {
    if (trRef.current) {
      const selectedNode = nodesRef.current.get(selectedId || '');
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    }
  }, [selectedId]);

  /**
   * handleTransform
   * Synchronizes scale values into absolute width/height to ensure 
   * text and strokes don't look distorted.
   */
  const handleTransform = useCallback(() => {
    if (!selectedId || !trRef.current) return;

    const node = trRef.current.nodes()[0];
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const newWidth = Math.max(50, node.width() * scaleX);
    const newHeight = Math.max(50, node.height() * scaleY);

    // Immediate visual reset to prevent "stretching"
    node.setAttrs({
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1,
    });

    onUpdateComponent(selectedId, {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      xPos: Math.round(node.x()), 
      yPos: Math.round(node.y()),
    });
  }, [selectedId, onUpdateComponent]);

  const handleTransformEnd = useCallback(() => {
    setIsTransforming(false);
    onTakeSnapshot(); // Finalize change in History Stack
  }, [onTakeSnapshot]);

  const handleDragEndInternal = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    onComponentDragEnd(e, id);
    onTakeSnapshot(); // Finalize movement in History Stack
  }, [onComponentDragEnd, onTakeSnapshot]);

  // --- Grid Visuals ---
  const GRID_SIZE = 40;
  const scaledGridSize = GRID_SIZE * stageScale;
  const gridStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    backgroundImage: `
      linear-gradient(to right, rgb(59, 131, 246, 0.1) 1px, transparent 1px),
      linear-gradient(to bottom, rgb(59, 131, 246, 0.1) 1px, transparent 1px)
    `,
    backgroundSize: `${scaledGridSize}px ${scaledGridSize}px`,
    backgroundPosition: `${stagePos.x}px ${stagePos.y}px`,
  };

  const draftStart = (() => {
    if (!draftConnection) return { x: 0, y: 0 };
    const startNode = components.find(c => c.id === draftConnection.startNodeId);
    return startNode ? getPortCoordinates(startNode, draftConnection.startPort) : { x: 0, y: 0 };
  })();

  return (
    <div style={gridStyle}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        draggable={!draftConnection && !isTransforming} 
        onDragMove={onStageDrag}
        onWheel={onWheel}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onClick={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
      >
        <Layer>
          {/* Connections/Arrows */}
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

          {/* Nodes/Components */}
          {components.map((comp) => (
            <CanvasNode 
              key={comp.id}
              ref={(el) => {
                if (el) nodesRef.current.set(comp.id, el);
                else nodesRef.current.delete(comp.id);
              }}
              component={comp} 
              isSelected={selectedId === comp.id}
              isTransforming={isTransforming}
              onClick={() => onSelect(comp.id)}
              onDragMove={(e: any) => onComponentDragMove(e, comp.id)}
              onDragEnd={(e: any) => handleDragEndInternal(e, comp.id)}
              onTransform={handleTransform} 
              onTransformEnd={handleTransformEnd}
              onPortMouseDown={onPortMouseDown}
              onPortMouseEnter={onPortMouseEnter}
              onPortMouseLeave={onPortMouseLeave}
            />
          ))}

          {/* Transformer (Overlay) */}
          {selectedId && components.find(c => c.id === selectedId) && (
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              keepRatio={false}
              anchorFill="#ffffff"
              anchorStroke="#3b82f6"
              anchorCornerRadius={2}
              anchorSize={8}
              borderStroke="#3b82f6"
              borderDash={[3, 3]}
              boundBoxFunc={(oldBox, newBox) => {
                // Minimum size constraint
                if (Math.abs(newBox.width) < 60 || Math.abs(newBox.height) < 60) {
                  return oldBox;
                }
                return newBox;
              }}
              onTransformStart={() => setIsTransforming(true)}
              onTransform={handleTransform} 
              onTransformEnd={handleTransformEnd}
            />
          )}

          {/* Active Connection Line (Drafting) */}
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