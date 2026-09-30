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
  const hydrated = useRef(false);
  const syncing = useRef(false);

  const pullAndMerge = useCallback(async () => {
    if (!useCloudSync() || syncing.current) return;
    syncing.current = true;
    try {
      const cloud = await fetchFavoritesFromCloud();
      if (cloud === null) return;
      const local = loadFavorites();
      const merged = mergeFavorites(local, cloud);
      persistLocal(merged);
      setFavorites(merged);
      await syncFavoritesToCloud(merged);
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next = loadFavorites();
      if (useCloudSync()) {
        try {
          const cloud = await fetchFavoritesFromCloud();
          if (cloud) next = mergeFavorites(next, cloud);
        } catch {
          // keep local if cloud unreachable
        }
      }
      if (cancelled) return;
      persistLocal(next);
      setFavorites(next);
      hydrated.current = true;
      if (useCloudSync()) await syncFavoritesToCloud(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    persistLocal(favorites);
    void syncFavoritesToCloud(favorites);
  }, [favorites]);

  useEffect(() => {
    if (!useCloudSync()) return;
    const id = window.setInterval(() => void pullAndMerge(), 2 * 60 * 1000);
    const onFocus = () => void pullAndMerge();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
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

  return { favorites, isFavorite, toggleFavorite, markNotified, refreshFromCloud: pullAndMerge };
}
