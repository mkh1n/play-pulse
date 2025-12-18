// hooks/useMediaActions.ts
import { useCallback } from 'react';
import { useMediaCacheStore } from '../stores/mediaCacheStore';
import { useUserDataStore } from '../stores/userDataStore';
import { TMDBMediaItem } from '../types/tmdb';
import { MediaType } from '../types/storage';

export const useMediaActions = () => {
  const mediaCacheStore = useMediaCacheStore();
  const userDataStore = useUserDataStore();
  
  // Автоматическое кэширование медиа при любом взаимодействии
  const ensureMediaCached = useCallback((media: TMDBMediaItem, type?: MediaType) => {
    if (!media) return;
    
    const mediaType = type || (media.media_type as MediaType) || 'movie';
    const existing = mediaCacheStore.getFromCache(media.id, mediaType);
    
    if (!existing) {
      console.log(`💾 Кэшируем медиа: ${mediaType}_${media.id}`);
      mediaCacheStore.addToCache(media, mediaType);
    }
  }, [mediaCacheStore]);
  
  // Кэширование с принудительным обновлением
  const cacheMedia = useCallback((media: TMDBMediaItem, type?: MediaType) => {
    mediaCacheStore.addToCache(media, type);
  }, [mediaCacheStore]);
  
  const getCachedMedia = useCallback(<T extends TMDBMediaItem = TMDBMediaItem>(
    id: number, 
    type: MediaType
  ): T | null => {
    return mediaCacheStore.getFromCache<T>(id, type);
  }, [mediaCacheStore]);
  
  // Пользовательские действия с автоматическим кэшированием
  const toggleFavorite = useCallback((id: number, type: MediaType, media?: TMDBMediaItem) => {
    if (media) ensureMediaCached(media, type);
    userDataStore.toggleFavorite(id, type);
  }, [userDataStore, ensureMediaCached]);
  
  const toggleWatched = useCallback((id: number, type: MediaType, media?: TMDBMediaItem) => {
    if (media) ensureMediaCached(media, type);
    userDataStore.toggleWatched(id, type);
  }, [userDataStore, ensureMediaCached]);
  
  const toggleWatchlist = useCallback((id: number, type: MediaType, media?: TMDBMediaItem) => {
    if (media) ensureMediaCached(media, type);
    userDataStore.toggleWatchlist(id, type);
  }, [userDataStore, ensureMediaCached]);
  
  const setRating = useCallback((id: number, type: MediaType, rating: number, media?: TMDBMediaItem) => {
    if (media) ensureMediaCached(media, type);
    userDataStore.setRating(id, type, rating);
  }, [userDataStore, ensureMediaCached]);
  
  const setNote = useCallback((id: number, type: MediaType, note: string, media?: TMDBMediaItem) => {
    if (media) ensureMediaCached(media, type);
    userDataStore.setNote(id, type, note);
  }, [userDataStore, ensureMediaCached]);
  
  // Проверка состояний
  const isFavorite = useCallback((id: number, type: MediaType): boolean => {
    return userDataStore.isFavorite(id, type);
  }, [userDataStore]);
  
  const isWatched = useCallback((id: number, type: MediaType): boolean => {
    return userDataStore.isWatched(id, type);
  }, [userDataStore]);
  
  const isInWatchlist = useCallback((id: number, type: MediaType): boolean => {
    return userDataStore.isInWatchlist(id, type);
  }, [userDataStore]);
  
  const getRating = useCallback((id: number, type: MediaType): number | null => {
    return userDataStore.getRating(id, type);
  }, [userDataStore]);
  
  const getNote = useCallback((id: number, type: MediaType): string | null => {
    return userDataStore.getNote(id, type);
  }, [userDataStore]);
  
  // Получение всех данных для медиа
  const getMediaData = useCallback((id: number, type: MediaType) => {
    const media = getCachedMedia(id, type);
    
    return {
      media,
      isFavorite: userDataStore.isFavorite(id, type),
      isWatched: userDataStore.isWatched(id, type),
      isInWatchlist: userDataStore.isInWatchlist(id, type),
      userRating: userDataStore.getRating(id, type),
      userNote: userDataStore.getNote(id, type),
      hasAnyAction: userDataStore.hasAnyAction(id, type),
    };
  }, [getCachedMedia, userDataStore]);
  
  // Получение всех медиа с определенными действиями
  const getMediaWithActions = useCallback((actions: ('favorite' | 'watched' | 'watchlist' | 'rating' | 'note')[]) => {
    const mediaKeys = userDataStore.getMediaWithActions(actions);
    
    return mediaKeys.map(key => {
      const { id, type } = userDataStore.parseMediaKey(key);
      const media = getCachedMedia(id, type);
      
      return {
        id,
        type,
        media,
        isFavorite: userDataStore.isFavorite(id, type),
        isWatched: userDataStore.isWatched(id, type),
        isInWatchlist: userDataStore.isInWatchlist(id, type),
        userRating: userDataStore.getRating(id, type),
        userNote: userDataStore.getNote(id, type),
      };
    }).filter(item => item.media !== null);
  }, [getCachedMedia, userDataStore]);
  
  return {
    // Кэширование
    cacheMedia,
    getCachedMedia,
    ensureMediaCached,
    
    // Пользовательские действия с медиа
    toggleFavorite,
    toggleWatched,
    toggleWatchlist,
    setRating,
    setNote,
    
    // Проверка состояний
    isFavorite,
    isWatched,
    isInWatchlist,
    getRating,
    getNote,
    
    // Получение данных
    getMediaData,
    getMediaWithActions,
    
    // Статистика
    getStats: userDataStore.getStats,
    
    // Получение всех записей
    getAllRatings: userDataStore.getAllRatings,
    getAllNotes: userDataStore.getAllNotes,
    getAllFavorites: userDataStore.getAllFavorites,
    getAllWatched: userDataStore.getAllWatched,
    getAllWatchlist: userDataStore.getAllWatchlist,
    
    // Прямой доступ к хранилищам
    userDataStore,
    mediaCacheStore,
  };
};