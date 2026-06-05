import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';
import { useLocation, useSearchParams } from 'react-router-dom';

// Features & Components
import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components/Board';
import RemoteCursors from '../features/board/components/RemoteCursors';

// Hooks
import { useBoardSocket, type BoardTransform } from '../features/board/hooks/useBoardSocket';
import { useCursorSocket, type RemoteCursor, type RoomProfileItem, type UserProfile } from '../features/board/hooks/useCursorSocket';

// Types
import {
  ComponentType,
  type UmlComponent,
  type UmlArrow,
  type DraftConnection,
  type PortPosition
} from '../features/board/types/board.types';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function useCurrentUser(): { userId: string; username: string; avatarUrl: string | undefined } {
  return {
    userId:    (window as any).__VERTEX_USER_ID__    ?? 'anon-' + Math.random().toString(36).slice(2),
    username:  (window as any).__VERTEX_USERNAME__   ?? 'Anonymous',
    avatarUrl: (window as any).__VERTEX_AVATAR_URL__ ?? undefined,
  };
}

function getOrCreateCursorId(boardToken: string | null): number {
  const key = boardToken ? `vertex_cursor_id:${boardToken}` : 'vertex_cursor_id';
  try {
    const existing = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (existing != null) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed)) return parsed | 0;
    }
  } catch {
    // ignore storage failures
  }

  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const generated = ((buf[0] | 0) || 1);

  try {
    sessionStorage.setItem(key, String(generated));
  } catch {
    // ignore
  }
  return generated;
}

function getStoredBoardProfiles(boardToken: string | null): unknown {
  if (!boardToken) return {};
  const key = `vertex_cursor_profiles:${boardToken}`;
  try {
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

interface BoardLocationState {
  cursorProfiles?: Record<string, string> | RoomProfileItem[];
  cursorId?: number;
}

function normalizeProfiles(
  source: unknown
): Record<string, string | UserProfile> {
  const normalized: Record<string, string | UserProfile> = {};

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!entry || typeof entry !== 'object') continue;
      const profile = entry as RoomProfileItem;
      if (profile.id == null) continue;
      normalized[String(profile.id)] = {
        username: profile.username ?? String(profile.id),
        avatar: profile.avatar ?? null,
      };
    }
    return normalized;
  }

  if (source && typeof source === 'object') {
    for (const [id, value] of Object.entries(source as Record<string, unknown>)) {
      if (typeof value === 'string') {
        normalized[String(id)] = value;
      } else if (value && typeof value === 'object') {
        const obj = value as UserProfile;
        normalized[String(id)] = {
          username: obj.username ?? String(id),
          avatar: obj.avatar ?? null,
        };
      }
    }
  }

  return normalized;
}

// ─── Internal History Logic ───────────────────────────────────────────────────

const useHistory = (initialState: { components: UmlComponent[], arrows: UmlArrow[] }) => {
  const [state, setState] = useState(initialState);
  const [past, setPast]   = useState<typeof initialState[]>([]);
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

// ─── Component ────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH  = 256;
const TOPBAR_HEIGHT  = 48;

const CURSOR_THROTTLE_MS = 33;
const LIVE_BOARD_SYNC_MS = 50;

const BoardPage: React.FC = () => {
  const location = useLocation();
  const locationState = (location.state as BoardLocationState | null) ?? null;
  const [searchParams] = useSearchParams();
  const boardToken = searchParams.get('id');

  const currentUser = useCurrentUser();
  const cursorId = useMemo(() => {
    const stateCursorId = locationState?.cursorId;
    if (typeof stateCursorId === 'number' && Number.isFinite(stateCursorId)) {
      return stateCursorId | 0;
    }
    return getOrCreateCursorId(boardToken);
  }, [boardToken, locationState?.cursorId]);

  const { state, setState, takeSnapshot, undo, redo } = useHistory({
    components: [],
    arrows: []
  });

  const { components, arrows } = state;
  const componentsRef = useRef(components);
  const arrowsRef = useRef(arrows);
  componentsRef.current = components;
  arrowsRef.current = arrows;

  // Tracks the latest in-flight positions for components being dragged/resized.
  // We don't write these to React state during the drag (Konva owns the visual),
  // but we need them so commitInteraction can flush the correct final positions.
  const liveTransformsRef = useRef<Map<string, {
    xPos: number;
    yPos: number;
    width?: number;
    height?: number;
  }>>(new Map());

  const [selectedId, setSelectedId]             = useState<string | null>(null);
  const [draftConnection, setDraftConnection]   = useState<DraftConnection | null>(null);
  const hoveredPortRef                          = useRef<{ nodeId: string, port: PortPosition } | null>(null);

  // Stage Viewport State
  const [stagePos,   setStagePos]   = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize,  setStageSize]  = useState({
    width:  window.innerWidth  - SIDEBAR_WIDTH,
    height: window.innerHeight - TOPBAR_HEIGHT,
  });

  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width:  window.innerWidth  - SIDEBAR_WIDTH,
        height: window.innerHeight - TOPBAR_HEIGHT,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Remote cursors state ─────────────────────────────────────────────────────
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [liveTransforms, setLiveTransforms] = useState<Record<string, {
    xPos: number;
    yPos: number;
    width?: number;
    height?: number;
  }>>({});

  // ── Cursor socket ────────────────────────────────────────────────────────────
  const { sendCursorPosition, seedProfiles } = useCursorSocket({
    boardToken,
    cursorId,
    username:  currentUser.username,
    avatarUrl: currentUser.avatarUrl,
    onCursorUpdate: setRemoteCursors,
  });

  useEffect(() => {
    if (!boardToken) return;

    const storedProfiles = normalizeProfiles(getStoredBoardProfiles(boardToken));
    const roomProfiles = normalizeProfiles(locationState?.cursorProfiles ?? {});
    const mergedProfiles = {
      ...storedProfiles,
      ...roomProfiles,
    };

    const localId = String(cursorId);
    mergedProfiles[localId] =
      `username: ${currentUser.username},\navatar: ${currentUser.avatarUrl ?? ''}`;

    try {
      sessionStorage.setItem(`vertex_cursor_profiles:${boardToken}`, JSON.stringify(mergedProfiles));
      sessionStorage.setItem(`vertex_cursor_id:${boardToken}`, String(cursorId));
    } catch {
      // ignore storage failures
    }

    seedProfiles(mergedProfiles);
  }, [boardToken, cursorId, currentUser.username, currentUser.avatarUrl, locationState?.cursorProfiles, seedProfiles]);

  const lastCursorSendRef = useRef<number>(0);
  const lastLiveBoardSyncRef = useRef<number>(0);

  // ── Board data socket ────────────────────────────────────────────────────────
  const handleRemoteBoardState = useCallback((remoteState: {
    components: UmlComponent[];
    arrows: UmlArrow[];
  }) => {
    takeSnapshot();
    setState(remoteState);
  }, [setState, takeSnapshot]);

  const handleRemoteTransform = useCallback((transform: BoardTransform) => {
    console.log('[handleRemoteTransform] Received:', {
      componentId: transform.componentId,
      xPos: transform.xPos,
      yPos: transform.yPos,
    });
    
    setState(prev => {
      const updated = {
        ...prev,
        components: prev.components.map((c) =>
          c.id !== transform.componentId
            ? c
            : {
                ...c,
                xPos: transform.xPos,
                yPos: transform.yPos,
                ...(transform.width  != null ? { width:  transform.width  } : {}),
                ...(transform.height != null ? { height: transform.height } : {}),
              }
        ),
      };
      
      console.log('[handleRemoteTransform] Updated component:', {
        componentId: transform.componentId,
        newComponent: updated.components.find(c => c.id === transform.componentId),
      });
      
      return updated;
    });
  }, [setState]);

  const { sendTransform, flushTransform, sendFullSync, isReady } = useBoardSocket({
    boardToken,
    onStateReceived: handleRemoteBoardState,
    onTransformReceived: handleRemoteTransform,
  });

  const publishFullSync = useCallback(() => {
    sendFullSync(componentsRef.current, arrowsRef.current);
  }, [sendFullSync]);

  /** Throttled full sync for arrow drags (arrows use /sync, not /transform). */
  const publishLiveBoardSync = useCallback(() => {
    const now = performance.now();
    if (now - lastLiveBoardSyncRef.current < LIVE_BOARD_SYNC_MS) return;
    lastLiveBoardSyncRef.current = now;
    publishFullSync();
  }, [publishFullSync]);

  const applyAndSync = useCallback((
    updater: (prev: { components: UmlComponent[]; arrows: UmlArrow[] }) => {
      components: UmlComponent[];
      arrows: UmlArrow[];
    }
  ) => {
    setState(prev => {
      const next = updater(prev);
      sendFullSync(next.components, next.arrows);
      return next;
    });
  }, [setState, sendFullSync]);

  /**
   * Called on every drag-move / resize-move event.
   *
   * We deliberately do NOT call setState here — Konva already moves the node
   * visually without React needing to re-render. Writing to state on every pixel
   * would cause unnecessary re-renders and can fight Konva's own drag handling.
   *
   * Instead we:
   *   1. Record the latest position in liveTransformsRef so commitInteraction
   *      can flush the correct final value into React state after the drag ends.
   *   2. Call sendTransform so remote peers see the movement in real time
   *      (throttled to TRANSFORM_THROTTLE_MS inside useBoardSocket).
   */
  const handleComponentLiveTransform = useCallback((
    componentId: string,
    patch: { xPos: number; yPos: number; width?: number; height?: number }
  ) => {
    console.log('[handleComponentLiveTransform] Local drag update:', {
      componentId,
      xPos: patch.xPos,
      yPos: patch.yPos,
    });
    
    // Track latest position for flush on commit
    liveTransformsRef.current.set(componentId, patch);
    setLiveTransforms((prev) => ({ ...prev, [componentId]: patch }));

    // Broadcast to remote peers via the throttled /transform endpoint
    sendTransform({
      componentId,
      xPos:   patch.xPos,
      yPos:   patch.yPos,
      width:  patch.width,
      height: patch.height,
    });
  }, [sendTransform]);

  /**
   * Called when the user finishes a drag, resize, or any other interaction.
   *
   * Flushes any in-flight transform (sends the final position immediately,
   * bypassing the throttle), then writes the correct final positions into
   * React state, takes a history snapshot, and broadcasts a full sync so
   * all peers converge on the same state.
   */
  const commitInteraction = useCallback(() => {
    // Send the final transform immediately (bypass throttle)
    flushTransform();
    takeSnapshot();

    if (liveTransformsRef.current.size > 0) {
      // Flush live-dragged positions into React state, then sync
      const patches = new Map(liveTransformsRef.current);
      liveTransformsRef.current.clear();
      setLiveTransforms({});

      setState(prev => {
        const next = {
          ...prev,
          components: prev.components.map(c => {
            const patch = patches.get(c.id);
            return patch ? { ...c, ...patch } as UmlComponent : c;
          }),
        };
        // Sync with the correct, up-to-date positions
        sendFullSync(next.components, arrowsRef.current);
        return next;
      });
    } else {
      publishFullSync();
    }
  }, [flushTransform, takeSnapshot, setState, sendFullSync, publishFullSync]);

  // ── Core Handlers ─────────────────────────────────────────────────────────────

  const addComponent = useCallback((type: ComponentType) => {
    takeSnapshot();
    const id = `comp-${Date.now()}`;

    const baseProps = {
      id,
      xPos:   Math.round((-stagePos.x + stageSize.width  / 2) / stageScale - 75),
      yPos:   Math.round((-stagePos.y + stageSize.height / 2) / stageScale - 50),
      width:  150,
      height: 120,
    };

    let newComp: UmlComponent;

    if (type === ComponentType.CLASS) {
      newComp = {
        ...baseProps,
        type: ComponentType.CLASS,
        data: { header: "NewClass", attributes: ["- id: int"], methods: ["+ save()"] }
      };
    } else if (type === ComponentType.SERVER) {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { header: "Server" } };
    } else {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { header: "DB" } };
    }

    applyAndSync(prev => ({ ...prev, components: [...prev.components, newComp] }));
  }, [stagePos, stageScale, stageSize, takeSnapshot, applyAndSync]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    takeSnapshot();
    applyAndSync(prev => ({
      components: prev.components.filter(c => c.id !== selectedId),
      arrows:     prev.arrows.filter(a =>
        a.id !== selectedId && a.fromId !== selectedId && a.toId !== selectedId
      )
    }));
    setSelectedId(null);
  }, [selectedId, takeSnapshot, applyAndSync]);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UmlComponent>) => {
    applyAndSync(prev => ({
      ...prev,
      components: prev.components.map((c) =>
        c.id === id ? { ...c, ...updates } as UmlComponent : c
      ),
    }));
  }, [applyAndSync]);

  // ── Viewport Zoom ─────────────────────────────────────────────────────────────

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer  = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / 1.1 : oldScale * 1.1;
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // ── Pointer activity → cursor + live board sync ───────────────────────────────
  const broadcastPointerActivity = useCallback((e: KonvaEventObject<MouseEvent | DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const now = performance.now();
    if (now - lastCursorSendRef.current < CURSOR_THROTTLE_MS) return;
    lastCursorSendRef.current = now;

    const worldX = (pointer.x - stage.x()) / stage.scaleX();
    const worldY = (pointer.y - stage.y()) / stage.scaleY();
    sendCursorPosition(worldX, worldY);
  }, [sendCursorPosition]);

  const renderedComponents = useMemo(
    () => components.map((c) => (
      liveTransforms[c.id] ? { ...c, ...liveTransforms[c.id] } : c
    )),
    [components, liveTransforms]
  );

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (!boardToken) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1a1a1a] text-white">
        <p className="text-red-400 text-lg font-mono">
          No board ID found in URL. Expected: <code>/board?id=&lt;token&gt;</code>
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1a1a1a] text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="w-14 h-14 border-4 border-[#2a2a2a] border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold text-gray-200 tracking-wide">Connecting to Workspace</h2>
            <p className="text-sm text-gray-500 animate-pulse">Synchronizing board state...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const selectedComponent = components.find((c) => c.id === selectedId);
  const selectedArrow     = arrows.find((a) => a.id === selectedId);

  return (
    <div className="flex h-screen w-screen bg-[#1a1a1a] overflow-hidden">
      <Sidebar onAddComponent={addComponent} />

      <main className="flex-1 flex flex-col relative bg-[#242424]">
        <TopBar />

        <Board
          components={renderedComponents}
          arrows={arrows}
          selectedId={selectedId}
          draftConnection={draftConnection}
          stageSize={stageSize}
          stagePos={stagePos}
          stageScale={stageScale}
          onStageDrag={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
            broadcastPointerActivity(e);
          }}
          onPointerActivity={broadcastPointerActivity}
          onWheel={handleWheel}
          onSelect={setSelectedId}
          onComponentDragMove={(e, id) => {
            handleComponentLiveTransform(id, {
              xPos:   Math.round(e.target.x()),
              yPos:   Math.round(e.target.y()),
              // Forward size in case the node carries width/height attrs
              width:  e.target.width()  ? Math.round(e.target.width())  : undefined,
              height: e.target.height() ? Math.round(e.target.height()) : undefined,
            });
            // Keep remote cursors moving during drag
            broadcastPointerActivity(e);
          }}
          onComponentTransformMove={(id, patch) => handleComponentLiveTransform(id, patch)}
          onCommitInteraction={commitInteraction}
          onStageMouseMove={(e) => {
            broadcastPointerActivity(e);

            if (!draftConnection) return;
            const stage   = e.target.getStage()!;
            const pointer = stage.getPointerPosition()!;
            setDraftConnection(prev => prev ? {
              ...prev,
              currentX: (pointer.x - stage.x()) / stage.scaleX(),
              currentY: (pointer.y - stage.y()) / stage.scaleY(),
            } : null);
          }}
          onStageMouseUp={() => {
            if (!draftConnection) return;

            let target = null;
            let minDistance = 40;

            for (const comp of components) {
              if (comp.id === draftConnection.startNodeId) continue;

              const ports: { port: PortPosition; px: number; py: number }[] = [
                { port: 'top',    px: comp.xPos + comp.width / 2, py: comp.yPos },
                { port: 'bottom', px: comp.xPos + comp.width / 2, py: comp.yPos + comp.height },
                { port: 'left',   px: comp.xPos,                  py: comp.yPos + comp.height / 2 },
                { port: 'right',  px: comp.xPos + comp.width,     py: comp.yPos + comp.height / 2 },
              ];

              for (const p of ports) {
                const dist = Math.sqrt(
                  Math.pow(p.px - draftConnection.currentX, 2) +
                  Math.pow(p.py - draftConnection.currentY, 2)
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  target = { nodeId: comp.id, port: p.port };
                }
              }
            }

            if (!target && hoveredPortRef.current && hoveredPortRef.current.nodeId !== draftConnection.startNodeId) {
              target = hoveredPortRef.current;
            }

            if (target) {
              const newArrow: UmlArrow = {
                id: `arrow-${Date.now()}`,
                fromId:   draftConnection.startNodeId,
                fromPort: draftConnection.startPort,
                toId:     target.nodeId,
                toPort:   target.port,
                type:     'SOLID',
                headType: 'ARROW',
              };
              takeSnapshot();
              applyAndSync(prev => ({ ...prev, arrows: [...prev.arrows, newArrow] }));
            }

            setDraftConnection(null);
          }}
          onPortMouseDown={(nodeId, port, x, y) =>
            setDraftConnection({ startNodeId: nodeId, startPort: port, currentX: x, currentY: y })
          }
          onPortMouseEnter={(nodeId, port) => { hoveredPortRef.current = { nodeId, port }; }}
          onPortMouseLeave={() => { hoveredPortRef.current = null; }}
          onArrowControlPointDragMove={(id, pos, e) => {
            setState(prev => {
              const next = {
                ...prev,
                arrows: prev.arrows.map(a => a.id === id ? { ...a, controlPoint: pos } : a),
              };
              arrowsRef.current = next.arrows;
              return next;
            });
            publishLiveBoardSync();
            broadcastPointerActivity(e);
          }}
          onArrowControlPointDragEnd={() => commitInteraction()}
          onArrowHandleDragMove={(id, type, pos, e) => {
            setState(prev => {
              const next = {
                ...prev,
                arrows: prev.arrows.map(a =>
                  a.id === id
                    ? type === 'start'
                      ? { ...a, fromId: null, fromCoords: pos }
                      : { ...a, toId:   null, toCoords:   pos }
                    : a
                ),
              };
              arrowsRef.current = next.arrows;
              return next;
            });
            publishLiveBoardSync();
            broadcastPointerActivity(e);
          }}
          onArrowHandleDragEnd={(id, type) => {
            const arrow = arrowsRef.current.find(a => a.id === id);
            if (!arrow) { commitInteraction(); return; }

            const dropCoords = type === 'start' ? arrow.fromCoords : arrow.toCoords;
            if (!dropCoords) { commitInteraction(); return; }

            let target = null;
            let minDistance = 40;
            const excludeId = type === 'start' ? arrow.toId : arrow.fromId;

            for (const comp of componentsRef.current) {
              if (comp.id === excludeId) continue;

              const ports: { port: PortPosition; px: number; py: number }[] = [
                { port: 'top',    px: comp.xPos + comp.width / 2, py: comp.yPos },
                { port: 'bottom', px: comp.xPos + comp.width / 2, py: comp.yPos + comp.height },
                { port: 'left',   px: comp.xPos,                  py: comp.yPos + comp.height / 2 },
                { port: 'right',  px: comp.xPos + comp.width,     py: comp.yPos + comp.height / 2 },
              ];

              for (const p of ports) {
                const dist = Math.sqrt(
                  Math.pow(p.px - dropCoords.x, 2) +
                  Math.pow(p.py - dropCoords.y, 2)
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  target = { nodeId: comp.id, port: p.port };
                }
              }
            }

            takeSnapshot();
            if (target) {
              applyAndSync(prev => ({
                ...prev,
                arrows: prev.arrows.map(a =>
                  a.id === id
                    ? type === 'start'
                      ? { ...a, fromId: target!.nodeId, fromPort: target!.port, fromCoords: undefined }
                      : { ...a, toId:   target!.nodeId, toPort:   target!.port, toCoords:   undefined }
                    : a
                ),
              }));
            } else {
              publishFullSync();
            }
          }}
          onUndo={undo}
          onRedo={redo}
        />

        <RemoteCursors
          cursors={remoteCursors}
          stageTransform={{ x: stagePos.x, y: stagePos.y, scale: stageScale }}
          canvasOffsetX={SIDEBAR_WIDTH}
          canvasOffsetY={TOPBAR_HEIGHT}
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