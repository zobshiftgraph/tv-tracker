export interface TvShow {
  id: number;
  name: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  firstAirDate: string | null;
  popularity: number;
  upcomingAiring?: UpcomingAiring;
}

export interface UpcomingAiring {
  airDate: string;
  airTime: string | null;
  episodeName: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeCountThisWeek: number;
}

export interface Episode {
  id: number;
  name: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  overview: string;
}

export interface ShowDetails extends TvShow {
  status: string;
  numberOfSeasons: number;
  nextEpisode: Episode | null;
  lastEpisode: Episode | null;
}

export interface FavoriteShow {
  id: number;
  name: string;
  posterPath: string | null;
  addedAt: string;
  lastNotifiedEpisodeId: number | null;
  lastNotifiedAirDate: string | null;
}

export type Tab = 'trending' | 'week' | 'popular' | 'favorites' | 'search';
