export function useCurrentUser(): { userId: string; username: string; avatarUrl: string | undefined; email: string | null } {
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
