import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';
import { useLocation, useSearchParams } from 'react-router-dom';

import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components/Board';
import RemoteCursors from '../features/board/components/RemoteCursors';

import { useBoardSocket, type BoardTransform } from '../features/board/hooks/useBoardSocket';
import { useCursorSocket, type RemoteCursor } from '../features/board/hooks/useCursorSocket';
import { useDownloadSocket } from '../features/board/hooks/useDownloadSocket';
import { triggerFileDownload } from '../features/board/utils/triggerFileDownload';
import api from '../api/axiosInstance';

import {
  ComponentType,
  type UmlComponent,
  type UmlArrow,
  type DraftConnection,
  type PortPosition
} from '../features/board/types/board.types';

// Extracted modules
import { useCurrentUser } from '../features/board/utils/authUtils';
import { getOrCreateCursorId, getStoredBoardProfiles, normalizeProfiles } from '../features/board/utils/profileUtils';
import { useBoardHistory } from '../features/board/hooks/useBoardHistory';
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT, CURSOR_THROTTLE_MS, LIVE_BOARD_SYNC_MS } from '../features/board/constants/boardConstants';
import { type PendingDownload, type BoardLocationState } from '../features/board/types/page.types';
import ExportModal from '../features/board/components/ExportModal';
import DownloadToasts from '../features/board/components/DownloadToasts';
import LoadingScreen from '../features/board/components/LoadingScreen';

type ExportFileType = 'JPEG_ZIP' | 'PDF' | 'VERTEX';
type InternalExportFileType = ExportFileType | 'JPEG_THUMBNAIL';

const THUMBNAIL_EXPORT_IDLE_MS = 500;

const BoardPage: React.FC = () => {
  const location      = useLocation();
  const locationState = (location.state as BoardLocationState | null) ?? null;
  const [searchParams] = useSearchParams();
  const boardToken    = searchParams.get('id');

  const currentUser = useCurrentUser();

  const cursorId = useMemo(() => {
    const stateCursorId = locationState?.cursorId;
    if (typeof stateCursorId === 'number' && Number.isFinite(stateCursorId) && stateCursorId > 0) {
      return stateCursorId | 0;
    }
    return getOrCreateCursorId(boardToken);
  }, [boardToken, locationState?.cursorId]);

  const { state, setState, takeSnapshot, undo, redo } = useBoardHistory({
    components: [],
    arrows: [],
  });

  const { components, arrows } = state;
  const componentsRef = useRef(components);
  const arrowsRef     = useRef(arrows);
  componentsRef.current = components;
  arrowsRef.current     = arrows;

  const liveTransformsRef = useRef<Map<string, {
    xPos: number; yPos: number; width?: number; height?: number;
  }>>(new Map());

  const [selectedId,      setSelectedId]     = useState<string | null>(null);
  const [draftConnection, setDraftConnection] = useState<DraftConnection | null>(null);
  const hoveredPortRef                        = useRef<{ nodeId: string; port: PortPosition } | null>(null);

  const [stagePos,   setStagePos]   = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stageSize,  setStageSize]  = useState({
    width:  window.innerWidth  - SIDEBAR_WIDTH,
    height: window.innerHeight - TOPBAR_HEIGHT,
  });

  useEffect(() => {
    const handleResize = () => setStageSize({
      width:  window.innerWidth  - SIDEBAR_WIDTH,
      height: window.innerHeight - TOPBAR_HEIGHT,
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [remoteCursors,  setRemoteCursors]  = useState<Record<string, RemoteCursor>>({});
  const [liveTransforms, setLiveTransforms] = useState<Record<string, {
    xPos: number; yPos: number; width?: number; height?: number;
  }>>({});

  const [boardName,         setBoardName]         = useState<string>('Untitled');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportError,       setExportError]       = useState<string | null>(null);
  const [exportSuccess,     setExportSuccess]     = useState<boolean>(false);
  const thumbnailExportTimerRef = useRef<number | null>(null);
  const thumbnailExportPendingRef = useRef(false);

  // ── Download state ────────────────────────────────────────────────────────────
  const [pendingDownloads, setPendingDownloads] = useState<PendingDownload[]>([]);

  const buildExportPayload = useCallback((fileType: InternalExportFileType) => {
    const token = localStorage.getItem('sender_jwt') || localStorage.getItem('vertex_access_token') || '';
    let email = localStorage.getItem('sender_email') || '';
    if (!email) {
      try {
        const storedUser = localStorage.getItem('vertex_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          email = user.email || user.username || '';
        }
      } catch (e) {
        console.error('Failed to parse user email from localStorage', e);
      }
    }

    return {
      board_id:           boardToken,
      sender_jwt:         token,
      sender_email:       email,
      file_type:          fileType,
      board_metadata:     { boardName },
      canvas_data:        { components: componentsRef.current, arrows: arrowsRef.current },
      request_time_stamp: new Date().toISOString(),
    };
  }, [boardToken, boardName]);

  const queueThumbnailExport = useCallback(async () => {
    if (!boardToken) return;
    try {
      await api.post('/board/export-board', buildExportPayload('JPEG_THUMBNAIL'));
    } catch (err) {
      console.error('[BoardPage] Thumbnail export failed:', err);
    }
  }, [boardToken, buildExportPayload]);

  const scheduleThumbnailExport = useCallback(() => {
    if (!boardToken) return;
    thumbnailExportPendingRef.current = true;
    if (thumbnailExportTimerRef.current !== null) {
      window.clearTimeout(thumbnailExportTimerRef.current);
    }
    thumbnailExportTimerRef.current = window.setTimeout(() => {
      thumbnailExportTimerRef.current = null;
      thumbnailExportPendingRef.current = false;
      queueThumbnailExport();
    }, THUMBNAIL_EXPORT_IDLE_MS);
  }, [boardToken, queueThumbnailExport]);

  useEffect(() => {
    if (thumbnailExportPendingRef.current) {
      scheduleThumbnailExport();
    }
  }, [components, arrows, scheduleThumbnailExport]);

  useEffect(() => {
    return () => {
      if (thumbnailExportTimerRef.current !== null) {
        window.clearTimeout(thumbnailExportTimerRef.current);
      }
    };
  }, []);

  const handleExport = async (fileType: ExportFileType) => {
    setExportError(null);
    setExportSuccess(false);

    const clientKey = `${boardToken}:${fileType}:${Date.now()}`;
    setPendingDownloads(prev => [...prev, {
      clientKey,
      requestId: null,
      boardId:   boardToken ?? '',
      fileType,
    }]);
    setIsExportModalOpen(false);

    try {
      const response = await api.post('/board/export-board', buildExportPayload(fileType));
      if (response.status !== 200 && response.data?.responseCode !== '200') {
        setPendingDownloads(prev => prev.filter(d => d.clientKey !== clientKey));
        setExportError(response.data?.message || 'Failed to export board.');
        setIsExportModalOpen(true);
      } else {
        setExportSuccess(true);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setPendingDownloads(prev => prev.filter(d => d.clientKey !== clientKey));
      setExportError(err.message || 'An error occurred while exporting.');
      setIsExportModalOpen(true);
    }
  };

const { sendCursorPosition, seedProfiles } = useCursorSocket({
  boardToken,
  cursorId,
  username:  currentUser.username,
  avatarUrl: currentUser.avatarUrl?.startsWith('http') ? currentUser.avatarUrl : undefined,
  onCursorUpdate: setRemoteCursors,
});

  useEffect(() => {
    if (!boardToken) return;

    const storedProfiles = normalizeProfiles(getStoredBoardProfiles(boardToken));
    const roomProfiles   = normalizeProfiles(locationState?.cursorProfiles ?? {});
    const mergedProfiles = { ...storedProfiles, ...roomProfiles };

    const localId = String(cursorId);
    mergedProfiles[localId] = {
      username: currentUser.username,
      avatar:   currentUser.avatarUrl ?? null,
    };

    try {
      sessionStorage.setItem(`vertex_cursor_profiles:${boardToken}`, JSON.stringify(mergedProfiles));
      sessionStorage.setItem(`vertex_cursor_id:${boardToken}`, String(cursorId));
    } catch { /* ignore */ }

    seedProfiles(mergedProfiles);
  }, [boardToken, cursorId, currentUser.username, currentUser.avatarUrl, locationState?.cursorProfiles, seedProfiles]);

  useEffect(() => {
    if (!boardToken) return;

    api.post('/board/join-room', { boardToken })
      .then((res: any) => {
        const data = res.data?.data;
        if (data?.boardName) {
          setBoardName(data.boardName);
        }
        if (data?.profiles) {
          seedProfiles(data.profiles);
        }
        if (data?.currentUserProfileId != null) {
          const serverId = parseInt(data.currentUserProfileId, 10);
          if (Number.isFinite(serverId) && serverId > 0) {
            try { sessionStorage.setItem(`vertex_cursor_id:${boardToken}`, String(serverId)); } catch { /* ignore */ }
          }
        }
      })
      .catch((err: any) => {
        console.error('join-room failed:', err);
      });
  }, [boardToken, seedProfiles]);

  const unknownProfileFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!boardToken) return;

    const unknownCursors = Object.values(remoteCursors).filter(
      c => c.profile.username === c.userId && !unknownProfileFetchedRef.current.has(c.userId)
    );

    if (unknownCursors.length === 0) return;

    for (const c of unknownCursors) {
      unknownProfileFetchedRef.current.add(c.userId);
    }

    api.post('/board/join-room', { boardToken })
      .then((res: any) => {
        const data = res.data?.data;
        if (data?.profiles) {
          seedProfiles(data.profiles);
        }
      })
      .catch((err: any) => {
        console.error('[BoardPage] Profile re-fetch failed:', err);
        for (const c of unknownCursors) {
          unknownProfileFetchedRef.current.delete(c.userId);
        }
      });
  }, [boardToken, remoteCursors, seedProfiles]);

  const lastCursorSendRef    = useRef<number>(0);
  const lastLiveBoardSyncRef = useRef<number>(0);

  const handleStageReady = useCallback((_stage: any) => {
    (window as any).boardController = {
      setCamera: ({ x, y, zoom }: { x: number; y: number; zoom: number }) => {
        setStagePos({ x, y });
        setStageScale(zoom);
      },
    };
  }, [setStagePos, setStageScale]);

  // ── Board socket ──────────────────────────────────────────────────────────────
  const handleRemoteBoardState = useCallback((remoteState: {
    components: UmlComponent[];
    arrows: UmlArrow[];
  }) => {
    takeSnapshot();
    setState(remoteState);
    setLiveTransforms({});
  }, [setState, takeSnapshot]);

  const handleRemoteTransform = useCallback((transform: BoardTransform) => {
    setLiveTransforms(prev => ({
      ...prev,
      [transform.componentId]: {
        xPos:   transform.xPos,
        yPos:   transform.yPos,
        ...(transform.width  != null ? { width:  transform.width  } : {}),
        ...(transform.height != null ? { height: transform.height } : {}),
      },
    }));
  }, []);

  const { sendTransform, flushTransform, sendFullSync, isReady, client } = useBoardSocket({
    boardToken,
    onStateReceived:     handleRemoteBoardState,
    onTransformReceived: handleRemoteTransform,
  });

  // ── Download socket ───────────────────────────────────────────────────────────
  useDownloadSocket({
    client:        client.current,
    userEmail:     currentUser.email,
    onDownloadReady: async (notification) => {
      let matchedClientKey: string | null = null;
      setPendingDownloads(prev => {
        const match = prev.find(
          d => d.requestId === null
            && d.boardId  === notification.boardId
            && d.fileType.toLowerCase() === notification.fileType.toLowerCase()
        );
        matchedClientKey = match?.clientKey ?? null;
        return match
          ? prev.map(d => d.clientKey === match.clientKey
              ? { ...d, requestId: notification.requestId }
              : d)
          : prev;
      });

      try {
        await triggerFileDownload(notification.downloadUrl);
      } catch (err) {
        console.error('[BoardPage] Auto-download failed:', err);
      } finally {
        if (matchedClientKey) {
          setPendingDownloads(prev =>
            prev.filter(d => d.clientKey !== matchedClientKey)
          );
        }
      }
    },
  });

  const publishFullSync = useCallback(() => {
    const mergedComponents = componentsRef.current.map(c => {
      const patch = liveTransformsRef.current.get(c.id);
      return patch ? { ...c, ...patch } : c;
    });
    sendFullSync(mergedComponents, arrowsRef.current);
  }, [sendFullSync]);

  const publishLiveBoardSync = useCallback(() => {
    const now = performance.now();
    if (now - lastLiveBoardSyncRef.current < LIVE_BOARD_SYNC_MS) return;
    lastLiveBoardSyncRef.current = now;
    publishFullSync();
  }, [publishFullSync]);

  const applyAndSync = useCallback((
    updater: (prev: { components: UmlComponent[]; arrows: UmlArrow[] }) => {
      components: UmlComponent[]; arrows: UmlArrow[];
    }
  ) => {
    setState(prev => {
      const next = updater(prev);
      sendFullSync(next.components, next.arrows);
      return next;
    });
  }, [setState, sendFullSync]);

  const handleComponentLiveTransform = useCallback((
    componentId: string,
    patch: { xPos: number; yPos: number; width?: number; height?: number }
  ) => {
    liveTransformsRef.current.set(componentId, patch);
    setLiveTransforms(prev => ({ ...prev, [componentId]: patch }));
    sendTransform({ componentId, ...patch });
    publishLiveBoardSync();
    scheduleThumbnailExport();
  }, [sendTransform, publishLiveBoardSync, scheduleThumbnailExport]);

  const commitInteraction = useCallback(() => {
    flushTransform();
    takeSnapshot();

    if (liveTransformsRef.current.size > 0) {
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
        sendFullSync(next.components, arrowsRef.current);
        return next;
      });
    } else {
      publishFullSync();
    }
  }, [flushTransform, takeSnapshot, setState, sendFullSync, publishFullSync]);

  // ── Core handlers ──────────────────────────────────────────────────────────────

  const addComponent = useCallback((type: string) => {
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
    if (type === 'CLASS') {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'NewClass', attributes: ['- id: int'], methods: ['+ save()'] } };
    } else if (type === 'SERVER') {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { header: 'Server' } };
    } else if (type === 'DATABASE') {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { header: 'DB' } };
    } else if (type === 'INTERFACE') {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'Interface', shapeType: 'INTERFACE' }, width: 120, height: 120 };
    } else if (type === 'ACTOR') {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'Actor', shapeType: 'ACTOR' }, width: 80, height: 120 };
    } else if (type === 'USE_CASE') {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'UseCase', shapeType: 'USE_CASE' }, width: 150, height: 80 };
    } else {
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'NewClass' } };
    }

    applyAndSync(prev => ({ ...prev, components: [...prev.components, newComp] }));
    scheduleThumbnailExport();
  }, [stagePos, stageScale, stageSize, takeSnapshot, applyAndSync, scheduleThumbnailExport]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    takeSnapshot();
    applyAndSync(prev => ({
      components: prev.components.filter(c => c.id !== selectedId),
      arrows:     prev.arrows.filter(a =>
        a.id !== selectedId && a.fromId !== selectedId && a.toId !== selectedId
      ),
    }));
    setSelectedId(null);
  }, [selectedId, takeSnapshot, applyAndSync]);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<UmlComponent>) => {
    applyAndSync(prev => ({
      ...prev,
      components: prev.components.map(c =>
        c.id === id ? { ...c, ...updates } as UmlComponent : c
      ),
    }));
  }, [applyAndSync]);

  // ── Zoom ───────────────────────────────────────────────────────────────────────

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

  // ── Pointer broadcast ──────────────────────────────────────────────────────────

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
    () => components.map(c => liveTransforms[c.id] ? { ...c, ...liveTransforms[c.id] } : c),
    [components, liveTransforms]
  );

  // ── Guards (AFTER all hooks) ───────────────────────────────────────────────────

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
    return <LoadingScreen />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  const selectedComponent = components.find(c => c.id === selectedId);
  const selectedArrow     = arrows.find(a => a.id === selectedId);

  const remoteCursorsFiltered = Object.fromEntries(
    Object.entries(remoteCursors).filter(([id, cursor]) =>
      id !== String(cursorId) && cursor.profile.username !== cursor.userId
    )
  );

  return (
    <div className="flex h-screen w-screen bg-[#1a1a1a] overflow-hidden">
    <Sidebar
      onAddComponent={addComponent}
      username={currentUser.username}
      avatarUrl={currentUser.avatarUrl}
    />

      <main className="flex-1 flex flex-col relative bg-[#242424]">
        <TopBar 
          boardName={boardName}
          onBoardNameChange={setBoardName}
          onExportClick={() => setIsExportModalOpen(true)}
        />

        <DownloadToasts 
          pendingDownloads={pendingDownloads} 
          onDismiss={(key) => setPendingDownloads(prev => prev.filter(p => p.clientKey !== key))} 
        />

        <Board
          components={renderedComponents}
          arrows={arrows}
          selectedId={selectedId}
          draftConnection={draftConnection}
          stageSize={stageSize}
          stagePos={stagePos}
          stageScale={stageScale}
          onStageReady={handleStageReady}
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
              width:  e.target.width()  ? Math.round(e.target.width())  : undefined,
              height: e.target.height() ? Math.round(e.target.height()) : undefined,
            });
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
                if (dist < minDistance) { minDistance = dist; target = { nodeId: comp.id, port: p.port }; }
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
              const next = { ...prev, arrows: prev.arrows.map(a => a.id === id ? { ...a, controlPoint: pos } : a) };
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
                if (dist < minDistance) { minDistance = dist; target = { nodeId: comp.id, port: p.port }; }
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
          cursors={remoteCursorsFiltered}
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

        <ExportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
          exportError={exportError}
          exportSuccess={exportSuccess}
        />
      </main>
    </div>
  );
};

export default BoardPage;