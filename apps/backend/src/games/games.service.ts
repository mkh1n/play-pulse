// apps/backend/src/games/games.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Game } from './entities/game.entity';

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
  // 🔥 ИСПРАВЛЕНО: убраны пробелы в URL!
  private readonly RAWG_BASE_URL = 'https://api.rawg.io/api/games';

  // ⚙️ Пороги качества для фильтрации "мусора"
  private readonly MIN_RATINGS_COUNT = 50;      // минимум 50 оценок
  private readonly MIN_ADDED_COUNT = 100;        // минимум 100 добавлений в библиотеки
  private readonly MIN_RATING_FOR_LOW_POPULARITY = 4.5; // если мало оценок — нужен очень высокий рейтинг

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Получить список игр с кэшированием и УМНОЙ сортировкой
   */
  async getGames(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    ordering: string = '-rating',
    filters: GamesFilterParams = {}
  ) {
    const cacheKey = this.buildGamesCacheKey({ page, pageSize, search, ordering, filters });

    try {
      const params: any = {
        key: this.configService.get('RAWG_API_KEY'),
        page,
        page_size: pageSize * 2, // 🔥 Берём с запасом для пост-фильтрации
        ordering,
      };

      if (search) params.search = search;
      if (filters.genres) params.genres = filters.genres;
      if (filters.platforms) params.platforms = filters.platforms;
      if (filters.tags) params.tags = filters.tags;
      if (filters.dates) params.dates = filters.dates;
      if (filters.developers) params.developers = filters.developers;
      if (filters.publishers) params.publishers = filters.publishers;

      this.logger.debug(`[RAWG] Request params: ${JSON.stringify(params)}`);

      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params })
      );

      // 🔥 ПОСТ-ОБРАБОТКА: фильтруем и пересортировываем
      let processedGames = this.processGamesForQuality(response.data.results || [], ordering);

      // 🔥 Обрезаем до запрошенного pageSize после фильтрации
      processedGames = processedGames.slice(0, pageSize);

      // 🔄 Фоновое кэширование
      this.cacheGamesInBackground(processedGames).catch(err =>
        this.logger.warn(`⚠️ Background cache failed: ${err.message}`)
      );

      // 📦 Проверяем кэш
      const cachedGames = await this.getCachedGames(processedGames.map((g: any) => g.id));
      const cachedIds = new Set(cachedGames.map((g: any) => g.rawg_id));

      return {
        ...response.data,
        count: processedGames.length, // 🔥 Обновляем count после фильтрации
        results: processedGames.map((game: any) => ({
          ...game,
          is_cached: cachedIds.has(game.id),
        })),
      };
    } catch (error: any) {
      this.logger.error(`[getGames] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 УМНАЯ обработка игр: фильтрация качества + гибридная сортировка
   */
  private processGamesForQuality(games: any[], ordering: string): any[] {
    // 1. Фильтруем "мусорные" игры
    const filtered = games.filter(game => this.meetsQualityThresholds(game));

    // 2. Если сортировка по рейтингу — применяем гибридную сортировку
    if (ordering === '-rating' || ordering === 'rating') {
      return filtered
        .map(game => ({
          ...game,
          // 🔥 Гибридный скор: рейтинг × лог(популярность + 1)
          hybridScore: this.calculateHybridScore(game),
        }))
        .sort((a, b) => ordering === '-rating' 
          ? b.hybridScore - a.hybridScore 
          : a.hybridScore - b.hybridScore
        );
    }

    // Для других сортировок возвращаем как есть
    return filtered;
  }

  /**
   * 🔥 Проверка качества игры
   */
  private meetsQualityThresholds(game: any): boolean {
    // 1. Минимальный рейтинг
    if (!game.rating || game.rating < 3.0) return false;

    // 2. Проверяем количество оценок и популярность
    const ratingsCount = game.ratings_count || 0;
    const addedCount = game.added || 0;

    // 🔥 Если оценок мало (<50) — нужен очень высокий рейтинг или большая популярность
    if (ratingsCount < this.MIN_RATINGS_COUNT) {
      if (game.rating < this.MIN_RATING_FOR_LOW_POPULARITY && addedCount < this.MIN_ADDED_COUNT) {
        return false; // Отбрасываем: мало оценок + средний рейтинг + мало популярности
      }
    }

    // 3. Если добавлений мало (<100) — тоже фильтруем, если рейтинг не отличный
    if (addedCount < this.MIN_ADDED_COUNT && game.rating < 4.3) {
      return false;
    }

    // 4. Исключаем игры с пустыми названиями
    if (!game.name || game.name.trim() === '') return false;

    return true;
  }

  /**
   * 🔥 ГИБРИДНЫЙ СКОР: баланс между рейтингом и популярностью
   * Формула: rating * (1 + log10(added + 1) / 4)
   * Пример:
   * - Рейтинг 4.8, added=10 → 4.8 * 1.03 = 4.94
   * - Рейтинг 4.5, added=10000 → 4.5 * 1.25 = 5.62 ← выше!
   */
  private calculateHybridScore(game: any): number {
    const rating = game.rating || 0;
    const added = game.added || 0;
    
    // Логарифмическая шкала популярности (чтобы не доминировала)
    const popularityFactor = 1 + Math.log10(added + 1) / 4;
    
    // Также учитываем ratings_count
    const ratingsCount = game.ratings_count || 0;
    const ratingsFactor = 1 + Math.log10(ratingsCount + 1) / 5;
    
    // Итоговый скор
    return rating * popularityFactor * ratingsFactor;
  }

  /**
   * Получить детальную информацию об игре
   */
  async getGameData(gameId: number) {
    try {
      const params = { key: this.configService.get('RAWG_API_KEY') };
      const rawgGameUrl = `${this.RAWG_BASE_URL}/${gameId}`;
      const rawgScreenshotsUrl = `${this.RAWG_BASE_URL}/${gameId}/screenshots`;

      this.logger.debug(`[getGameData] Fetching full data for game ${gameId}`);

      const [gameResponse, screenshotsResponse] = await Promise.all([
        firstValueFrom(this.httpService.get(rawgGameUrl, { params })),
        firstValueFrom(this.httpService.get(rawgScreenshotsUrl, { params })),
      ]);

      let gameData = gameResponse.data;
      const screenshots = screenshotsResponse.data?.results || [];

      gameData = this.normalizeGameData(gameData, screenshots);

      await this.cacheGame(gameData).catch(err =>
        this.logger.warn(`⚠️ Failed to cache game ${gameId}: ${err.message}`)
      );

      this.logger.debug(`[getGameData] Returned full data for game ${gameId}`);
      
      return { 
        ...gameData, 
        rawg_id: gameData.id, 
        is_cached: false
      };

    } catch (error: any) {
      this.logger.error(`[getGameData] Critical error for game ${gameId}: ${error.message}`);
      
      try {
        const cached = await this.getCachedGame(gameId);
        if (cached) {
          this.logger.warn(`[getGameData] RAWG failed, returning cached data for ${gameId}`);
          return { ...cached, is_cached: true };
        }
      } catch {}
      
      throw new Error(`Не удалось загрузить данные игры #${gameId}: ${error.message}`);
    }
  }

  private normalizeGameData(gameData: any, screenshots: any[]): any {
    return {
      id: gameData.id,
      slug: gameData.slug,
      name: gameData.name,
      released: gameData.released,
      tba: gameData.tba || false,
      background_image: gameData.background_image,
      description: gameData.description_raw || gameData.description || null,
      description_raw: gameData.description_raw || gameData.description || null,
      website: gameData.website || null,
      reddit_url: gameData.reddit_url || null,
      metacritic_url: gameData.metacritic_url || null,
      rating: gameData.rating,
      rating_top: gameData.rating_top,
      metacritic: gameData.metacritic,
      playtime: gameData.playtime || 0,
      genres: Array.isArray(gameData.genres) ? gameData.genres : [],
      tags: Array.isArray(gameData.tags) ? gameData.tags : [],
      platforms: Array.isArray(gameData.platforms) ? gameData.platforms : [],
      stores: Array.isArray(gameData.stores) ? gameData.stores : [],
      developers: Array.isArray(gameData.developers) ? gameData.developers : [],
      publishers: Array.isArray(gameData.publishers) ? gameData.publishers : [],
      trailers: Array.isArray(gameData.trailers) ? gameData.trailers : [],
      screenshots: screenshots,
      added: gameData.added,
      ratings_count: gameData.ratings_count,
      suggestions_count: gameData.suggestions_count,
      reviews_count: gameData.reviews_count,
      esrb_rating: gameData.esrb_rating,
      parent_platforms: gameData.parent_platforms,
      alternative_names: gameData.alternative_names || [],
      is_cached: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async searchCachedGames(query: string, limit: number = 20): Promise<Game[]> {
    try {
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

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

    if (params.search) parts.push(`q${params.search}`);
    if (params.filters.genres) parts.push(`g${params.filters.genres}`);
    if (params.filters.platforms) parts.push(`pl${params.filters.platforms}`);
    if (params.filters.tags) parts.push(`t${params.filters.tags}`);
    if (params.filters.dates) parts.push(`d${params.filters.dates}`);

    return parts.join(':');
  }

  private async getCachedGame(rawgId: number): Promise<Game | null> {
    try {
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .eq('rawg_id', rawgId)
        .single();

      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }

  private async getCachedGames(rawgIds: number[]): Promise<Game[]> {
    if (rawgIds.length === 0) return [];
    try {
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .in('rawg_id', rawgIds);

      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  private async cacheGame(gameData: any): Promise<void> {
    try {
      const normalized = this.normalizeGameData(gameData, gameData.screenshots || []);

      const game: Partial<Game> = {
        rawg_id: normalized.id,
        name: normalized.name,
        slug: normalized.slug,
        released: normalized.released,
        description: normalized.description,
        description_raw: normalized.description_raw,
        background_image: normalized.background_image,
        website: normalized.website,
        rating: normalized.rating,
        rating_top: normalized.rating_top,
        metacritic: normalized.metacritic,
        playtime: normalized.playtime,
        genres: normalized.genres,
        tags: normalized.tags,
        platforms: normalized.platforms,
        developers: normalized.developers,
        publishers: normalized.publishers,
        trailers: normalized.trailers,
        screenshots: normalized.screenshots,
        reddit_url: normalized.reddit_url,
        metacritic_url: normalized.metacritic_url,
        tba: normalized.tba,
        is_cached: true,
        created_at: normalized.created_at,
        updated_at: normalized.updated_at,
      };

      const { error } = await this.supabaseService
        .from('games')
        .upsert([game], { onConflict: 'rawg_id' });

      if (error) {
        this.logger.error(`[cacheGame] Supabase error for game ${gameData.id}: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.error(`[cacheGame] Exception for game ${gameData.id}: ${error.message}`);
    }
  }

  private async cacheGamesInBackground(games: any[]): Promise<void> {
    const promises = games.map(game => this.cacheGame(game));
    await Promise.allSettled(promises);
  }
}