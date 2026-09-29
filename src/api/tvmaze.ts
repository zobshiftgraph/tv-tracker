import type { Episode, ShowDetails, TvShow } from '../types';
import { tvmazeBase } from './cloudConfig';

interface TvmazeImage {
  medium?: string;
  original?: string;
}

interface TvmazeRating {
  average: number | null;
}

interface TvmazeShow {
  id: number;
  name: string;
  summary: string | null;
  image: TvmazeImage | null;
  rating: TvmazeRating;
  premiered: string | null;
  weight: number;
  status: string;
}

interface TvmazeEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  summary: string | null;
}

interface TvmazeSearchResult {
  show: TvmazeShow;
}

interface TvmazeScheduleEntry {
  name: string;
  season: number;
  number: number;
  airdate: string;
  airtime: string;
  show?: TvmazeShow;
  _embedded?: {
    show?: TvmazeShow;
  };
}

function getShowFromEntry(entry: TvmazeScheduleEntry): TvmazeShow | null {
  return entry.show ?? entry._embedded?.show ?? null;
}

interface TvmazeShowDetails extends TvmazeShow {
  _embedded?: {
    nextepisode?: TvmazeEpisode;
    previousepisode?: TvmazeEpisode;
  };
}

async function tvmazeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${tvmazeBase()}${path}`);
  if (!res.ok) {
    throw new Error(`TVMaze request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

function mapEpisode(ep: TvmazeEpisode | undefined): Episode | null {
  if (!ep) return null;
  return {
    id: ep.id,
    name: ep.name,
    seasonNumber: ep.season,
    episodeNumber: ep.number,
    airDate: ep.airdate || null,
    overview: stripHtml(ep.summary),
  };
}

function mapShow(show: TvmazeShow): TvShow {
  return {
    id: show.id,
    name: show.name,
    overview: stripHtml(show.summary),
    posterPath: show.image?.medium ?? show.image?.original ?? null,
    backdropPath: show.image?.original ?? show.image?.medium ?? null,
    voteAverage: show.rating?.average ?? 0,
    firstAirDate: show.premiered,
    popularity: show.weight ?? 0,
  };
}

function mapShowDetails(show: TvmazeShowDetails): ShowDetails {
  return {
    ...mapShow(show),
    status: show.status,
    numberOfSeasons: 0,
    nextEpisode: mapEpisode(show._embedded?.nextepisode),
    lastEpisode: mapEpisode(show._embedded?.previousepisode),
  };
}

function dedupeShows(shows: TvShow[]): TvShow[] {
  const seen = new Set<number>();
  return shows.filter((show) => {
    if (seen.has(show.id)) return false;
    seen.add(show.id);
    return true;
  });
}

function sortByPopularity(shows: TvShow[]): TvShow[] {
  return [...shows].sort((a, b) => {
    const scoreA = a.popularity + a.voteAverage * 10;
    const scoreB = b.popularity + b.voteAverage * 10;
    return scoreB - scoreA;
  });
}

export function posterUrl(path: string | null): string | null {
  return path;
}

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextLocalDateKeys(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    dates.push(localDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

async function fetchScheduleForDates(dates: string[]): Promise<TvmazeScheduleEntry[]> {
  const schedules = await Promise.all(
    dates.map((date) => tvmazeFetch<TvmazeScheduleEntry[]>(`/schedule?country=US&date=${date}`)),
  );
  return schedules.flat();
}

export async function fetchTrending(): Promise<TvShow[]> {
  const schedule = await tvmazeFetch<TvmazeScheduleEntry[]>(`/schedule?country=US&date=${localDateKey()}`);
  const shows = dedupeShows(
    schedule
      .map((entry) => getShowFromEntry(entry))
      .filter((show): show is TvmazeShow => show != null)
      .map(mapShow),
  );
  return sortByPopularity(shows).slice(0, 40);
}

export async function fetchThisWeek(): Promise<TvShow[]> {
  const schedule = await fetchScheduleForDates(nextLocalDateKeys(7));

  const byShow = new Map<number, { show: TvmazeShow; entries: TvmazeScheduleEntry[] }>();
  for (const entry of schedule) {
    const show = getShowFromEntry(entry);
    if (!show?.id || !entry.airdate) continue;

    const existing = byShow.get(show.id);
    if (existing) {
      existing.entries.push(entry);
    } else {
      byShow.set(show.id, { show, entries: [entry] });
    }
  }

  const shows: TvShow[] = [];
  for (const { show, entries } of byShow.values()) {
    const sorted = [...entries].sort((a, b) => {
      const dateCompare = a.airdate.localeCompare(b.airdate);
      if (dateCompare !== 0) return dateCompare;
      return (a.airtime || '').localeCompare(b.airtime || '');
    });
    const next = sorted[0];
    shows.push({
      ...mapShow(show),
      upcomingAiring: {
        airDate: next.airdate,
        airTime: next.airtime || null,
        episodeName: next.name,
        seasonNumber: next.season,
        episodeNumber: next.number,
        episodeCountThisWeek: entries.length,
      },
    });
  }

  return shows.sort((a, b) => {
    const dateA = a.upcomingAiring?.airDate ?? '';
    const dateB = b.upcomingAiring?.airDate ?? '';
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;
    const timeA = a.upcomingAiring?.airTime ?? '';
    const timeB = b.upcomingAiring?.airTime ?? '';
    return timeA.localeCompare(timeB);
  });
}

export async function fetchPopular(): Promise<TvShow[]> {
  const pages = await Promise.all(
    [0, 1, 2].map((page) => tvmazeFetch<TvmazeShow[]>(`/shows?page=${page}`)),
  );
  const shows = dedupeShows(pages.flat().map(mapShow));
  return sortByPopularity(shows).slice(0, 40);
}

export async function searchShows(query: string): Promise<TvShow[]> {
  if (!query.trim()) return [];
  const results = await tvmazeFetch<TvmazeSearchResult[]>(
    `/search/shows?q=${encodeURIComponent(query.trim())}`,
  );
  return results.map((result) => mapShow(result.show));
}

export async function fetchShowDetails(id: number): Promise<ShowDetails> {
  const data = await tvmazeFetch<TvmazeShowDetails>(`/shows/${id}?embed[]=nextepisode&embed[]=previousepisode`);
  return mapShowDetails(data);
}
