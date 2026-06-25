export function useCurrentUser(): { userId: string; username: string; avatarUrl: string | undefined; email: string | null } {
  const rawData = localStorage.getItem('vertex_user');
  const user = rawData
    ? (() => { try { return JSON.parse(rawData); } catch { return null; } })()
    : null;

  const firstName: string = user?.firstName ?? '';
  const lastName: string  = user?.lastName  ?? '';
  const fullName = (firstName + ' ' + lastName).trim();

  const rawAvatar: string | undefined = user?.avatarUrl;

  return {
    userId:    user?.username ?? 'anon-' + Math.random().toString(36).slice(2),
    username:  fullName || user?.username || 'Anonymous',
    avatarUrl: rawAvatar,   // return as-is; callers decide what to do with it
    email:     (user?.email as string) ?? null,
  };
}