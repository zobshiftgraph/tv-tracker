import { useCallback, useEffect, useState } from 'react';
import { syncFavoritesToCloud } from '../api/cloudConfig';
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

function saveFavorites(favorites: FavoriteShow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  void syncFavoritesToCloud(favorites);
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteShow[]>(() => loadFavorites());

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    void syncFavoritesToCloud(loadFavorites());
  }, []);

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

  return { favorites, isFavorite, toggleFavorite, markNotified };
}
