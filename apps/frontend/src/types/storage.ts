// types/storage.ts
import { TMDBMediaItem } from './tmdb';

export type MediaType = 'movie' | 'tv' | 'person';
export type MediaKey = `${MediaType}_${number}`;

export type MediaItem = TMDBMediaItem & {
  type: MediaType;
  cachedAt: string;
};

export type RatingEntry = {
  value: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteEntry = {
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteEntry = {
  addedAt: string;
};

export type WatchedEntry = {
  watchedAt: string;
  lastWatchedAt: string;
  progress?: number;
};

export type WatchlistEntry = {
  addedAt: string;
};

export type UserDataStore = {
  ratings: Record<MediaKey, RatingEntry>;
  notes: Record<MediaKey, NoteEntry>;
  favorites: Record<MediaKey, FavoriteEntry>;
  watched: Record<MediaKey, WatchedEntry>;
  watchlist: Record<MediaKey, WatchlistEntry>;
  
  favoriteKeys: MediaKey[];
  watchedKeys: MediaKey[];
  watchlistKeys: MediaKey[];
  ratedKeys: MediaKey[];
  notedKeys: MediaKey[];
  
  stats: {
    totalFavorites: number;
    totalWatched: number;
    totalWatchlist: number;
    totalRatings: number;
    totalNotes: number;
    averageRating: number | null;
    lastUpdated: string;
  };
  
  version: string;
};

// Гарантируем, что все массивы инициализированы
export const initialUserData: UserDataStore = {
  ratings: {},
  notes: {},
  favorites: {},
  watched: {},
  watchlist: {},
  
  favoriteKeys: [],
  watchedKeys: [],
  watchlistKeys: [],
  ratedKeys: [],
  notedKeys: [],
  
  stats: {
    totalFavorites: 0,
    totalWatched: 0,
    totalWatchlist: 0,
    totalRatings: 0,
    totalNotes: 0,
    averageRating: null,
    lastUpdated: new Date().toISOString(),
  },
  
  version: '1.0',
};

export type BackupData = {
  mediaCache: Record<MediaKey, MediaItem>;
  userData: UserDataStore;
  version: string;
  exportedAt: string;
};

export const createMediaKey = (id: number, type: MediaType): MediaKey => `${type}_${id}`;
export const parseMediaKey = (key: MediaKey): { id: number; type: MediaType } => {
  const [type, id] = key.split('_');
  return { id: parseInt(id), type: type as MediaType };
};