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

/** Local RAM store: { [userId]: { username, avatar } } */
export type RemoteCursorProfiles = Record<string, UserProfile>;

export interface RemoteCursor {
  /** The integer id assigned when joining the board (stringified for map keys) */
  userId: string;
  x: number;
  y: number;
  profile: UserProfile;
}

interface UseCursorSocketOptions {
  boardToken: string | null;
  /** Integer id assigned when joining the board */
  cursorId: number;
  username: string;
  avatarUrl?: string;
  /** Called whenever a remote cursor position update arrives */
  onCursorUpdate: (cursors: Record<string, RemoteCursor>) => void;
}

// ─── Binary Packet Layout ─────────────────────────────────────────────────────
//
//  The RealTimeCursorHandler receives raw bytes, base64-encodes them, and
//  publishes them via Redis. On receive it base64-decodes back to the same bytes
//  and fans out as a BinaryMessage to all other sessions.
//
//  Packet (fixed 12 bytes) — matches your spec: [Id, X, Y]
//   [0..3]   Int32   — Id (assigned when joining the board)
//   [4..7]   Float32 — X  (world-space / board-space)
//   [8..11]  Float32 — Y  (world-space / board-space)

const PACKET_BYTES = 12;

function encodeCursorPacket(id: number, x: number, y: number): ArrayBuffer {
  const buffer = new ArrayBuffer(PACKET_BYTES);
  const view = new DataView(buffer);
  view.setInt32(0, id, true);       // little-endian
  view.setFloat32(4, x, true);
  view.setFloat32(8, y, true);
  return buffer;
}

function decodeCursorPacket(buffer: ArrayBuffer): { x: number; y: number; id: number } | null {
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < PACKET_BYTES) return null;
    const id = view.getInt32(0, true);
    const x = view.getFloat32(4, true);
    const y = view.getFloat32(8, true);
    return { id, x, y };
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Cursor WS endpoint is *not* the STOMP `/ws` endpoint.
 * If you set `VITE_CURSOR_WS_URL`, we use that. Otherwise we derive a base URL
 * from `VITE_WS_URL` by stripping a trailing `/ws`.
 */
const STOMP_WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:9080/ws';
const WS_BASE_URL = (import.meta.env.VITE_CURSOR_WS_URL
  ?? (typeof STOMP_WS_URL === 'string' ? STOMP_WS_URL.replace(/\/ws\/?$/, '') : 'ws://127.0.0.1:9080')
  ?? 'ws://127.0.0.1:9080') as string;
// Staleness timeout: remove cursor if no update in 8 s
const CURSOR_TIMEOUT_MS = 8_000;

function parseProfileEntry(
  id: string,
  raw: string | UserProfile | RoomProfileItem
): UserProfile {
  if (typeof raw === 'object' && raw !== null) {
    return {
      username: raw.username?.trim() || id,
      avatar: raw.avatar?.trim() || null,
    };
  }

  const usernameMatch = raw.match(/username:\s*([^\n,]+)/i);
  const avatarMatch = raw.match(/avatar:\s*([^\n,]+)/i);
  return {
    username: usernameMatch?.[1]?.trim() ?? id,
    avatar: avatarMatch?.[1]?.trim() || null,
  };
}

export function useCursorSocket({
  boardToken,
  cursorId,
  username,
  avatarUrl,
  onCursorUpdate,
}: UseCursorSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * Local RAM profile store.
   * Shape: { [userId]: { username, avatar } }
   * Populated from the JOIN response's userProfiles map and updated on each
   * incoming packet whose userId we haven't seen before.
   */
  const profileStoreRef = useRef<RemoteCursorProfiles>({});

  /** Live cursor positions + profile snapshot sent to the renderer */
  const remoteCursorsRef = useRef<Record<string, RemoteCursor>>({});

  /** Timeout handles used to expire stale cursors */
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onCursorUpdateRef = useRef(onCursorUpdate);
  onCursorUpdateRef.current = onCursorUpdate;

  // ── Seed profiles from the join-room REST response ──────────────────────────
  // Accepts both:
  // 1) Map format: { "1": "username: Alice,\navatar: <url>" }
  // 2) Array format: [{ id: "1", username: "Alice", avatar: "<url>" }]
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
    console.log('[seedProfiles] Profiles seeded, profileStoreRef now:', profileStoreRef.current);
  }, []);

  // Ensure the local user's own profile is always present in RAM.
  useEffect(() => {
    const localId = String(cursorId);
    profileStoreRef.current[localId] = {
      username: username?.trim() || localId,
      avatar: avatarUrl?.trim() || null,
    };
    console.log('[useCursorSocket useEffect] Local profile set for id:', localId, 'profileStoreRef now:', profileStoreRef.current);
  }, [cursorId, username, avatarUrl]);

  // ── Connect ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardToken) return;

    const params = new URLSearchParams({
      board:    boardToken,
      // Backend accepts `userId` or `id` — using `id` to match your integer cursor id
      id: String(cursorId),
      username,
      avatarUrl: avatarUrl ?? '',
    });

    const ws = new WebSocket(`${WS_BASE_URL}/sync-cursor?${params.toString()}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const decoded = decodeCursorPacket(event.data);
      if (!decoded) return;

      const { x, y, id: remoteIdInt } = decoded;
      const remoteId = String(remoteIdInt);

      // Ensure we have a profile entry (may have arrived before seed)
      if (!profileStoreRef.current[remoteId]) {
        profileStoreRef.current[remoteId] = { username: remoteId, avatar: null };
        console.log('[onmessage] Created placeholder profile for unknown remoteId:', remoteId, 'profileStoreRef now:', profileStoreRef.current);
      }

      const profile = profileStoreRef.current[remoteId];
      console.log('[onmessage] Cursor received - remoteId:', remoteId, 'x:', x, 'y:', y, 'profile:', profile, 'full profileStoreRef:', profileStoreRef.current);

      // Update cursor map
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

      console.log('[onmessage] Calling onCursorUpdate with remoteCursorsRef:', remoteCursorsRef.current);
      onCursorUpdateRef.current(remoteCursorsRef.current);
    };

    ws.onclose = () => {
      // Clear all cursors on disconnect
      console.log('[ws.onclose] WebSocket closed, clearing cursors and profileStoreRef');
      remoteCursorsRef.current = {};
      onCursorUpdateRef.current({});
    };

    return () => {
      console.log('[useCursorSocket cleanup] Disconnecting, profileStoreRef was:', profileStoreRef.current);
      ws.close();
      wsRef.current = null;
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };
  }, [boardToken, cursorId, username, avatarUrl]);

  // ── Send local cursor position ───────────────────────────────────────────────
  const sendCursorPosition = useCallback((x: number, y: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    console.log('[sendCursorPosition] Sending cursor packet - cursorId:', cursorId, 'x:', x, 'y:', y, 'profileStoreRef:', profileStoreRef.current);
    ws.send(encodeCursorPacket(cursorId, x, y));
  }, [cursorId]);

  return { sendCursorPosition, seedProfiles, profileStoreRef };
}