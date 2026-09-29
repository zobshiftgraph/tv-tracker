import { posterUrl } from '../api/tvmaze';
import type { TvShow, UpcomingAiring } from '../types';

interface ShowCardProps {
  show: TvShow;
  rank?: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
}

export function ShowCard({ show, rank, isFavorite, onToggleFavorite, onSelect }: ShowCardProps) {
  const poster = posterUrl(show.posterPath);

  return (
    <article className="show-card" onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}>
      <div className="show-card-poster">
        {rank != null && <span className="show-rank">#{rank}</span>}
        {poster ? (
          <img src={poster} alt="" loading="lazy" />
        ) : (
          <div className="show-poster-placeholder">📺</div>
        )}
        <button
          type="button"
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
      <div className="show-card-body">
        <h3>{show.name}</h3>
        <div className="show-meta">
          {show.upcomingAiring ? (
            <span className="air-date">
              {formatUpcomingAiring(show.upcomingAiring)}
            </span>
          ) : (
            <>
              {show.firstAirDate && <span>{show.firstAirDate.slice(0, 4)}</span>}
              {show.voteAverage > 0 && <span className="rating">★ {show.voteAverage.toFixed(1)}</span>}
            </>
          )}
        </div>
        {show.upcomingAiring && (
          <p className="show-episode">
            S{show.upcomingAiring.seasonNumber}E{show.upcomingAiring.episodeNumber} — {show.upcomingAiring.episodeName}
            {show.upcomingAiring.episodeCountThisWeek > 1 &&
              ` (+${show.upcomingAiring.episodeCountThisWeek - 1} more this week)`}
          </p>
        )}
        {show.overview && <p className="show-overview">{show.overview}</p>}
      </div>
    </article>
  );
}

function formatUpcomingAiring(airing: UpcomingAiring): string {
  const d = new Date(airing.airDate + 'T12:00:00');
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (!airing.airTime) return day;
  const [hours, minutes] = airing.airTime.split(':').map(Number);
  const time = new Date();
  time.setHours(hours, minutes, 0, 0);
  const timeLabel = time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${timeLabel}`;
}
