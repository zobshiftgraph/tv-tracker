import { useEffect, useMemo, useState } from 'react';
import { loadCloudConfig, saveCloudConfig, syncFavoritesToCloud, useCloudSync } from './api/cloudConfig';
import { fetchPopular, fetchThisWeek, fetchTrending, searchShows } from './api/tvmaze';
import { ShowGrid } from './components/ShowGrid';
import { useFavorites } from './hooks/useFavorites';
import { useNotifications } from './hooks/useNotifications';
import type { Tab, TvShow } from './types';
import './App.css';

function SyncSettingsModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [apiUrl, setApiUrl] = useState(() => loadCloudConfig().apiUrl);
  const [familyToken, setFamilyToken] = useState(() => loadCloudConfig().familyToken);

  const save = () => {
    saveCloudConfig({ apiUrl: apiUrl.trim(), familyToken });
    onSaved();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal sync-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2>Sync settings</h2>
        <p className="section-desc">Connect to your Cloudflare Worker so favorites appear on the Family Dashboard for everyone.</p>
        <label className="sync-field">
          Cloud API URL
          <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://family-dashboard-api.you.workers.dev" />
        </label>
        <label className="sync-field">
          Family password
          <input type="password" value={familyToken} onChange={(e) => setFamilyToken(e.target.value)} placeholder="Shared household password" />
        </label>
        <div className="sync-actions">
          <button type="button" className="btn btn-primary" onClick={save}>Save</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('trending');
  const [shows, setShows] = useState<TvShow[]>([]);
  const [weekShows, setWeekShows] = useState<TvShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TvShow[]>([]);
  const [searching, setSearching] = useState(false);
  const [weekFavoritesOnly, setWeekFavoritesOnly] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(useCloudSync);

  const { favorites, isFavorite, toggleFavorite, markNotified } = useFavorites();
  const { permission, requestPermission, checkFavorites } = useNotifications(favorites, markNotified);

  useEffect(() => {
    if (tab === 'favorites' || tab === 'search') {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const currentTab = tab;
    const fetcher =
      currentTab === 'trending' ? fetchTrending :
      currentTab === 'week' ? fetchThisWeek :
      fetchPopular;

    fetcher()
      .then((data) => {
        if (cancelled) return;
        if (currentTab === 'week') {
          setWeekShows(data);
        } else {
          setShows(data);
        }
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'search') return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const id = window.setTimeout(() => {
      setSearching(true);
      searchShows(searchQuery)
        .then(setSearchResults)
        .catch((e: Error) => setError(e.message))
        .finally(() => setSearching(false));
    }, 350);

    return () => window.clearTimeout(id);
  }, [searchQuery, tab]);

  const displayedWeekShows = useMemo(() => {
    if (!weekFavoritesOnly) return weekShows;
    return weekShows.filter((show) => isFavorite(show.id));
  }, [weekShows, weekFavoritesOnly, favorites]);

  const favoriteShows: TvShow[] = favorites.map((f) => ({
    id: f.id,
    name: f.name,
    overview: '',
    posterPath: f.posterPath,
    backdropPath: null,
    voteAverage: 0,
    firstAirDate: null,
    popularity: 0,
  }));

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>📺 TV Tracker</h1>
          <div className="header-actions">
            {permission !== 'granted' ? (
              <button type="button" className="btn btn-notify" onClick={() => void requestPermission()}>
                🔔 Enable notifications
              </button>
            ) : (
              <span className="notify-on" title="Notifications enabled">🔔 On</span>
            )}
            {favorites.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void checkFavorites()}>
                Check now
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSync(true)} title="Cloud sync settings">
              {cloudSynced ? '☁ Synced' : '☁ Sync'}
            </button>
          </div>
        </div>
        <nav className="tabs" role="tablist">
          {([
            ['trending', 'Airing today'],
            ['week', 'On this week'],
            ['popular', 'Top rated'],
            ['favorites', `Favorites (${favorites.length})`],
            ['search', 'Search'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 'search' && (
          <div className="search-bar">
            <input
              type="search"
              placeholder="Search TV shows…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {tab === 'trending' && (
          <>
            <p className="section-desc">Shows with new episodes airing in the US today.</p>
            <ShowGrid
              shows={shows}
              loading={loading}
              error={error}
              emptyMessage="Nothing scheduled for today."
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              showRank
            />
          </>
        )}

        {tab === 'week' && (
          <>
            <div className="section-toolbar">
              <p className="section-desc">US shows airing over the next 7 days.</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={weekFavoritesOnly}
                  onChange={(e) => setWeekFavoritesOnly(e.target.checked)}
                />
                Favorites only
              </label>
            </div>
            <ShowGrid
              shows={displayedWeekShows}
              loading={loading}
              error={error}
              emptyMessage={
                weekFavoritesOnly
                  ? favorites.length === 0
                    ? 'No favorites yet. Star some shows to track them here.'
                    : 'None of your favorites are airing this week.'
                  : 'Nothing scheduled for the next 7 days.'
              }
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </>
        )}

        {tab === 'popular' && (
          <>
            <p className="section-desc">Highly rated shows from TVMaze.</p>
            <ShowGrid
              shows={shows}
              loading={loading}
              error={error}
              emptyMessage="No shows found."
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </>
        )}

        {tab === 'favorites' && (
          <>
            <p className="section-desc">
              {favorites.length === 0
                ? 'Star shows from Airing today or Search to track new episodes.'
                : 'You\'ll get notified when new episodes air (enable notifications above).'}
            </p>
            <ShowGrid
              shows={favoriteShows}
              loading={false}
              error={null}
              emptyMessage="No favorites yet. Browse shows and tap ☆ to save them."
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </>
        )}

        {tab === 'search' && (
          <ShowGrid
            shows={searchResults}
            loading={searching}
            error={error}
            emptyMessage={searchQuery.trim() ? 'No results found.' : 'Type to search for a show.'}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      <footer className="footer">
        Data from <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">TVMaze</a>
        {cloudSynced && ' · Syncing to Family Dashboard'}
      </footer>

      {showSync && (
        <SyncSettingsModal
          onClose={() => setShowSync(false)}
          onSaved={() => {
            setCloudSynced(useCloudSync());
            void syncFavoritesToCloud(favorites);
          }}
        />
      )}
    </div>
  );
}
