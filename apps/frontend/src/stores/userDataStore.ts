// stores/userDataStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaType, MediaKey, UserDataStore, initialUserData, createMediaKey, parseMediaKey } from '../types/storage';

interface UserDataActions {
  data: UserDataStore;
  
  // Рейтинги
  setRating: (id: number, type: MediaType, value: number) => void;
  getRating: (id: number, type: MediaType) => number | null;
  removeRating: (id: number, type: MediaType) => void;
  hasRating: (id: number, type: MediaType) => boolean;
  
  // Заметки
  setNote: (id: number, type: MediaType, content: string) => void;
  getNote: (id: number, type: MediaType) => string | null;
  removeNote: (id: number, type: MediaType) => void;
  hasNote: (id: number, type: MediaType) => boolean;
  
  // Избранное
  toggleFavorite: (id: number, type: MediaType) => void;
  isFavorite: (id: number, type: MediaType) => boolean;
  
  // Просмотрено
  toggleWatched: (id: number, type: MediaType) => void;
  isWatched: (id: number, type: MediaType) => boolean;
  
  // Хочу посмотреть
  toggleWatchlist: (id: number, type: MediaType) => void;
  isInWatchlist: (id: number, type: MediaType) => boolean;
  
  // Получение всех записей
  getAllRatings: () => Array<{ id: number; type: MediaType; rating: number; updatedAt: string }>;
  getAllNotes: () => Array<{ id: number; type: MediaType; content: string; updatedAt: string }>;
  getAllFavorites: () => Array<{ id: number; type: MediaType; addedAt: string }>;
  getAllWatched: () => Array<{ id: number; type: MediaType; lastWatchedAt: string }>;
  getAllWatchlist: () => Array<{ id: number; type: MediaType; addedAt: string }>;
  
  // Получение по типу
  getRatingsByType: (type: MediaType) => Array<{ id: number; rating: number; updatedAt: string }>;
  getNotesByType: (type: MediaType) => Array<{ id: number; content: string; updatedAt: string }>;
  
  // Поиск и фильтрация
  getMediaWithActions: (actions: ('favorite' | 'watched' | 'watchlist' | 'rating' | 'note')[]) => MediaKey[];
  hasAnyAction: (id: number, type: MediaType) => boolean;
  
  // Статистика
  updateStats: () => void;
  getStats: () => UserDataStore['stats'];
  
  // Управление
  clearData: () => void;
  clearRatings: () => void;
  clearNotes: () => void;
  clearFavorites: () => void;
  clearWatched: () => void;
  clearWatchlist: () => void;
  
  // Импорт/экспорт
  importData: (data: Partial<UserDataStore>) => void;
  exportData: () => UserDataStore;
  
  // Вспомогательные
  parseMediaKey: (key: MediaKey) => { id: number; type: MediaType };
}

// Безопасная функция для работы с массивами
const safeUpdateKeyArray = (
  currentKeys: MediaKey[] | undefined,
  key: MediaKey,
  add: boolean
): MediaKey[] => {
  const keys = currentKeys || [];
  
  if (add) {
    // Добавляем ключ, если его еще нет
    if (!keys.includes(key)) {
      return [...keys, key];
    }
    return keys;
  } else {
    // Удаляем ключ, если он есть
    return keys.filter(k => k !== key);
  }
};

// Безопасное получение массива ключей
const safeGetKeys = (keys: MediaKey[] | undefined): MediaKey[] => {
  return keys || [];
};

export const useUserDataStore = create<UserDataActions>()(
  persist(
    (set, get) => ({
      data: initialUserData,
      
      // === РЕЙТИНГИ ===
      setRating: (id, type, value) => {
        const key = createMediaKey(id, type);
        const now = new Date().toISOString();
        
        set((state) => {
          const data = state.data;
          const hasExistingRating = !!data.ratings[key];
          
          const newRatings = {
            ...data.ratings,
            [key]: {
              value: Math.max(1, Math.min(10, value)),
              createdAt: hasExistingRating ? data.ratings[key].createdAt : now,
              updatedAt: now,
            },
          };
          
          const newRatedKeys = safeUpdateKeyArray(data.ratedKeys, key, true);
          
          return {
            data: {
              ...data,
              ratings: newRatings,
              ratedKeys: newRatedKeys,
            },
          };
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      getRating: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return data.ratings?.[key]?.value ?? null;
      },
      
      removeRating: (id, type) => {
        const key = createMediaKey(id, type);
        
        set((state) => {
          const data = state.data;
          const { [key]: removedRating, ...restRatings } = data.ratings || {};
          const newRatedKeys = safeGetKeys(data.ratedKeys).filter(k => k !== key);
          
          return {
            data: {
              ...data,
              ratings: restRatings,
              ratedKeys: newRatedKeys,
            },
          };
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      hasRating: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return !!(data.ratings?.[key]);
      },
      
      // === ЗАМЕТКИ ===
      setNote: (id, type, content) => {
        const key = createMediaKey(id, type);
        const now = new Date().toISOString();
        const trimmedContent = content.trim();
        
        // Если контент пустой - удаляем заметку
        if (!trimmedContent) {
          get().removeNote(id, type);
          return;
        }
        
        set((state) => {
          const data = state.data;
          const hasExistingNote = !!(data.notes?.[key]);
          
          const newNotes = {
            ...data.notes,
            [key]: {
              content: trimmedContent,
              createdAt: hasExistingNote ? data.notes[key].createdAt : now,
              updatedAt: now,
            },
          };
          
          const newNotedKeys = safeUpdateKeyArray(data.notedKeys, key, true);
          
          return {
            data: {
              ...data,
              notes: newNotes,
              notedKeys: newNotedKeys,
            },
          };
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      getNote: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return data.notes?.[key]?.content ?? null;
      },
      
      removeNote: (id, type) => {
        const key = createMediaKey(id, type);
        
        set((state) => {
          const data = state.data;
          const { [key]: removedNote, ...restNotes } = data.notes || {};
          const newNotedKeys = safeGetKeys(data.notedKeys).filter(k => k !== key);
          
          return {
            data: {
              ...data,
              notes: restNotes,
              notedKeys: newNotedKeys,
            },
          };
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      hasNote: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return !!(data.notes?.[key]);
      },
      
      // === ИЗБРАННОЕ ===
      toggleFavorite: (id, type) => {
        const key = createMediaKey(id, type);
        const now = new Date().toISOString();
        
        set((state) => {
          const data = state.data;
          const isCurrentlyFavorite = !!(data.favorites?.[key]);
          
          if (isCurrentlyFavorite) {
            // Удаляем из избранного
            const { [key]: removedFavorite, ...restFavorites } = data.favorites || {};
            const newFavoriteKeys = safeGetKeys(data.favoriteKeys).filter(k => k !== key);
            
            return {
              data: {
                ...data,
                favorites: restFavorites,
                favoriteKeys: newFavoriteKeys,
              },
            };
          } else {
            // Добавляем в избранное
            const newFavorites = {
              ...data.favorites,
              [key]: {
                addedAt: now,
              },
            };
            
            const newFavoriteKeys = [...safeGetKeys(data.favoriteKeys), key];
            
            return {
              data: {
                ...data,
                favorites: newFavorites,
                favoriteKeys: newFavoriteKeys,
              },
            };
          }
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      isFavorite: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return !!(data.favorites?.[key]);
      },
      
      // === ПРОСМОТРЕННОЕ ===
      toggleWatched: (id, type) => {
        const key = createMediaKey(id, type);
        const now = new Date().toISOString();
        
        set((state) => {
          const data = state.data;
          const isCurrentlyWatched = !!(data.watched?.[key]);
          
          if (isCurrentlyWatched) {
            // Удаляем из просмотренных
            const { [key]: removedWatched, ...restWatched } = data.watched || {};
            const newWatchedKeys = safeGetKeys(data.watchedKeys).filter(k => k !== key);
            
            return {
              data: {
                ...data,
                watched: restWatched,
                watchedKeys: newWatchedKeys,
              },
            };
          } else {
            // Добавляем в просмотренные
            const newWatched = {
              ...data.watched,
              [key]: {
                watchedAt: now,
                lastWatchedAt: now,
              },
            };
            
            const newWatchedKeys = [...safeGetKeys(data.watchedKeys), key];
            
            return {
              data: {
                ...data,
                watched: newWatched,
                watchedKeys: newWatchedKeys,
              },
            };
          }
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      isWatched: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return !!(data.watched?.[key]);
      },
      
      // === ХОЧУ ПОСМОТРЕТЬ ===
      toggleWatchlist: (id, type) => {
        const key = createMediaKey(id, type);
        const now = new Date().toISOString();
        
        set((state) => {
          const data = state.data;
          const isCurrentlyInWatchlist = !!(data.watchlist?.[key]);
          
          if (isCurrentlyInWatchlist) {
            // Удаляем из списка
            const { [key]: removedWatchlist, ...restWatchlist } = data.watchlist || {};
            const newWatchlistKeys = safeGetKeys(data.watchlistKeys).filter(k => k !== key);
            
            return {
              data: {
                ...data,
                watchlist: restWatchlist,
                watchlistKeys: newWatchlistKeys,
              },
            };
          } else {
            // Добавляем в список
            const newWatchlist = {
              ...data.watchlist,
              [key]: {
                addedAt: now,
              },
            };
            
            const newWatchlistKeys = [...safeGetKeys(data.watchlistKeys), key];
            
            return {
              data: {
                ...data,
                watchlist: newWatchlist,
                watchlistKeys: newWatchlistKeys,
              },
            };
          }
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      isInWatchlist: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        return !!(data.watchlist?.[key]);
      },
      
      // === ПОЛУЧЕНИЕ ВСЕХ ДАННЫХ ===
      getAllRatings: () => {
        const { ratings } = get().data;
        return Object.entries(ratings || {}).map(([key, entry]) => {
          const { id, type } = parseMediaKey(key as MediaKey);
          return {
            id,
            type,
            rating: entry.value,
            updatedAt: entry.updatedAt,
          };
        });
      },
      
      getAllNotes: () => {
        const { notes } = get().data;
        return Object.entries(notes || {}).map(([key, entry]) => {
          const { id, type } = parseMediaKey(key as MediaKey);
          return {
            id,
            type,
            content: entry.content,
            updatedAt: entry.updatedAt,
          };
        });
      },
      
      getAllFavorites: () => {
        const { favorites } = get().data;
        return Object.entries(favorites || {}).map(([key, entry]) => {
          const { id, type } = parseMediaKey(key as MediaKey);
          return {
            id,
            type,
            addedAt: entry.addedAt,
          };
        });
      },
      
      getAllWatched: () => {
        const { watched } = get().data;
        return Object.entries(watched || {}).map(([key, entry]) => {
          const { id, type } = parseMediaKey(key as MediaKey);
          return {
            id,
            type,
            lastWatchedAt: entry.lastWatchedAt,
          };
        });
      },
      
      getAllWatchlist: () => {
        const { watchlist } = get().data;
        return Object.entries(watchlist || {}).map(([key, entry]) => {
          const { id, type } = parseMediaKey(key as MediaKey);
          return {
            id,
            type,
            addedAt: entry.addedAt,
          };
        });
      },
      
      getRatingsByType: (type) => {
        const { ratings } = get().data;
        return Object.entries(ratings || {})
          .filter(([key]) => key.startsWith(`${type}_`))
          .map(([key, entry]) => {
            const { id } = parseMediaKey(key as MediaKey);
            return {
              id,
              rating: entry.value,
              updatedAt: entry.updatedAt,
            };
          });
      },
      
      getNotesByType: (type) => {
        const { notes } = get().data;
        return Object.entries(notes || {})
          .filter(([key]) => key.startsWith(`${type}_`))
          .map(([key, entry]) => {
            const { id } = parseMediaKey(key as MediaKey);
            return {
              id,
              content: entry.content,
              updatedAt: entry.updatedAt,
            };
          });
      },
      
      // === ПОИСК И ФИЛЬТРАЦИЯ ===
      getMediaWithActions: (actions) => {
        const data = get().data;
        const allKeys = new Set<MediaKey>();
        
        actions.forEach(action => {
          let keys: MediaKey[] = [];
          switch (action) {
            case 'favorite':
              keys = safeGetKeys(data.favoriteKeys);
              break;
            case 'watched':
              keys = safeGetKeys(data.watchedKeys);
              break;
            case 'watchlist':
              keys = safeGetKeys(data.watchlistKeys);
              break;
            case 'rating':
              keys = safeGetKeys(data.ratedKeys);
              break;
            case 'note':
              keys = safeGetKeys(data.notedKeys);
              break;
          }
          
          keys.forEach(key => allKeys.add(key));
        });
        
        return Array.from(allKeys);
      },
      
      hasAnyAction: (id, type) => {
        const key = createMediaKey(id, type);
        const data = get().data;
        
        return !!(data.favorites?.[key]) ||
               !!(data.watched?.[key]) ||
               !!(data.watchlist?.[key]) ||
               !!(data.ratings?.[key]) ||
               !!(data.notes?.[key]);
      },
      
      // === СТАТИСТИКА ===
      updateStats: () => {
        set((state) => {
          const data = state.data;
          const ratings = Object.values(data.ratings || {});
          const totalRatings = ratings.length;
          const averageRating = totalRatings > 0
            ? ratings.reduce((sum, r) => sum + r.value, 0) / totalRatings
            : null;
          
          return {
            data: {
              ...data,
              stats: {
                totalFavorites: safeGetKeys(data.favoriteKeys).length,
                totalWatched: safeGetKeys(data.watchedKeys).length,
                totalWatchlist: safeGetKeys(data.watchlistKeys).length,
                totalRatings,
                totalNotes: safeGetKeys(data.notedKeys).length,
                averageRating,
                lastUpdated: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      getStats: () => {
        return get().data.stats;
      },
      
      // === УПРАВЛЕНИЕ ДАННЫМИ ===
      clearData: () => {
        set({ data: initialUserData });
      },
      
      clearRatings: () => {
        set((state) => ({
          data: {
            ...state.data,
            ratings: {},
            ratedKeys: [],
          },
        }));
        setTimeout(() => get().updateStats(), 0);
      },
      
      clearNotes: () => {
        set((state) => ({
          data: {
            ...state.data,
            notes: {},
            notedKeys: [],
          },
        }));
        setTimeout(() => get().updateStats(), 0);
      },
      
      clearFavorites: () => {
        set((state) => ({
          data: {
            ...state.data,
            favorites: {},
            favoriteKeys: [],
          },
        }));
        setTimeout(() => get().updateStats(), 0);
      },
      
      clearWatched: () => {
        set((state) => ({
          data: {
            ...state.data,
            watched: {},
            watchedKeys: [],
          },
        }));
        setTimeout(() => get().updateStats(), 0);
      },
      
      clearWatchlist: () => {
        set((state) => ({
          data: {
            ...state.data,
            watchlist: {},
            watchlistKeys: [],
          },
        }));
        setTimeout(() => get().updateStats(), 0);
      },
      
      importData: (importedData) => {
        set((state) => {
          const currentData = state.data;
          
          const mergeObjects = <T extends Record<string, any>>(current: T, imported: T = {} as T): T => {
            return {
              ...current,
              ...imported,
            };
          };
          
          const mergeArrays = <T>(current: T[], imported: T[] = []): T[] => {
            const combined = [...current];
            const existingSet = new Set(current);
            
            imported.forEach(item => {
              if (!existingSet.has(item)) {
                combined.push(item);
                existingSet.add(item);
              }
            });
            
            return combined;
          };
          
          return {
            data: {
              ...currentData,
              ratings: mergeObjects(currentData.ratings || {}, importedData.ratings),
              notes: mergeObjects(currentData.notes || {}, importedData.notes),
              favorites: mergeObjects(currentData.favorites || {}, importedData.favorites),
              watched: mergeObjects(currentData.watched || {}, importedData.watched),
              watchlist: mergeObjects(currentData.watchlist || {}, importedData.watchlist),
              favoriteKeys: mergeArrays(safeGetKeys(currentData.favoriteKeys), importedData.favoriteKeys || []),
              watchedKeys: mergeArrays(safeGetKeys(currentData.watchedKeys), importedData.watchedKeys || []),
              watchlistKeys: mergeArrays(safeGetKeys(currentData.watchlistKeys), importedData.watchlistKeys || []),
              ratedKeys: mergeArrays(safeGetKeys(currentData.ratedKeys), importedData.ratedKeys || []),
              notedKeys: mergeArrays(safeGetKeys(currentData.notedKeys), importedData.notedKeys || []),
            },
          };
        });
        
        setTimeout(() => get().updateStats(), 0);
      },
      
      exportData: () => {
        return get().data;
      },
      
      parseMediaKey: (key) => parseMediaKey(key),
    }),
    {
      name: 'movie-app-user-data',
      version: 1,
      // Миграция для существующих данных
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Если у нас старые данные, преобразуем их в новую структуру
          const oldData = persistedState?.data;
          
          if (oldData) {
            // Преобразуем старые массивы в новые структуры
            const newData: UserDataStore = {
              ...initialUserData,
              // Переносим основные данные если они есть
              favorites: oldData.favorites || {},
              watched: oldData.watched || {},
              watchlist: oldData.watchlist || {},
              ratings: oldData.ratings || {},
              notes: oldData.notes || {},
            };
            
            // Создаем массивы ключей из существующих данных
            if (oldData.favorites) {
              newData.favoriteKeys = Object.keys(oldData.favorites) as MediaKey[];
            }
            if (oldData.watched) {
              newData.watchedKeys = Object.keys(oldData.watched) as MediaKey[];
            }
            if (oldData.watchlist) {
              newData.watchlistKeys = Object.keys(oldData.watchlist) as MediaKey[];
            }
            if (oldData.ratings) {
              newData.ratedKeys = Object.keys(oldData.ratings) as MediaKey[];
            }
            if (oldData.notes) {
              newData.notedKeys = Object.keys(oldData.notes) as MediaKey[];
            }
            
            return { data: newData };
          }
        }
        
        return persistedState;
      },
    }
  )
);