/**
 * Tracks sections a member was locked out of, so the app can tell them the
 * moment their workspace link or role assignment is granted.
 */
const KEY = "rst_pending_access";

export interface PendingAccess {
  path: string;
  label: string;
  since: string;
}

function storageKey(userId: string) {
  return `${KEY}:${userId}`;
}

export function getPendingAccess(userId: string): PendingAccess[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as PendingAccess[]) : [];
  } catch {
    return [];
  }
}

function save(userId: string, items: PendingAccess[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 20)));
  } catch {
    /* storage unavailable — watching is best effort */
  }
}

export function rememberBlockedPath(userId: string, path: string, label: string) {
  const items = getPendingAccess(userId);
  if (items.some((i) => i.path === path)) return;
  save(userId, [{ path, label, since: new Date().toISOString() }, ...items]);
}

export function clearBlockedPath(userId: string, path: string) {
  const items = getPendingAccess(userId);
  const next = items.filter((i) => i.path !== path);
  if (next.length !== items.length) save(userId, next);
}
