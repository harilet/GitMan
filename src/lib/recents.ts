export interface RecentProject {
  path: string;
  name: string;
  pinned: boolean;
  lastOpened: number;
}

const KEY = "gitweft.recents";
const LEGACY_KEY = "gitman.recents";
const MAX = 30;

export function loadRecents(): RecentProject[] {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is RecentProject => !!p && typeof p.path === "string",
    );
  } catch {
    return [];
  }
}

export function sortRecents(list: RecentProject[]): RecentProject[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.lastOpened - a.lastOpened;
  });
}

export function persistRecents(list: RecentProject[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // ignore storage errors
  }
}
