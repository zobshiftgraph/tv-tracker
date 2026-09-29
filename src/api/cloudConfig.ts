export interface CloudConfig {
  apiUrl: string;
  familyToken: string;
}

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

export async function syncFavoritesToCloud(favorites: unknown[]) {
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
