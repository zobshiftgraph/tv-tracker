import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchFavoritesFromCloud,
  mergeFavorites,
  syncFavoritesToCloud,
  useCloudSync,
} from '../api/cloudConfig';
import type { FavoriteShow, TvShow } from '../types';

const STORAGE_KEY = 'tv-tracker-favorites';

function loadFavorites(): FavoriteShow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteShow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocal(favorites: FavoriteShow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteShow[]>(() => loadFavorites());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const hydrated = useRef(false);
  const syncing = useRef(false);
  /** True after a successful GET when cloud sync is enabled (never push empty over cloud before this). */
  const cloudPullOk = useRef(!useCloudSync());
  const skipNextPush = useRef(true);

  const pullAndMerge = useCallback(async () => {
    if (!useCloudSync() || syncing.current) return;
    syncing.current = true;
    setSyncError(null);
    try {
      const cloud = await fetchFavoritesFromCloud();
      if (cloud === null) return;
      cloudPullOk.current = true;
      const local = loadFavorites();
      const merged = mergeFavorites(local, cloud);
      skipNextPush.current = true;
      persistLocal(merged);
      setFavorites(merged);
      await syncFavoritesToCloud(merged);
      setLastSyncedAt(Date.now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(msg);
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next = loadFavorites();
      let pulled = false;

      if (useCloudSync()) {
        setSyncError(null);
        try {
          const cloud = await fetchFavoritesFromCloud();
          if (cloud === null) return;
          pulled = true;
          cloudPullOk.current = true;
          next = mergeFavorites(next, cloud);
        } catch (err) {
          cloudPullOk.current = false;
          const msg = err instanceof Error ? err.message : 'Could not load favorites from cloud';
          setSyncError(msg);
        }
      } else {
        cloudPullOk.current = true;
      }

      if (cancelled) return;
      skipNextPush.current = true;
      persistLocal(next);
      setFavorites(next);
      hydrated.current = true;

      if (useCloudSync() && pulled) {
        try {
          await syncFavoritesToCloud(next);
          setLastSyncedAt(Date.now());
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Could not save favorites to cloud';
          setSyncError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current || !useCloudSync()) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (favorites.length === 0 && !cloudPullOk.current) return;

    persistLocal(favorites);
    void (async () => {
      try {
        await syncFavoritesToCloud(favorites);
        setLastSyncedAt(Date.now());
        setSyncError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setSyncError(msg);
      }
    })();
  }, [favorites]);

  useEffect(() => {
    if (!useCloudSync()) return;
    const id = window.setInterval(() => void pullAndMerge(), 2 * 60 * 1000);
    const onFocus = () => void pullAndMerge();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullAndMerge();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pullAndMerge]);

  const isFavorite = useCallback(
    (id: number) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback((show: TvShow) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === show.id);
      if (exists) {
        return prev.filter((f) => f.id !== show.id);
      }
      return [
        ...prev,
        {
          id: show.id,
          name: show.name,
          posterPath: show.posterPath,
          addedAt: new Date().toISOString(),
          lastNotifiedEpisodeId: null,
          lastNotifiedAirDate: null,
        },
      ];
    });
  }, []);

  const markNotified = useCallback((showId: number, episodeId: number, airDate: string) => {
    setFavorites((prev) =>
      prev.map((f) =>
        f.id === showId
          ? { ...f, lastNotifiedEpisodeId: episodeId, lastNotifiedAirDate: airDate }
          : f,
      ),
    );
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    markNotified,
    refreshFromCloud: pullAndMerge,
    syncError,
    lastSyncedAt,
  };
}
