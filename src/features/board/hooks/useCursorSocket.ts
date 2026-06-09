import { useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  username: string;
  avatar: string | null;
}

export interface RoomProfileItem {
  id: string | number;
  username?: string;
  avatar?: string | null;
}

export type RemoteCursorProfiles = Record<string, UserProfile>;

export interface RemoteCursor {
  userId: string;
  x: number;
  y: number;
  profile: UserProfile;
}

interface UseCursorSocketOptions {
  boardToken: string | null;
  cursorId: number;
  username: string;
  avatarUrl?: string;
  onCursorUpdate: (cursors: Record<string, RemoteCursor>) => void;
}

// ─── Binary Packet Layout ─────────────────────────────────────────────────────
// Packet (fixed 12 bytes): [Id, X, Y]
//   [0..3]   Int32   — Id
//   [4..7]   Float32 — X
//   [8..11]  Float32 — Y

const PACKET_BYTES = 12;

function encodeCursorPacket(id: number, x: number, y: number): ArrayBuffer {
  const buffer = new ArrayBuffer(PACKET_BYTES);
  const view = new DataView(buffer);
  view.setInt32(0, id, true);
  view.setFloat32(4, x, true);
  view.setFloat32(8, y, true);
  return buffer;
}

function decodeCursorPacket(buffer: ArrayBuffer): { x: number; y: number; id: number } | null {
  try {
    if (buffer.byteLength < PACKET_BYTES) return null;
    const view = new DataView(buffer);
    const id = view.getInt32(0, true);
    const x = view.getFloat32(4, true);
    const y = view.getFloat32(8, true);
    return { id, x, y };
  } catch {
    return null;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STOMP_WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:9080/ws';
const WS_BASE_URL = (
  import.meta.env.VITE_CURSOR_WS_URL ??
  (typeof STOMP_WS_URL === 'string' ? STOMP_WS_URL.replace(/\/ws\/?$/, '') : 'ws://127.0.0.1:9080')
) as string;

const CURSOR_TIMEOUT_MS = 8_000;

// ─── Profile helpers ──────────────────────────────────────────────────────────

function parseProfileEntry(
  id: string,
  raw: string | UserProfile | RoomProfileItem
): UserProfile {
  if (typeof raw === 'object' && raw !== null) {
    return {
      username: (raw as any).username?.trim() || id,
      avatar:   (raw as any).avatar?.trim()   || null,
    };
  }
  const usernameMatch = raw.match(/username:\s*([^\n,]+)/i);
  const avatarMatch   = raw.match(/avatar:\s*([^\n,]+)/i);
  return {
    username: usernameMatch?.[1]?.trim() ?? id,
    avatar:   avatarMatch?.[1]?.trim()   || null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCursorSocket({
  boardToken,
  cursorId,
  username,
  avatarUrl,
  onCursorUpdate,
}: UseCursorSocketOptions) {
  const wsRef             = useRef<WebSocket | null>(null);
  const profileStoreRef   = useRef<RemoteCursorProfiles>({});
  const remoteCursorsRef  = useRef<Record<string, RemoteCursor>>({});
  const timeoutsRef       = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onCursorUpdateRef = useRef(onCursorUpdate);
  onCursorUpdateRef.current = onCursorUpdate;

  // ── Seed profiles from the join-room REST response ───────────────────────────
  const seedProfiles = useCallback((
    rawProfiles: Record<string, string | UserProfile> | RoomProfileItem[]
  ) => {
    if (Array.isArray(rawProfiles)) {
      for (const profile of rawProfiles) {
        if (profile == null || profile.id == null) continue;
        const id = String(profile.id);
        profileStoreRef.current[id] = parseProfileEntry(id, profile);
      }
      return;
    }
    for (const [id, raw] of Object.entries(rawProfiles)) {
      profileStoreRef.current[String(id)] = parseProfileEntry(String(id), raw);
    }
  }, []);

  // Keep local user's own profile up to date in the store
  useEffect(() => {
    const localId = String(cursorId);
    profileStoreRef.current[localId] = {
      username: username?.trim() || localId,
      avatar:   avatarUrl?.trim() || null,
    };
  }, [cursorId, username, avatarUrl]);

  // ── WebSocket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardToken) return;

    let cancelled = false;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (cancelled) return;

      const params = new URLSearchParams({
        board:     boardToken,
        id:        String(cursorId),
        username,
        avatarUrl: avatarUrl ?? '',
      });

      ws = new WebSocket(`${WS_BASE_URL}/sync-cursor?${params.toString()}`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useCursorSocket] Connected, cursorId:', cursorId);
      };

      ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const decoded = decodeCursorPacket(event.data);
        if (!decoded) return;

        const { x, y, id: remoteIdInt } = decoded;
        const remoteId = String(remoteIdInt);

        // Never render our own cursor
        if (remoteId === String(cursorId)) return;

        // Ensure profile exists (fallback if seed hasn't arrived yet)
        if (!profileStoreRef.current[remoteId]) {
          profileStoreRef.current[remoteId] = { username: remoteId, avatar: null };
        }

        const profile = profileStoreRef.current[remoteId];

        remoteCursorsRef.current = {
          ...remoteCursorsRef.current,
          [remoteId]: { userId: remoteId, x, y, profile },
        };

        // Reset stale-cursor timeout
        if (timeoutsRef.current[remoteId]) clearTimeout(timeoutsRef.current[remoteId]);
        timeoutsRef.current[remoteId] = setTimeout(() => {
          const next = { ...remoteCursorsRef.current };
          delete next[remoteId];
          remoteCursorsRef.current = next;
          onCursorUpdateRef.current(next);
        }, CURSOR_TIMEOUT_MS);

        onCursorUpdateRef.current(remoteCursorsRef.current);
      };

      ws.onclose = () => {
        if (!cancelled) {
          remoteCursorsRef.current = {};
          onCursorUpdateRef.current({});
        }
      };

      ws.onerror = (err) => {
        console.error('[useCursorSocket] WebSocket error:', err);
      };
    };

    // Defer by one tick to survive React Strict Mode's double-invoke
    const timer = setTimeout(connect, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (ws) {
        ws.onclose = null; // Prevent onclose from clearing cursors on intentional teardown
        ws.close();
      }
      wsRef.current = null;
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };
  }, [boardToken, cursorId, username, avatarUrl]);

  // ── Send local cursor position ───────────────────────────────────────────────
  const sendCursorPosition = useCallback((x: number, y: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(encodeCursorPacket(cursorId, x, y));
  }, [cursorId]);

  return { sendCursorPosition, seedProfiles, profileStoreRef };
}