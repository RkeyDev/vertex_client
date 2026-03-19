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

import { getPortCoordinates } from '../features/board/components/CanvasArrow';

// Utility for proximity calculation
const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

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
    const id = `comp-${Date.now()}`;
    const baseProps = {
      id,
      xPox: Math.round((-stagePos.x + stageSize.width / 2) / stageScale - 75),
      yPos: Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width: 150,
      height: 120, // Increased default height for 3-section class
    };

    let newComp: UmlComponent;
    if (type === ComponentType.CLASS) {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: "NewClass", attributes: ["- id: int"], methods: ["+ save()"] } };
    } else if (type === ComponentType.SERVER) {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { header: "Server" } };
    } else {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { header: "DB" } };
    }

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
      prev.map((c) => (c.id === selectedId ? { ...c, ...updates } as UmlComponent : c))
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

  const findNearestPort = (x: number, y: number, excludeNodeId?: string) => {
    const SNAP_THRESHOLD = 40; // Pixels
    let closest: { nodeId: string, port: PortPosition } | null = null;
    let minDistance = SNAP_THRESHOLD;

    components.forEach((comp) => {
      if (comp.id === excludeNodeId) return;
      const ports: PortPosition[] = ['top', 'right', 'bottom', 'left'];
      ports.forEach((p) => {
        const coords = getPortCoordinates(comp, p);
        const dist = getDistance(x, y, coords.x, coords.y);
        if (dist < minDistance) {
          minDistance = dist;
          closest = { nodeId: comp.id, port: p };
        }
      });
    });
    return closest;
  };

  const handleArrowHandleDragMove = useCallback((
    arrowId: string, 
    handleType: 'start' | 'end', 
    newPos: { x: number, y: number }
  ) => {
    setArrows((prev) => prev.map((a) => {
      if (a.id !== arrowId) return a;
      return handleType === 'start' 
        ? { ...a, fromId: null, fromPort: undefined, fromCoords: newPos }
        : { ...a, toId: null, toPort: undefined, toCoords: newPos };
    }));
  }, []);

  const handleArrowHandleDragEnd = useCallback((arrowId: string, handleType: 'start' | 'end') => {
    setArrows((prev) => prev.map((a) => {
      if (a.id !== arrowId) return a;
      
      const coords = handleType === 'start' ? a.fromCoords : a.toCoords;
      const nearest = coords ? findNearestPort(coords.x, coords.y) : hoveredPortRef.current;

      if (nearest) {
        return handleType === 'start' 
          ? { ...a, fromId: nearest.nodeId, fromPort: nearest.port, fromCoords: undefined }
          : { ...a, toId: nearest.nodeId, toPort: nearest.port, toCoords: undefined };
      }
      return a;
    }));
  }, [components]);

  const handleStageMouseUp = useCallback(() => {
    if (!draftConnection) return;

    // Use hoveredPortRef if precise, otherwise search for nearest
    const target = hoveredPortRef.current || findNearestPort(draftConnection.currentX, draftConnection.currentY, draftConnection.startNodeId);
    
    if (target) {
      const newArrow: UmlArrow = {
        id: `arrow-${Date.now()}`,
        fromId: draftConnection.startNodeId,
        fromPort: draftConnection.startPort,
        toId: target.nodeId,
        toPort: target.port,
        type: 'SOLID',
        headType: 'ARROW'
      };
      setArrows(prev => [...prev, newArrow]);
    }

    setDraftConnection(null);
  }, [draftConnection, components]);

  const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!draftConnection) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    setDraftConnection(prev => prev ? { 
      ...prev, 
      currentX: (pointer.x - stage.x()) / stage.scaleX(), 
      currentY: (pointer.y - stage.y()) / stage.scaleY() 
    } : null);
  }, [draftConnection]);

  // Boilerplate stage handlers
  const handleStageDrag = (e: KonvaEventObject<DragEvent>) => e.target === e.target.getStage() && setStagePos({ x: e.target.x(), y: e.target.y() });
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.1 : oldScale * 1.1;
    setStageScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  return (
    <div className="flex h-screen w-screen bg-[#1a1a1a] overflow-hidden">
      <Sidebar onAddComponent={addComponent} />
      <main className="flex-1 flex flex-col relative bg-[#242424]">
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
          onArrowControlPointDragMove={(id, pos) => setArrows(prev => prev.map(a => a.id === id ? { ...a, controlPoint: pos } : a))}
          onArrowHandleDragMove={handleArrowHandleDragMove}
          onArrowHandleDragEnd={handleArrowHandleDragEnd}
        />
        <PropertiesPanel selectedComponent={selectedComponent} onUpdate={handleUpdateComponent} onClose={() => setSelectedId(null)} />
      </main>
    </div>
  );
};

export default BoardPage;