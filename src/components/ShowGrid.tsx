import { useEffect, useState } from 'react';
import { fetchShowDetails, posterUrl } from '../api/tvmaze';
import type { ShowDetails, TvShow } from '../types';
import { ShowCard } from './ShowCard';

interface ShowDetailModalProps {
  show: TvShow;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}

export function ShowDetailModal({ show, isFavorite, onClose, onToggleFavorite }: ShowDetailModalProps) {
  const [details, setDetails] = useState<ShowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchShowDetails(show.id)
      .then((d) => { if (!cancelled) setDetails(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [show.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const backdrop = posterUrl(details?.backdropPath ?? show.backdropPath);
  const poster = posterUrl(show.posterPath);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {backdrop && <div className="modal-hero" style={{ backgroundImage: `url(${backdrop})` }} />}
        <div className="modal-content">
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
          <div className="modal-header">
            {poster && <img className="modal-poster" src={poster} alt="" />}
            <div>
              <h2 id="modal-title">{show.name}</h2>
              {details && details.numberOfSeasons > 0 && (
                <p className="modal-status">
                  {details.status} · {details.numberOfSeasons} season{details.numberOfSeasons !== 1 ? 's' : ''}
                  {show.firstAirDate && ` · Since ${show.firstAirDate.slice(0, 4)}`}
                </p>
              )}
              {details && details.numberOfSeasons === 0 && (
                <p className="modal-status">
                  {details.status}
                  {show.firstAirDate && ` · Since ${show.firstAirDate.slice(0, 4)}`}
                </p>
              )}
              <button
                type="button"
                className={`btn ${isFavorite ? 'btn-secondary' : 'btn-primary'}`}
                onClick={onToggleFavorite}
              >
                {isFavorite ? '★ In favorites' : '☆ Add to favorites'}
              </button>
            </div>
          </div>

          {loading && <p className="muted">Loading details…</p>}
          {error && <p className="error">{error}</p>}

          {details && (
            <>
              <p className="modal-overview">{details.overview || 'No description available.'}</p>

              {details.nextEpisode && (
                <div className="episode-box next">
                  <h4>Next episode</h4>
                  <p className="episode-title">
                    S{details.nextEpisode.seasonNumber}E{details.nextEpisode.episodeNumber} — {details.nextEpisode.name}
                  </p>
                  {details.nextEpisode.airDate && (
                    <p className="episode-date">Airs {formatAirDate(details.nextEpisode.airDate)}</p>
                  )}
                  {details.nextEpisode.overview && (
                    <p className="episode-overview">{details.nextEpisode.overview}</p>
                  )}
                </div>
              )}

              {details.lastEpisode && !details.nextEpisode && (
                <div className="episode-box">
                  <h4>Latest episode</h4>
                  <p className="episode-title">
                    S{details.lastEpisode.seasonNumber}E{details.lastEpisode.episodeNumber} — {details.lastEpisode.name}
                  </p>
                  {details.lastEpisode.airDate && (
                    <p className="episode-date">Aired {formatAirDate(details.lastEpisode.airDate)}</p>
                  )}
                </div>
              )}

              {!details.nextEpisode && details.status === 'Ended' && (
                <p className="muted">This series has ended.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAirDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

interface ShowGridProps {
  shows: TvShow[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  isFavorite: (id: number) => boolean;
  onToggleFavorite: (show: TvShow) => void;
  showRank?: boolean;
}

export function ShowGrid({
  shows,
  loading,
  error,
  emptyMessage,
  isFavorite,
  onToggleFavorite,
  showRank = false,
}: ShowGridProps) {
  const [selected, setSelected] = useState<TvShow | null>(null);

  if (loading) return <p className="state-message">Loading shows…</p>;
  if (error) return <p className="state-message error">{error}</p>;
  if (shows.length === 0) return <p className="state-message">{emptyMessage}</p>;

  return (
    <>
      <div className="show-grid">
        {shows.map((show, i) => (
          <ShowCard
            key={show.id}
            show={show}
            rank={showRank ? i + 1 : undefined}
            isFavorite={isFavorite(show.id)}
            onToggleFavorite={() => onToggleFavorite(show)}
            onSelect={() => setSelected(show)}
          />
        ))}
      </div>
      {selected && (
        <ShowDetailModal
          show={selected}
          isFavorite={isFavorite(selected.id)}
          onClose={() => setSelected(null)}
          onToggleFavorite={() => onToggleFavorite(selected)}
        />
      )}
    </>
  );
}
