import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type KonvaEventObject } from 'konva/lib/Node';
import { useLocation, useSearchParams } from 'react-router-dom';

import Sidebar from '../features/board/components/SideBar';
import TopBar from '../features/board/components/TopBar';
import PropertiesPanel from '../features/board/components/PropertiesPanel';
import Board from '../features/board/components/Board';
import RemoteCursors from '../features/board/components/RemoteCursors';

import { useBoardSocket, type BoardTransform } from '../features/board/hooks/useBoardSocket';
import { useCursorSocket, type RemoteCursor, type RoomProfileItem, type UserProfile } from '../features/board/hooks/useCursorSocket';
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

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function useCurrentUser(): { userId: string; username: string; avatarUrl: string | undefined; email: string | null } {
  const rawData = localStorage.getItem('vertex_user');
  const user = rawData
    ? (() => { try { return JSON.parse(rawData); } catch { return null; } })()
    : null;

  const firstName: string = user?.firstName ?? '';
  const lastName: string  = user?.lastName  ?? '';
  const fullName = (firstName + ' ' + lastName).trim();

  // Never pass base64 data URLs as the avatar — WebSocket query strings
  // have length limits. Only pass http/https URLs.
  const rawAvatar: string | undefined = user?.avatarUrl;
  const safeAvatarUrl =
    rawAvatar && rawAvatar.startsWith('http') ? rawAvatar : undefined;

  return {
    userId:    user?.username ?? 'anon-' + Math.random().toString(36).slice(2),
    username:  fullName || user?.username || 'Anonymous',
    avatarUrl: safeAvatarUrl,
    email:     (user?.email as string) ?? null,
  };
}

function getOrCreateCursorId(boardToken: string | null): number {
  const key = boardToken ? `vertex_cursor_id:${boardToken}` : 'vertex_cursor_id';
  try {
    const existing = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (existing != null) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed) && parsed > 0) return parsed | 0;
    }
  } catch { /* ignore */ }

  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const generated = (buf[0] % 1_000_000) || 1;
  try { sessionStorage.setItem(key, String(generated)); } catch { /* ignore */ }
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

function normalizeProfiles(source: unknown): Record<string, string | UserProfile> {
  const normalized: Record<string, string | UserProfile> = {};

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!entry || typeof entry !== 'object') continue;
      const profile = entry as RoomProfileItem;
      if (profile.id == null) continue;
      normalized[String(profile.id)] = {
        username: profile.username ?? String(profile.id),
        avatar:   profile.avatar   ?? null,
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
          avatar:   obj.avatar   ?? null,
        };
      }
    }
  }

  return normalized;
}

// ─── History ──────────────────────────────────────────────────────────────────

const useHistory = (initialState: { components: UmlComponent[]; arrows: UmlArrow[] }) => {
  const [state, setState]   = useState(initialState);
  const [past, setPast]     = useState<typeof initialState[]>([]);
  const [future, setFuture] = useState<typeof initialState[]>([]);

  const takeSnapshot = useCallback(() => {
    setPast(prev => [...prev, state]);
    setFuture([]);
  }, [state]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [state, ...prev]);
    setPast(past.slice(0, -1));
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, state]);
    setFuture(future.slice(1));
    setState(next);
  }, [future, state]);

  return { state, setState, takeSnapshot, undo, redo };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH      = 256;
const TOPBAR_HEIGHT      = 48;
const CURSOR_THROTTLE_MS = 33;
const LIVE_BOARD_SYNC_MS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingDownload {
  // clientKey is generated at click-time so the toast appears immediately,
  // before the backend even acknowledges the request.
  // requestId is null until the STOMP notification arrives and is then used
  // to clear the toast after the download completes.
  clientKey:  string;
  requestId:  string | null;
  boardId:    string;
  fileType:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const { state, setState, takeSnapshot, undo, redo } = useHistory({
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

  // ── Download state ────────────────────────────────────────────────────────────
  const [pendingDownloads, setPendingDownloads] = useState<PendingDownload[]>([]);

  const handleExport = async (fileType: 'JPEG' | 'PDF' | 'VERTEX') => {
    setExportError(null);

    // ── Show the loading toast immediately on click ───────────────────────────
    // We don't wait for the backend — the toast appears the instant the user
    // picks a format so there's no perceived lag.
    const clientKey = `${boardToken}:${fileType}:${Date.now()}`;
    setPendingDownloads(prev => [...prev, {
      clientKey,
      requestId: null,   // filled in when the STOMP notification arrives
      boardId:   boardToken ?? '',
      fileType,
    }]);
    setIsExportModalOpen(false);

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

    const payload = {
      board_id:           boardToken,
      sender_jwt:         token,
      sender_email:       email,
      file_type:          fileType,
      board_metadata:     { boardName },
      canvas_data:        { components, arrows },
      request_time_stamp: new Date().toISOString(),
    };

    try {
      const response = await api.post('/board/export-board', payload);
      if (response.status !== 200 && response.data?.responseCode !== '200') {
        // Queue failed — remove the toast and show the error in-place
        setPendingDownloads(prev => prev.filter(d => d.clientKey !== clientKey));
        setExportError(response.data?.message || 'Failed to export board.');
        setIsExportModalOpen(true);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setPendingDownloads(prev => prev.filter(d => d.clientKey !== clientKey));
      setExportError(err.message || 'An error occurred while exporting.');
      setIsExportModalOpen(true);
    }
  };

  // ── Cursor socket ──────────────────────────────────────────────────────────────
  const { sendCursorPosition, seedProfiles } = useCursorSocket({
    boardToken,
    cursorId,
    username:  currentUser.username,
    avatarUrl: currentUser.avatarUrl,
    onCursorUpdate: setRemoteCursors,
  });

  // Seed profiles from nav state or sessionStorage
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

  // ── Join-room and retrieve board info on mount ───────────────────────────────
  useEffect(() => {
    if (!boardToken) return;

    api.post('/board/join-room', { boardToken })
      .then((res: any) => {
        const data = res.data?.data;
        console.log('join-room response:', JSON.stringify(data, null, 2));
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

  // ── Auto-fetch profiles for unknown cursors ──────────────────────────────────
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

  // ── boardController — exposed for the Playwright screenshot worker ────────────
  const handleStageReady = useCallback((_stage: any) => {
    console.log('[vertex] handleStageReady v2 — using setState');
    window.boardController = {
      setCamera: ({ x, y, zoom }: { x: number; y: number; zoom: number }) => {
        console.log('[vertex] setCamera via setState', x, y, zoom);
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
      // Grab the clientKey of the matching pending toast up-front, before any
      // async work. clientKey is stable from click-time so there is no stale-
      // closure / batching race the way there would be with requestId (which
      // starts as null and gets set in a separate state update).
      let matchedClientKey: string | null = null;
      setPendingDownloads(prev => {
        const match = prev.find(
          d => d.requestId === null
            && d.boardId  === notification.boardId
            && d.fileType.toLowerCase() === notification.fileType.toLowerCase()
        );
        matchedClientKey = match?.clientKey ?? null;
        // Stamp the requestId on while we're here — useful for debugging
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
        // Clear by clientKey — always set, never null, no batching race
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
  }, [sendTransform, publishLiveBoardSync]);

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
      newComp = { ...baseProps, type: ComponentType.CLASS, data: { header: 'NewClass', attributes: ['- id: int'], methods: ['+ save()'] } };
    } else if (type === ComponentType.SERVER) {
      newComp = { ...baseProps, type: ComponentType.SERVER, data: { header: 'Server' } };
    } else {
      newComp = { ...baseProps, type: ComponentType.DATABASE, data: { header: 'DB' } };
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
      <Sidebar onAddComponent={addComponent} />

      <main className="flex-1 flex flex-col relative bg-[#242424]">
        <TopBar 
          boardName={boardName}
          onBoardNameChange={setBoardName}
          onExportClick={() => setIsExportModalOpen(true)}
        />

        {/* ── Download-ready toasts ─────────────────────────────────────────── */}
        {pendingDownloads.length > 0 && (
          <div className="absolute top-14 right-4 z-40 flex flex-col gap-2">
            {pendingDownloads.map(d => (
              <div
                key={d.clientKey}
                className="flex items-center gap-3 bg-[#1e1e1e] border border-blue-500/40
                           text-gray-200 text-sm px-4 py-3 rounded-xl shadow-lg"
              >
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>
                  {d.requestId === null ? 'Preparing' : 'Downloading'}{' '}
                  <span className="font-semibold text-blue-400">{d.fileType}</span>{' '}
                  export…
                </span>
                <button
                  onClick={() => setPendingDownloads(prev => prev.filter(p => p.clientKey !== d.clientKey))}
                  className="ml-2 text-gray-500 hover:text-gray-200 transition-colors text-base leading-none flex-shrink-0"
                  aria-label="Dismiss"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

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

        {/* ── Export modal ──────────────────────────────────────────────────── */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 animate-fade-in">
            <div className="bg-[#EAEAEA] rounded-2xl shadow-2xl p-8 flex flex-col space-y-6 w-[450px] border border-gray-300 animate-scale-in">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-[#333]">Export Board</h3>
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-gray-500 hover:text-gray-800 text-3xl font-bold transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>
              
              <p className="text-sm text-gray-600 font-medium -mt-2">
                Select the format you wish to export this board in.
              </p>

              <div className="flex flex-col space-y-4">
                {[
                  { type: 'JPEG',   label: 'Image',        desc: 'Download standard JPEG image file' },
                  { type: 'PDF',    label: 'PDF Document', desc: 'Save board as a printable PDF document' },
                  { type: 'VERTEX', label: '.Vertex File', desc: 'Custom file type to import back later' },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handleExport(opt.type as any)}
                    className="w-full flex items-center p-4 bg-white border-2 border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 transition-all text-left group cursor-pointer shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="text-lg font-black text-[#333] group-hover:text-blue-700 transition-colors">
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                    <div className="ml-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xl">
                      &rarr;
                    </div>
                  </button>
                ))}
              </div>

              {exportError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
                  {exportError}
                </div>
              )}

              {exportSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm font-semibold text-center animate-pulse">
                  Export queued! Your download will start automatically.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="py-2.5 px-6 rounded-lg border-2 border-gray-400 text-gray-700 font-bold hover:bg-gray-200 active:bg-gray-300 transition-all cursor-pointer shadow-sm text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BoardPage;