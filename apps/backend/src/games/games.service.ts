// apps/backend/src/games/games.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Game } from './entities/game.entity';
import { fetchFromRawgProxy } from './rawg-proxy';

interface GamesFilterParams {
  genres?: string;
  platforms?: string;
  tags?: string;
  dates?: string;
  developers?: string;
  publishers?: string;
}

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  private readonly MIN_ADDED_COUNT = 100;
  private readonly MIN_RATING_FOR_LOW_POPULARITY = 4.5;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Получить список игр
   */
  async getGames(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    ordering: string = '-rating',
    filters: GamesFilterParams = {},
  ) {
    try {
      const params: any = {
        page,
        page_size: pageSize,
        ordering,
      };

      if (search) params.search = search;
      if (filters.genres) params.genres = filters.genres;
      if (filters.platforms) params.platforms = filters.platforms;
      if (filters.tags) params.tags = filters.tags;
      if (filters.dates) params.dates = filters.dates;
      if (filters.developers) params.developers = filters.developers;
      if (filters.publishers) params.publishers = filters.publishers;

      this.logger.debug(
        `[RAWG PROXY] Games request: ${JSON.stringify(params)}`,
      );

      const response = await fetchFromRawgProxy(
        this.httpService,
        'games',
        params,
      );

      const rawGames = Array.isArray(response?.results)
        ? response.results
        : [];

      let processedGames = this.processGamesForQuality(
        rawGames,
        ordering,
      );

      processedGames = processedGames.slice(0, pageSize);

      this.cacheGamesInBackground(processedGames).catch((err) =>
        this.logger.warn(
          `⚠️ Background cache failed: ${err.message}`,
        ),
      );

      const cachedGames = await this.getCachedGames(
        processedGames.map((g: any) => g.id),
      );

      const cachedIds = new Set(
        cachedGames.map((g: any) => g.rawg_id),
      );

      return {
        count: response?.count || processedGames.length,
        next: response?.next || null,
        previous: response?.previous || null,
        results: processedGames.map((game: any) => ({
          ...game,
          is_cached: cachedIds.has(game.id),
        })),
      };
    } catch (error: any) {
      this.logger.error(
        `[getGames] RAWG proxy error: ${error.message}`,
      );

      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
        error: 'Failed to fetch games',
      };
    }
  }

  /**
   * Получить детальную информацию об игре
   */
  async getGameData(gameId: number) {
    try {
      this.logger.debug(
        `[getGameData] Fetching game ${gameId}`,
      );

      const [gameData, screenshotsData] =
        await Promise.all([
          fetchFromRawgProxy(
            this.httpService,
            `games/${gameId}`,
          ),

          fetchFromRawgProxy(
            this.httpService,
            `games/${gameId}/screenshots`,
          ),
        ]);

      const screenshots =
        screenshotsData?.results || [];

      const normalized = this.normalizeGameData(
        gameData,
        screenshots,
      );

      this.cacheGame(normalized).catch((err) =>
        this.logger.warn(
          `⚠️ Failed to cache game ${gameId}: ${err.message}`,
        ),
      );

      return {
        ...normalized,
        rawg_id: normalized.id,
        is_cached: false,
      };
    } catch (error: any) {
      this.logger.error(
        `[getGameData] RAWG proxy failed: ${error.message}`,
      );

      try {
        const cached = await this.getCachedGame(gameId);

        if (cached) {
          this.logger.warn(
            `[getGameData] Returning cached game ${gameId}`,
          );

          return {
            ...cached,
            is_cached: true,
          };
        }
      } catch { }

      throw new Error(
        `Не удалось загрузить игру #${gameId}`,
      );
    }
  }

  /**
   * Умная фильтрация игр
   */
  private processGamesForQuality(
    games: any[],
    ordering: string,
  ): any[] {
    const filtered = games.filter((game) =>
      this.meetsQualityThresholds(game),
    );

    if (
      ordering === '-rating' ||
      ordering === 'rating'
    ) {
      return filtered
        .map((game) => ({
          ...game,
          hybridScore:
            this.calculateHybridScore(game),
        }))
        .sort((a, b) =>
          ordering === '-rating'
            ? b.hybridScore - a.hybridScore
            : a.hybridScore - b.hybridScore,
        );
    }

    return filtered;
  }

  /**
   * Проверка качества игры
   */
  private meetsQualityThresholds(
    game: any,
  ): boolean {
    if (!game.rating || game.rating < 3.0) {
      return false;
    }

    const addedCount = game.added || 0;


    if (
      addedCount < this.MIN_ADDED_COUNT &&
      game.rating < 4.3
    ) {
      return false;
    }

    if (
      !game.name ||
      game.name.trim() === ''
    ) {
      return false;
    }

    return true;
  }

  /**
   * Гибридный скор
   */
  private calculateHybridScore(
    game: any,
  ): number {
    const rating = game.rating || 0;

    const added = game.added || 0;

    const popularityFactor =
      1 + Math.log10(added + 1) / 4;

    const ratingsFactor =
      1 +
      Math.log10(100 + 1) / 5;

    return (
      rating *
      popularityFactor *
      ratingsFactor
    );
  }

  /**
   * Нормализация данных
   */
  private normalizeGameData(
    gameData: any,
    screenshots: any[],
  ): any {
    return {
      id: gameData.id,
      slug: gameData.slug,
      name: gameData.name,
      released: gameData.released,
      tba: gameData.tba || false,

      background_image:
        gameData.background_image,

      description:
        gameData.description_raw ||
        gameData.description ||
        null,

      description_raw:
        gameData.description_raw ||
        gameData.description ||
        null,

      website:
        gameData.website || null,

      reddit_url:
        gameData.reddit_url || null,

      metacritic_url:
        gameData.metacritic_url || null,

      rating: gameData.rating,

      rating_top:
        gameData.rating_top,

      metacritic:
        gameData.metacritic,

      playtime:
        gameData.playtime || 0,

      genres: Array.isArray(
        gameData.genres,
      )
        ? gameData.genres
        : [],

      tags: Array.isArray(gameData.tags)
        ? gameData.tags
        : [],

      platforms: Array.isArray(
        gameData.platforms,
      )
        ? gameData.platforms
        : [],

      stores: Array.isArray(
        gameData.stores,
      )
        ? gameData.stores
        : [],

      developers: Array.isArray(
        gameData.developers,
      )
        ? gameData.developers
        : [],

      publishers: Array.isArray(
        gameData.publishers,
      )
        ? gameData.publishers
        : [],

      trailers: Array.isArray(
        gameData.trailers,
      )
        ? gameData.trailers
        : [],

      screenshots,

      added: gameData.added,

      suggestions_count:
        gameData.suggestions_count,

      reviews_count:
        gameData.reviews_count,

      esrb_rating:
        gameData.esrb_rating,

      parent_platforms:
        gameData.parent_platforms,

      alternative_names:
        gameData.alternative_names || [],

      is_cached: false,

      created_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    };
  }

  /**
   * Поиск в кэше
   */
  async searchCachedGames(
    query: string,
    limit: number = 20,
  ): Promise<Game[]> {
    try {
      const { data, error } =
        await this.supabaseService
          .from('games')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Получить одну игру из кэша
   */
  private async getCachedGame(
    rawgId: number,
  ): Promise<Game | null> {
    try {
      const { data, error } =
        await this.supabaseService
          .from('games')
          .select('*')
          .eq('rawg_id', rawgId)
          .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Получить одну игру из кэша по ID (публичный метод для контроллера)
   */
  async getCachedGameById(
    rawgId: number,
  ): Promise<Game | null> {
    return this.getCachedGame(rawgId);
  }

  /**
   * Получить список игр из кэша
   */
  private async getCachedGames(
    rawgIds: number[],
  ): Promise<Game[]> {
    if (rawgIds.length === 0) {
      return [];
    }

    try {
      const { data, error } =
        await this.supabaseService
          .from('games')
          .select('*')
          .in('rawg_id', rawgIds);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Кэширование игры
   */
/**
 * Кэширование игры
 */
private async cacheGame(gameData: any): Promise<void> {
  try {
    const game: Partial<Game> = {
      rawg_id: gameData.id,
      name: gameData.name,
      slug: gameData.slug,
      released: gameData.released,
      description: gameData.description,
      description_raw: gameData.description_raw,
      background_image: gameData.background_image,
      website: gameData.website,
      rating: gameData.rating,
      rating_top: gameData.rating_top,
      metacritic: gameData.metacritic,
      playtime: gameData.playtime,
      genres: gameData.genres,
      tags: gameData.tags,
      platforms: gameData.platforms,
      developers: gameData.developers,
      publishers: gameData.publishers,
      screenshots: Array.isArray(gameData.screenshots)
        ? gameData.screenshots.map((s: any) => s.image)
        : [],
      reddit_url: gameData.reddit_url,
      metacritic_url: gameData.metacritic_url,
      tba: gameData.tba,
      is_cached: true,
      updated_at: new Date().toISOString(),
    };

    // Не ждем результат, чтобы не блокировать основной поток
    this.supabaseService
      .from('games')
      .upsert([game], { onConflict: 'rawg_id' })
      .then((result: any) => {
        if (result?.error) {
          this.logger.warn(`[cacheGame] Supabase error: ${result.error.message}`);
        }
      })

  } catch (error: any) {
    // Логируем но не выбрасываем ошибку
    this.logger.warn(`[cacheGame] Exception: ${error.message}`);
  }
}

  /**
   * Фоновое кэширование
   */
  private async cacheGamesInBackground(
    games: any[],
  ): Promise<void> {
    const topGames = games.slice(0, 5);

    for (const game of topGames) {
      this.cacheGame(game).catch((err) =>
        this.logger.warn(
          `Cache failed: ${err.message}`,
        ),
      );
    }
  }


  /**
   * Ключ кэша
   */
  private buildGamesCacheKey(params: {
    page: number;
    pageSize: number;
    search?: string;
    ordering: string;
    filters: GamesFilterParams;
  }): string {
    const parts = [
      'games:list',
      `p${params.page}`,
      `s${params.pageSize}`,
      `o${params.ordering}`,
    ];

    if (params.search) {
      parts.push(`q${params.search}`);
    }

    if (params.filters.genres) {
      parts.push(
        `g${params.filters.genres}`,
      );
    }

    if (params.filters.platforms) {
      parts.push(
        `pl${params.filters.platforms}`,
      );
    }

    if (params.filters.tags) {
      parts.push(
        `t${params.filters.tags}`,
      );
    }

    if (params.filters.dates) {
      parts.push(
        `d${params.filters.dates}`,
      );
    }

    return parts.join(':');
  }
}