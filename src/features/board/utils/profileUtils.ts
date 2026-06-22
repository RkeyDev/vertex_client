import { type RoomProfileItem, type UserProfile } from '../hooks/useCursorSocket';

export function getOrCreateCursorId(boardToken: string | null): number {
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

export function getStoredBoardProfiles(boardToken: string | null): unknown {
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

export function normalizeProfiles(source: unknown): Record<string, string | UserProfile> {
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
