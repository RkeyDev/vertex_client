import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';
import { useSearchParams } from 'react-router-dom';

// Features & Components
import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components/Board';

// API Service
import { boardApi } from '../features/board/api/BoardApi';

// Types
import {
  ComponentType,
  type UmlComponent,
  type UmlArrow,
  type DraftConnection,
  type PortPosition
} from '../features/board/types/board.types';

// --- Internal History Logic ---
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
    setFuture((prev) => [state, ...prev]);
    setPast(past.slice(0, -1));
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((prev) => [...prev, state]);
    setFuture(future.slice(1));
    setState(next);
  }, [future, state]);

  return { state, setState, takeSnapshot, undo, redo };
};

const BoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const boardToken = searchParams.get('id');

  const { state, setState, takeSnapshot, undo, redo } = useHistory({
    components: [],
    arrows: []
  });

  const { components, arrows } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftConnection, setDraftConnection] = useState<DraftConnection | null>(null);
  const hoveredPortRef = useRef<{ nodeId: string, port: PortPosition } | null>(null);

  // Prevent remote updates from re-triggering the send effect
  const isRemoteUpdate = useRef(false);

  // Stage Viewport State
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

  // --- WebSocket Connection ---
  useEffect(() => {
    if (!boardToken) {
      console.warn('BoardPage: no board token found in URL (?id=...)');
      return;
    }

    boardApi.connect(boardToken, (remoteState) => {
      // Mark as remote so the send effect doesn't echo it back
      isRemoteUpdate.current = true;
      takeSnapshot();
      setState({
        components: remoteState.shapes ?? [],
        arrows: remoteState.arrows ?? []
      });
    });

    return () => {
      boardApi.disconnect();
    };
  }, [boardToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Debounced Send Effect ---
  useEffect(() => {
    // Skip sending if this state change came from a remote update
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // Dropped delay to 50ms for immediate real-time sync feeling.
    // Also removed the `length > 0` check so deleting all components correctly syncs an empty board to Redis.
    const id = setTimeout(() => {
      if (boardToken) {
        boardApi.saveBoard(components, arrows);
      }
    }, 50);

    return () => clearTimeout(id);
  }, [components, arrows, boardToken]);

  // --- Core Handlers ---

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

    if (type === ComponentType.CLASS) {
      newComp = {
        ...baseProps,
        type: ComponentType.CLASS,
        data: {
          header: "NewClass",
          attributes: ["- id: int"],
          methods: ["+ save()"]
        }
      };
    } else if (type === ComponentType.SERVER) {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { header: "Server" } };
    } else {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { header: "DB" } };
    }

    setState(prev => ({ ...prev, components: [...prev.components, newComp] }));
  }, [stagePos, stageScale, stageSize, takeSnapshot, setState]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    takeSnapshot();
    setState(prev => ({
      components: prev.components.filter(c => c.id !== selectedId),
      arrows: prev.arrows.filter(a =>
        a.id !== selectedId &&
        a.fromId !== selectedId &&
        a.toId !== selectedId
      )
    }));
    setSelectedId(null);
  }, [selectedId, takeSnapshot, setState]);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UmlComponent>) => {
    setState(prev => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, ...updates } as UmlComponent : c
      )
    }));
  }, [setState]);

  // --- Viewport Zoom ---
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.1 : oldScale * 1.1;
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    });
  };

  // --- Guard: no token ---
  if (!boardToken) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1a1a1a] text-white">
        <p className="text-red-400 text-lg font-mono">
          No board ID found in URL. Expected: <code>/board?id=&lt;token&gt;</code>
        </p>
      </div>
    );
  }

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
          onStageDrag={(e) =>
            e.target === e.target.getStage() &&
            setStagePos({ x: e.target.x(), y: e.target.y() })
          }
          onWheel={handleWheel}
          onSelect={setSelectedId}
          onComponentDragMove={(e, id) =>
            handleUpdateComponent(id, {
              xPos: Math.round(e.target.x()),
              yPos: Math.round(e.target.y())
            })
          }
          onComponentDragEnd={() => takeSnapshot()}
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
          onStageMouseUp={() => {
            if (!draftConnection) return;
            setDraftConnection(null);
          }}
          onPortMouseDown={(nodeId, port, x, y) =>
            setDraftConnection({ startNodeId: nodeId, startPort: port, currentX: x, currentY: y })
          }
          onPortMouseEnter={(nodeId, port) => { hoveredPortRef.current = { nodeId, port }; }}
          onPortMouseLeave={() => { hoveredPortRef.current = null; }}
          onArrowControlPointDragMove={(id, pos) =>
            setState(prev => ({
              ...prev,
              arrows: prev.arrows.map(a => a.id === id ? { ...a, controlPoint: pos } : a)
            }))
          }
          onArrowHandleDragMove={(id, type, pos) =>
            setState(prev => ({
              ...prev,
              arrows: prev.arrows.map(a =>
                a.id === id
                  ? type === 'start'
                    ? { ...a, fromId: null, fromCoords: pos }
                    : { ...a, toId: null, toCoords: pos }
                  : a
              )
            }))
          }
          onArrowHandleDragEnd={() => takeSnapshot()}
          onUpdateComponent={handleUpdateComponent}
          onUndo={undo}
          onRedo={redo}
          onTakeSnapshot={takeSnapshot}
        />

        {selectedComponent && (
          <PropertiesPanel
            selectedComponent={selectedComponent}
            onUpdate={(updates) => { takeSnapshot(); handleUpdateComponent(selectedId!, updates); }}
            onDelete={handleDeleteSelected}
            onClose={() => setSelectedId(null)}
          />
        )}

        {selectedArrow && (
          <div className="absolute right-4 bottom-4 z-30">
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition-all"
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