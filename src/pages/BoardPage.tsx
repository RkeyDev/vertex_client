import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';

import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components/Board';

import { 
  ComponentType, 
  type UmlComponent, 
  type UmlArrow, 
  type DraftConnection, 
  type PortPosition 
} from '../features/board/types/board.types';

const BoardPage: React.FC = () => {
  const [components, setComponents] = useState<UmlComponent[]>([]);
  const [arrows, setArrows] = useState<UmlArrow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftConnection, setDraftConnection] = useState<DraftConnection | null>(null);
  const hoveredPortRef = useRef<{ nodeId: string, port: PortPosition } | null>(null);

  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize, setStageSize] = useState({
    width: window.innerWidth - 256,
    height: window.innerHeight - 80,
  });

  const selectedComponent = useMemo(() => 
    components.find((c) => c.id === selectedId), 
    [components, selectedId]
  );

  const addComponent = useCallback((type: ComponentType) => {
    const newComp: UmlComponent = {
      id: `comp-${Date.now()}`,
      xPox: Math.round((-stagePos.x + stageSize.width / 2) / stageScale - 75),
      yPos: Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width: 150,
      height: 100,
      type: type,
      content: "New " + type.toLowerCase().charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
    };
    setComponents((prev) => [...prev, newComp]);
  }, [stagePos, stageScale, stageSize]);

  const handleComponentDragMove = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, xPox: Math.round(e.target.x()), yPos: Math.round(e.target.y()) }
          : c
      )
    );
  }, []);

  const handleUpdateComponent = useCallback((updates: Partial<UmlComponent>) => {
    if (!selectedId) return;
    setComponents((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, ...updates } : c))
    );
  }, [selectedId]);

  const handlePortMouseDown = useCallback((nodeId: string, port: PortPosition, x: number, y: number) => {
    setDraftConnection({ startNodeId: nodeId, startPort: port, currentX: x, currentY: y });
  }, []);

  const handlePortMouseEnter = useCallback((nodeId: string, port: PortPosition) => {
    hoveredPortRef.current = { nodeId, port };
  }, []);

  const handlePortMouseLeave = useCallback(() => {
    hoveredPortRef.current = null;
  }, []);

  const handleArrowControlPointDragMove = useCallback((arrowId: string, newPos: { x: number, y: number }) => {
    setArrows(prev => prev.map(a => 
      a.id === arrowId ? { ...a, controlPoint: newPos } : a
    ));
  }, []);

  // --- RECONNECTION LOGIC START ---

  const handleArrowHandleDragMove = useCallback((
    arrowId: string, 
    handleType: 'start' | 'end', 
    newPos: { x: number, y: number },
    e: KonvaEventObject<DragEvent>
  ) => {
    // 1. Update visual position of the unattached handle
    setArrows((prev) => prev.map((a) => {
      if (a.id !== arrowId) return a;
      return handleType === 'start' 
        ? { ...a, fromId: null, fromPort: undefined, fromCoords: newPos }
        : { ...a, toId: null, toPort: undefined, toCoords: newPos };
    }));

    // 2. Perform manual hit-test to find a port under the cursor
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Temporarily disable listening on the dragging handle so we can see what's under it
    e.target.listening(false);
    const intersectedNode = stage.getIntersection(pointer);
    e.target.listening(true);

    if (intersectedNode && intersectedNode.name() === 'port-handle') {
      const nodeId = intersectedNode.getAttr('data-node-id');
      const port = intersectedNode.getAttr('data-port-type') as PortPosition;
      
      if (nodeId && port) {
        hoveredPortRef.current = { nodeId, port };
      }
    } else {
      hoveredPortRef.current = null;
    }
  }, []);

  const handleArrowHandleDragEnd = useCallback((arrowId: string, handleType: 'start' | 'end') => {
    const target = hoveredPortRef.current;
    
    setArrows((prev) => prev.map((a) => {
      if (a.id !== arrowId) return a;

      if (target) {
        // Successfully re-attached to a new port
        return handleType === 'start' 
          ? { ...a, fromId: target.nodeId, fromPort: target.port, fromCoords: undefined }
          : { ...a, toId: target.nodeId, toPort: target.port, toCoords: undefined };
      }
      return a;
    }));
    
    hoveredPortRef.current = null;
  }, []);

  // --- RECONNECTION LOGIC END ---

  const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!draftConnection) return;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const currentX = (pointer.x - stage.x()) / stage.scaleX();
    const currentY = (pointer.y - stage.y()) / stage.scaleY();

    setDraftConnection(prev => prev ? { ...prev, currentX, currentY } : null);
  }, [draftConnection]);

  const handleStageMouseUp = useCallback(() => {
    if (!draftConnection) return;

    const targetPort = hoveredPortRef.current;
    
    if (targetPort && targetPort.nodeId !== draftConnection.startNodeId) {
      const newArrow: UmlArrow = {
        id: `arrow-${Date.now()}`,
        fromId: draftConnection.startNodeId,
        fromPort: draftConnection.startPort,
        toId: targetPort.nodeId,
        toPort: targetPort.port,
        type: 'SOLID',
        headType: 'ARROW'
      };
      setArrows(prev => [...prev, newArrow]);
    }

    setDraftConnection(null);
  }, [draftConnection]);

  const handleStageDrag = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(newScale, 5));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth - 256,
        height: window.innerHeight - 80,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setComponents((prev) => prev.filter((c) => c.id !== selectedId));
        setArrows((prev) => prev.filter((a) => a.id !== selectedId));
        setArrows((prev) => prev.filter((a) => a.fromId !== selectedId && a.toId !== selectedId));
        setSelectedId(null);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId]);

  return (
    <div className="flex h-screen w-screen bg-[#333] overflow-hidden font-sans select-none">
      <Sidebar onAddComponent={addComponent} />
      
      <main className="flex-1 flex flex-col relative">
        <TopBar />
        
        <Board
          components={components}
          arrows={arrows}
          selectedId={selectedId}
          draftConnection={draftConnection}
          stageSize={stageSize}
          stagePos={stagePos}
          stageScale={stageScale}
          onStageDrag={handleStageDrag}
          onWheel={handleWheel}
          onSelect={setSelectedId}
          onComponentDragMove={handleComponentDragMove}
          onComponentDragEnd={handleComponentDragMove}
          onStageMouseMove={handleStageMouseMove}
          onStageMouseUp={handleStageMouseUp}
          onPortMouseDown={handlePortMouseDown}
          onPortMouseEnter={handlePortMouseEnter}
          onPortMouseLeave={handlePortMouseLeave}
          onArrowControlPointDragMove={handleArrowControlPointDragMove}
          onArrowHandleDragMove={handleArrowHandleDragMove}
          onArrowHandleDragEnd={handleArrowHandleDragEnd}
        />

        <PropertiesPanel
          selectedComponent={selectedComponent}
          onUpdate={handleUpdateComponent}
          onClose={() => setSelectedId(null)}
        />
      </main>
    </div>
  );
};

export default BoardPage;