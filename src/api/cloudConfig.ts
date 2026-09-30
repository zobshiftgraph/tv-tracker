import type { FavoriteShow } from '../types';

export interface CloudConfig {
  apiUrl: string;
  familyToken: string;
}

export const DEFAULT_CLOUD_API_URL = 'https://family-dashboard-api.thom7215.workers.dev';

const CONFIG_KEY = 'tv-tracker-cloud-config';

export function loadCloudConfig(): CloudConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { apiUrl: '', familyToken: '' };
    const parsed = JSON.parse(raw) as CloudConfig;
    return {
      apiUrl: parsed.apiUrl?.trim() || '',
      familyToken: parsed.familyToken || '',
    };
  } catch {
    return { apiUrl: '', familyToken: '' };
  }
}

export function saveCloudConfig(config: CloudConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function useCloudSync(): boolean {
  const c = loadCloudConfig();
  return Boolean(c.apiUrl && c.familyToken);
}

export async function cloudFetch(path: string, options: RequestInit = {}) {
  const { apiUrl, familyToken } = loadCloudConfig();
  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Family-Token': familyToken,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function normalizeFavorite(raw: unknown): FavoriteShow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id ?? o.showId ?? o.tvmazeId;
  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
  if (!Number.isFinite(id)) return null;
  const name = typeof o.name === 'string' ? o.name : typeof o.title === 'string' ? o.title : '';
  if (!name) return null;
  const posterPath =
    typeof o.posterPath === 'string'
      ? o.posterPath
      : typeof o.poster === 'string'
        ? o.poster
        : null;
  return {
    id,
    name,
    posterPath,
    addedAt: typeof o.addedAt === 'string' ? o.addedAt : new Date().toISOString(),
    lastNotifiedEpisodeId:
      typeof o.lastNotifiedEpisodeId === 'number' ? o.lastNotifiedEpisodeId : null,
    lastNotifiedAirDate:
      typeof o.lastNotifiedAirDate === 'string' ? o.lastNotifiedAirDate : null,
  };
}

export function mergeFavorites(local: FavoriteShow[], cloud: FavoriteShow[]): FavoriteShow[] {
  const byId = new Map<number, FavoriteShow>();
  for (const f of cloud) byId.set(f.id, f);
  for (const f of local) {
    const existing = byId.get(f.id);
    if (!existing) {
      byId.set(f.id, f);
      continue;
    }
    byId.set(f.id, {
      ...existing,
      name: f.name || existing.name,
      posterPath: f.posterPath ?? existing.posterPath,
      addedAt: existing.addedAt || f.addedAt,
      lastNotifiedEpisodeId: f.lastNotifiedEpisodeId ?? existing.lastNotifiedEpisodeId,
      lastNotifiedAirDate: f.lastNotifiedAirDate ?? existing.lastNotifiedAirDate,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchFavoritesFromCloud(): Promise<FavoriteShow[] | null> {
  if (!useCloudSync()) return null;
  const raw = await cloudFetch('/api/favorites');
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { favorites?: unknown }).favorites)
      ? (raw as { favorites: unknown[] }).favorites
      : null;
  if (list === null) return [];
  return list.map(normalizeFavorite).filter((f): f is FavoriteShow => f != null);
}

export async function syncFavoritesToCloud(favorites: FavoriteShow[]) {
  const config = loadCloudConfig();
  if (!config.apiUrl || !config.familyToken) {
    syncFavoritesToLocalProxy(favorites);
    return;
  }
  try {
    await cloudFetch('/api/favorites', {
      method: 'PUT',
      body: JSON.stringify(favorites),
    });
  } catch {
    syncFavoritesToLocalProxy(favorites);
  }
}

function syncFavoritesToLocalProxy(favorites: unknown[]) {
  fetch('http://localhost:8787/favorites', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(favorites),
  }).catch(() => {});
}

export function tvmazeBase(): string {
  const { apiUrl } = loadCloudConfig();
  if (apiUrl) return `${apiUrl.replace(/\/$/, '')}/api/tvmaze`;
  return 'https://api.tvmaze.com';
}
