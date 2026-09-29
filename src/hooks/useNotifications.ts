import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchShowDetails } from '../api/tvmaze';
import type { FavoriteShow } from '../types';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr + 'T23:59:59');
  return d.getTime() < Date.now();
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function useNotifications(
  favorites: FavoriteShow[],
  markNotified: (showId: number, episodeId: number, airDate: string) => void,
) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const checking = useRef(false);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, tag, icon: '/tv-icon.png' });
    } catch {
      // Some browsers block notifications outside secure contexts
    }
  }, []);

  const checkFavorites = useCallback(async () => {
    if (checking.current || favorites.length === 0) return;
    if (Notification.permission !== 'granted') return;

    checking.current = true;
    try {
      for (const fav of favorites) {
        try {
          const details = await fetchShowDetails(fav.id);
          const ep = details.nextEpisode;
          if (!ep?.airDate) continue;

          const alreadyNotified =
            fav.lastNotifiedEpisodeId === ep.id ||
            fav.lastNotifiedAirDate === ep.airDate;

          if (alreadyNotified) continue;

          const label = `S${ep.seasonNumber}E${ep.episodeNumber} — ${ep.name}`;

          if (isToday(ep.airDate)) {
            sendNotification(
              `New episode today: ${fav.name}`,
              label,
              `ep-${fav.id}-${ep.id}`,
            );
            markNotified(fav.id, ep.id, ep.airDate);
          } else if (isPast(ep.airDate)) {
            sendNotification(
              `New episode available: ${fav.name}`,
              `${label} aired ${ep.airDate}`,
              `ep-${fav.id}-${ep.id}`,
            );
            markNotified(fav.id, ep.id, ep.airDate);
          } else {
            const days = daysUntil(ep.airDate);
            if (days === 1) {
              sendNotification(
                `Episode tomorrow: ${fav.name}`,
                `${label} airs tomorrow`,
                `ep-preview-${fav.id}-${ep.id}`,
              );
              markNotified(fav.id, ep.id, ep.airDate);
            }
          }
        } catch {
          // Skip shows that fail to load
        }
      }
    } finally {
      checking.current = false;
    }
  }, [favorites, markNotified, sendNotification]);

  useEffect(() => {
    void checkFavorites();
    const id = window.setInterval(() => void checkFavorites(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [checkFavorites]);

  return { permission, requestPermission, checkFavorites };
}
