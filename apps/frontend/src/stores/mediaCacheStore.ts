// stores/mediaCacheStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Movie, TVShow, Person, TMDBMediaItem } from '../types/tmdb';
import { MediaItem, MediaType } from '../types/storage';

interface MediaCacheStore {
  cache: Record<string, MediaItem>;
  
  // Добавление/обновление медиа в кэше с автоматическим определением типа
  addToCache: (item: TMDBMediaItem, type?: MediaType) => void;
  addMultipleToCache: (items: TMDBMediaItem[]) => void;
  
  // Получение медиа из кэша с типизацией
  getFromCache: <T extends TMDBMediaItem = TMDBMediaItem>(
    id: number, 
    type: MediaType
  ) => T | null;
  
  getMovieFromCache: (id: number) => Movie | null;
  getTVShowFromCache: (id: number) => TVShow | null;
  getPersonFromCache: (id: number) => Person | null;
  
  // Проверка наличия в кэше
  isInCache: (id: number, type: MediaType) => boolean;
  
  // Получение нескольких элементов
  getMultipleFromCache: (ids: Array<{id: number; type: MediaType}>) => TMDBMediaItem[];
  
  // Очистка устаревшего кэша (старше 30 дней)
  clearOldCache: () => void;
  
  // Очистка всего кэша
  clearCache: () => void;
}

// Определяем тип медиа на основе структуры объекта
const detectMediaType = (item: TMDBMediaItem): MediaType => {
  if (item.media_type) return item.media_type;
  if ('title' in item && item.title !== undefined) return 'movie';
  if ('name' in item && item.name !== undefined) {
    if ('first_air_date' in item || 'number_of_seasons' in item) return 'tv';
    if ('known_for_department' in item || 'gender' in item) return 'person';
  }
  return 'movie'; // fallback
};

// Нормализуем объект для кэша
const normalizeItem = (item: TMDBMediaItem, type?: MediaType): MediaItem => {
  const detectedType = type || detectMediaType(item);
  
  return {
    ...item,
    type: detectedType,
    cachedAt: new Date().toISOString(),
  };
};

export const useMediaCacheStore = create<MediaCacheStore>()(
  persist(
    (set, get) => ({
      cache: {},
      
      addToCache: (item, type) => {
        const normalized = normalizeItem(item, type);
        const key = `${normalized.type}_${normalized.id}`;
        
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: normalized,
          },
        }));
      },
      
      addMultipleToCache: (items) => {
        const newCache: Record<string, MediaItem> = {};
        const timestamp = new Date().toISOString();
        
        items.forEach((item) => {
          const normalized = normalizeItem(item);
          const key = `${normalized.type}_${normalized.id}`;
          newCache[key] = {
            ...normalized,
            cachedAt: timestamp,
          };
        });
        
        set((state) => ({
          cache: {
            ...state.cache,
            ...newCache,
          },
        }));
      },
      
      getFromCache: (id, type) => {
        const key = `${type}_${id}`;
        const cached = get().cache[key];
        return cached ? { ...cached } as any : null;
      },
      
      getMovieFromCache: (id) => {
        const cached = get().getFromCache(id, 'movie');
        return cached as Movie | null;
      },
      
      getTVShowFromCache: (id) => {
        const cached = get().getFromCache(id, 'tv');
        return cached as TVShow | null;
      },
      
      getPersonFromCache: (id) => {
        const cached = get().getFromCache(id, 'person');
        return cached as Person | null;
      },
      
      isInCache: (id, type) => {
        const key = `${type}_${id}`;
        return !!get().cache[key];
      },
      
      getMultipleFromCache: (ids) => {
        const result: TMDBMediaItem[] = [];
        ids.forEach(({ id, type }) => {
          const cached = get().getFromCache(id, type);
          if (cached) result.push(cached);
        });
        return result;
      },
      
      clearOldCache: () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        set((state) => {
          const newCache: Record<string, MediaItem> = {};
          
          Object.entries(state.cache).forEach(([key, item]) => {
            const cachedDate = new Date(item.cachedAt);
            if (cachedDate > thirtyDaysAgo) {
              newCache[key] = item;
            }
          });
          
          return { cache: newCache };
        });
      },
      
      clearCache: () => set({ cache: {} }),
    }),
    {
      name: 'movie-app-media-cache',
      version: 1,
      // Можно добавить миграции при обновлении версии
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Миграция с версии 0 на 1
          return persistedState;
        }
        return persistedState;
      },
    }
  )
);