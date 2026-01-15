// services/gameService.ts

export type GameFilters = {
  genres?: number[];
  platforms?: number[];
  tags?: number[];
  dates?: string; // например: "2023-01-01,2023-12-31"
  developers?: number[];
  publishers?: number[];
  search?: string;
};

export type GameSortOption = 
  | "name" 
  | "released" 
  | "added" 
  | "created" 
  | "updated" 
  | "rating" 
  | "metacritic" 
  | "-name" 
  | "-released" 
  | "-added" 
  | "-created" 
  | "-updated" 
  | "-rating" 
  | "-metacritic";

// Интерфейсы для типизации ответов
export interface Game {
  id: number;
  name: string;
  released: string;
  background_image: string;
  rating: number;
  rating_top: number;
  metacritic: number;
  playtime: number;
  platforms: Array<{ platform: { id: number; name: string } }>;
  genres: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
}

export interface GamesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Game[];
}

export interface GameDetails extends Game {
  description: string;
  description_raw: string;
  website: string;
  reddit_url: string;
  metacritic_url: string;
  screenshots: Array<{ image: string }>;
  trailers: Array<{ data: { max: string } }>;
  esrb_rating: { name: string };
  developers: Array<{ id: number; name: string }>;
  publishers: Array<{ id: number; name: string }>;
}

const gameService = async (
  filters: GameFilters = {},
  page: number = 1,
  pageSize: number = 20,
  sortBy: GameSortOption = "-rating"
): Promise<GamesResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ordering: sortBy,
  });

  // Добавляем параметры фильтрации
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.genres && filters.genres.length > 0) {
    params.set('genres', filters.genres.join(','));
  }
  if (filters.platforms && filters.platforms.length > 0) {
    params.set('platforms', filters.platforms.join(','));
  }
  if (filters.tags && filters.tags.length > 0) {
    params.set('tags', filters.tags.join(','));
  }
  if (filters.dates) {
    params.set('dates', filters.dates);
  }
  if (filters.developers && filters.developers.length > 0) {
    params.set('developers', filters.developers.join(','));
  }
  if (filters.publishers && filters.publishers.length > 0) {
    params.set('publishers', filters.publishers.join(','));
  }

  // Используем API-маршрут Next.js
  const url = `/api/games?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Преобразуем данные в нужный формат
    return {
      count: data.count || 0,
      next: data.next,
      previous: data.previous,
      results: data.results || []
    };
  } catch (error) {
    console.error('Error fetching games:', error);
    
    // Возвращаем fallback данные в случае ошибки
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
};

// Функция для получения деталей игры
export const getGameById = async (id: number): Promise<GameDetails> => {
  try {
    const response = await fetch(`/api/games/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching game ${id}:`, error);
    throw error;
  }
};

// Функция для получения жанров
export const getGenres = async (): Promise<Array<{ id: number; name: string }>> => {
  try {
    const response = await fetch('/api/games/genres');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
};

// Функция для получения платформ
export const getPlatforms = async (): Promise<Array<{ id: number; name: string }>> => {
  try {
    const response = await fetch('/api/games/platforms');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return [];
  }
};
export const getDeals = async (name: string): Promise<any[]> => {
  try {
    const response = await fetch(`https://plati.io/api/search.ashx?query=${encodeURIComponent(name)}&response=json`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data.items || []; // Адаптируйте под структуру ответа API
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
};

// Функция для поиска игр (синоним для удобства)
export const searchGames = async (
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<GamesResponse> => {
  return gameService({ search: query }, page, pageSize);
};

// Функция для получения популярных игр
export const getPopularGames = async (
  page: number = 1,
  pageSize: number = 20
): Promise<GamesResponse> => {
  return gameService({}, page, pageSize, '-rating');
};

// Функция для получения новых игр
export const getNewGames = async (
  page: number = 1,
  pageSize: number = 20
): Promise<GamesResponse> => {
  const currentYear = new Date().getFullYear();
  return gameService(
    { dates: `${currentYear}-01-01,${currentYear}-12-31` },
    page,
    pageSize,
    '-released'
  );
};

export default gameService;