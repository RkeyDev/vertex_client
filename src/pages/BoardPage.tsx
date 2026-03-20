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

// --- Utility ---
const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// --- History Hook ---
const useHistory = (initialState: { components: UmlComponent[], arrows: UmlArrow[] }) => {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState<typeof initialState[]>([]);
  const [future, setFuture] = useState<typeof initialState[]>([]);

  const takeSnapshot = useCallback(() => {
    setPast((prev) => [...prev, state]);
    setFuture([]);
  }, [state]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture((prev) => [state, ...prev]);
    setPast(newPast);
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast((prev) => [...prev, state]);
    setFuture(newFuture);
    setState(next);
  }, [future, state]);

  return { state, setState, takeSnapshot, undo, redo };
};

const BoardPage: React.FC = () => {
  // --- State Management via History ---
  const { state, setState, takeSnapshot, undo, redo } = useHistory({
    components: [],
    arrows: []
  });

  const { components, arrows } = state;
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

  const selectedArrow = useMemo(() => 
    arrows.find((a) => a.id === selectedId),
    [arrows, selectedId]
  );

  // --- Handlers ---

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    takeSnapshot(); // Record state before deletion

    setState(prev => ({
      components: prev.components.filter(c => c.id !== selectedId),
      arrows: prev.arrows.filter(a => a.id !== selectedId && a.fromId !== selectedId && a.toId !== selectedId)
    }));
    setSelectedId(null);
  }, [selectedId, takeSnapshot, setState]);

  const addComponent = useCallback((type: ComponentType) => {
    takeSnapshot();
    const id = `comp-${Date.now()}`;
    const baseProps = {
      id,
      xPos: Math.round((-stagePos.x + stageSize.width / 2) / stageScale - 75),
      yPos: Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width: 150,
      height: 120,
    };

    let newComp: UmlComponent;
    const data = { fontSize: 14 }; // Default font size from our previous update

    if (type === ComponentType.CLASS) {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { ...data, header: "NewClass", attributes: ["- id: int"], methods: ["+ save()"] } };
    } else if (type === ComponentType.SERVER) {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { ...data, header: "Server" } };
    } else {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { ...data, header: "DB" } };
    }

    setState(prev => ({ ...prev, components: [...prev.components, newComp] }));
  }, [stagePos, stageScale, stageSize, takeSnapshot, setState]);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UmlComponent>) => {
    setState(prev => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates } as UmlComponent : c))
    }));
  }, [setState]);

  const handleComponentDragMove = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    handleUpdateComponent(id, { 
        xPos: Math.round(e.target.x()), 
        yPos: Math.round(e.target.y()) 
    });
  }, [handleUpdateComponent]);

  const handleStageMouseUp = useCallback(() => {
    if (!draftConnection) return;

    const target = hoveredPortRef.current || findNearestPort(draftConnection.currentX, draftConnection.currentY, draftConnection.startNodeId);
    
    if (target) {
      takeSnapshot();
      const newArrow: UmlArrow = {
        id: `arrow-${Date.now()}`,
        fromId: draftConnection.startNodeId,
        fromPort: draftConnection.startPort,
        toId: target.nodeId,
        toPort: target.port,
        type: 'SOLID',
        headType: 'ARROW'
      };
      setState(prev => ({ ...prev, arrows: [...prev.arrows, newArrow] }));
    }
    setDraftConnection(null);
  }, [draftConnection, takeSnapshot, setState]);

  // Helper for arrow snapping
  const findNearestPort = (x: number, y: number, excludeNodeId?: string) => {
    const SNAP_THRESHOLD = 40; 
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

  // Stage interactions
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
          onStageDrag={(e) => e.target === e.target.getStage() && setStagePos({ x: e.target.x(), y: e.target.y() })}
          onWheel={handleWheel}
          onSelect={setSelectedId}
          onComponentDragMove={handleComponentDragMove}
          onComponentDragEnd={() => takeSnapshot()} // Snapshot on release
          onStageMouseMove={(e) => {
            if (!draftConnection) return;
            const stage = e.target.getStage()!;
            const pointer = stage.getPointerPosition()!;
            setDraftConnection(prev => prev ? { 
              ...prev, 
              currentX: (pointer.x - stage.x()) / stage.scaleX(), 
              currentY: (pointer.y - stage.y()) / stage.scaleY() 
            } : null);
          }}
          onStageMouseUp={handleStageMouseUp}
          onPortMouseDown={(nodeId, port, x, y) => setDraftConnection({ startNodeId: nodeId, startPort: port, currentX: x, currentY: y })}
          onPortMouseEnter={(nodeId, port) => { hoveredPortRef.current = { nodeId, port }; }}
          onPortMouseLeave={() => { hoveredPortRef.current = null; }}
          onArrowControlPointDragMove={(id, pos) => setState(prev => ({ ...prev, arrows: prev.arrows.map(a => a.id === id ? { ...a, controlPoint: pos } : a) }))}
          onArrowHandleDragMove={(id, type, pos) => setState(prev => ({
            ...prev,
            arrows: prev.arrows.map(a => a.id === id ? (type === 'start' ? { ...a, fromId: null, fromCoords: pos } : { ...a, toId: null, toCoords: pos }) : a)
          }))}
          onArrowHandleDragEnd={() => takeSnapshot()}
          onUpdateComponent={handleUpdateComponent}
          onUndo={undo}
          onRedo={redo}
          onTakeSnapshot={takeSnapshot}
        />

        {selectedComponent && (
            <PropertiesPanel 
                selectedComponent={selectedComponent} 
                onUpdate={(updates) => {
                  takeSnapshot();
                  handleUpdateComponent(selectedId!, updates);
                }} 
                onDelete={handleDeleteSelected}
                onClose={() => setSelectedId(null)} 
            />
        )}
        
        {selectedArrow && (
          <div className="absolute right-4 bottom-4 z-30">
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded shadow-lg hover:bg-red-700 font-bold transition-all"
            >
              Delete Selected Arrow
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BoardPage;