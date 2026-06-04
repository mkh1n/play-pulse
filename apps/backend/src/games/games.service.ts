// apps/backend/src/games/games.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { SupabaseService } from '../supabase/supabase.service';

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
  private readonly logger =
    new Logger(GamesService.name);

  private readonly MIN_ADDED_COUNT = 100;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================================
  // GET GAMES
  // ============================================================================

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

      if (search) {
        params.search = search;
      }

      if (filters.genres) {
        params.genres = filters.genres;
      }

      if (filters.platforms) {
        params.platforms =
          filters.platforms;
      }

      if (filters.tags) {
        params.tags = filters.tags;
      }

      if (filters.dates) {
        params.dates = filters.dates;
      }

      if (filters.developers) {
        params.developers =
          filters.developers;
      }

      if (filters.publishers) {
        params.publishers =
          filters.publishers;
      }

      this.logger.debug(
        `[RAWG PROXY] Games request: ${JSON.stringify(
          params,
        )}`,
      );

      const response =
        await fetchFromRawgProxy(
          this.httpService,
          'games',
          params,
        );

      const rawGames = Array.isArray(
        response?.results,
      )
        ? response.results
        : [];

      const processedGames =
        this.processGamesForQuality(
          rawGames,
          ordering,
        );

      return {
        count:
          response?.count ||
          processedGames.length,

        next:
          response?.next || null,

        previous:
          response?.previous ||
          null,

        results: processedGames
          .slice(0, pageSize)
          .map((game: any) => ({
            id: game.id,

            slug: game.slug,

            name: game.name,

            released:
              game.released,

            background_image:
              game.background_image,

            rating:
              game.rating,

            rating_top:
              game.rating_top,

            metacritic:
              game.metacritic,

            playtime:
              game.playtime,

            genres:
              game.genres || [],

            tags:
              game.tags || [],

            parent_platforms:
              game.parent_platforms ||
              [],

            added:
              game.added || 0,

            suggestions_count:
              game.suggestions_count ||
              0,

            reviews_count:
              game.reviews_count ||
              0,
          })),
      };
    } catch (error: any) {
      this.logger.error(
        `[getGames] ${error.message}`,
      );

      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }
  }

  // ============================================================================
  // GET GAME DETAILS
  // ============================================================================

  async getGameData(
    gameId: number,
  ) {
    try {
      this.logger.debug(
        `[getGameData] ${gameId}`,
      );

      const [
        gameData,
        screenshotsData,
      ] = await Promise.all([
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
        screenshotsData?.results ||
        [];

      return this.normalizeGameData(
        gameData,
        screenshots,
      );
    } catch (error: any) {
      this.logger.error(
        `[getGameData] ${error.message}`,
      );

      throw new Error(
        `Не удалось загрузить игру #${gameId}`,
      );
    }
  }

  // ============================================================================
  // QUALITY FILTER
  // ============================================================================

  private processGamesForQuality(
    games: any[],
    ordering: string,
  ): any[] {
    const filtered =
      games.filter((game) =>
        this.meetsQualityThresholds(
          game,
        ),
      );

    if (
      ordering === '-rating' ||
      ordering === 'rating'
    ) {
      return filtered
        .map((game) => ({
          ...game,

          hybridScore:
            this.calculateHybridScore(
              game,
            ),
        }))
        .sort((a, b) =>
          ordering === '-rating'
            ? b.hybridScore -
              a.hybridScore
            : a.hybridScore -
              b.hybridScore,
        );
    }

    return filtered;
  }

  // ============================================================================
  // QUALITY RULES
  // ============================================================================

  private meetsQualityThresholds(
    game: any,
  ): boolean {
    if (!game) {
      return false;
    }

    if (
      !game.name ||
      game.name.trim() === ''
    ) {
      return false;
    }

    if (
      !game.background_image
    ) {
      return false;
    }

    if (
      !game.rating ||
      game.rating < 3
    ) {
      return false;
    }

    const added =
      game.added || 0;

    if (
      added <
        this.MIN_ADDED_COUNT &&
      game.rating < 4.3
    ) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // HYBRID SCORE
  // ============================================================================

  private calculateHybridScore(
    game: any,
  ): number {
    const rating =
      game.rating || 0;

    const added =
      game.added || 0;

    const popularityFactor =
      1 +
      Math.log10(added + 1) / 4;

    return (
      rating *
      popularityFactor
    );
  }

  // ============================================================================
  // NORMALIZE GAME
  // ============================================================================

  private normalizeGameData(
    gameData: any,
    screenshots: any[],
  ) {
    return {
      id: gameData.id,

      slug: gameData.slug,

      name: gameData.name,

      released:
        gameData.released,

      tba:
        gameData.tba || false,

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
        gameData.website ||
        null,

      reddit_url:
        gameData.reddit_url ||
        null,

      metacritic_url:
        gameData.metacritic_url ||
        null,

      rating:
        gameData.rating,

      rating_top:
        gameData.rating_top,

      metacritic:
        gameData.metacritic,

      playtime:
        gameData.playtime ||
        0,

      genres: Array.isArray(
        gameData.genres,
      )
        ? gameData.genres
        : [],

      tags: Array.isArray(
        gameData.tags,
      )
        ? gameData.tags
        : [],

      platforms:
        Array.isArray(
          gameData.platforms,
        )
          ? gameData.platforms
          : [],

      stores: Array.isArray(
        gameData.stores,
      )
        ? gameData.stores
        : [],

      developers:
        Array.isArray(
          gameData.developers,
        )
          ? gameData.developers
          : [],

      publishers:
        Array.isArray(
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

      added:
        gameData.added || 0,

      suggestions_count:
        gameData.suggestions_count ||
        0,

      reviews_count:
        gameData.reviews_count ||
        0,

      esrb_rating:
        gameData.esrb_rating ||
        null,

      parent_platforms:
        gameData.parent_platforms ||
        [],

      alternative_names:
        gameData.alternative_names ||
        [],
    };
  }

  // ============================================================================
  // SEARCH CACHED GAMES
  // ============================================================================

  async searchCachedGames(
    query: string,
    limit: number = 20,
  ): Promise<any> {
    try {
      const { data, error } =
        await this.supabaseService
          .from('games')
          .select(
            `
            rawg_id,
            name,
            slug,
            background_image,
            rating,
            released
          `,
          )
          .ilike(
            'name',
            `%${query}%`,
          )
          .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // GET CACHED GAME
  // ============================================================================

  async getCachedGameById(
    rawgId: number,
  ): Promise<any> {
    try {
      const { data, error } =
        await this.supabaseService
          .from('games')
          .select(
            `
            rawg_id,
            name,
            slug,
            released,
            background_image,
            rating,
            metacritic,
            genres,
            tags,
            screenshots
          `,
          )
          .eq(
            'rawg_id',
            rawgId,
          )
          .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  
  async getSimilarGames(
    gameId: number,
    limit = 10,
  ) {
    this.logger.log(`[SimilarGames] Finding games similar to #${gameId}`);

    try {
      // 1. Получаем целевую игру из БД — только нужные поля
      const { data: target, error: targetError } = await this.supabaseService
        .getClient()
        .from('games')
        .select('rawg_id, name, genres') // ✅ Только нужные поля
        .eq('rawg_id', gameId)
        .single();

      if (targetError || !target) {
        this.logger.warn(`[SimilarGames] Game #${gameId} not found in DB, using RAWG`);
        return this.getSimilarGamesFromRawg(gameId, limit);
      }

      // 2. Парсим жанры
      let targetGenres: any[] = [];
      if (typeof target.genres === 'string') {
        try { targetGenres = JSON.parse(target.genres); } catch { targetGenres = []; }
      } else if (Array.isArray(target.genres)) {
        targetGenres = target.genres;
      }

      const targetGenreIds = targetGenres.map((g: any) => g.id);

      if (targetGenreIds.length === 0) {
        this.logger.warn(`[SimilarGames] No genres for game #${gameId}`);
        return this.getRelevantGames(limit);
      }

      this.logger.log(`[SimilarGames] Target: "${target.name}", genres: [${targetGenreIds.join(', ')}]`);

      // 3. Получаем игры из БД — ТОЛЬКО нужные поля, без screenshots/trailers
      const { data: allGames, error: allError } = await this.supabaseService
        .getClient()
        .from('games')
        .select(`
  rawg_id,
  name,
  background_image,
  rating,
  metacritic,
  genres,
  tags,
  released,
  added
`)
        .neq('rawg_id', gameId)
        .not('background_image', 'is', null)
        .gte('rating', 3.0)
        .order('rating', { ascending: false })
        .limit(100); // ✅ Уменьшил с 200 до 100

      if (allError) {
        this.logger.error(`[SimilarGames] DB error: ${allError.message}`);
        return this.getSimilarGamesFromRawg(gameId, limit);
      }

      if (!allGames?.length) {
        this.logger.warn('[SimilarGames] No games in DB, trying RAWG');
        return this.getSimilarGamesFromRawg(gameId, limit);
      }

      this.logger.log(`[SimilarGames] Loaded ${allGames.length} games from DB, calculating similarity...`);

      // 4. Считаем similarity score
      const scored = allGames.map((game: any) => {
        let gameGenres: any[] = [];
        let gameTags: any[] = [];

        if (typeof game.tags === 'string') {
          try {
            gameTags = JSON.parse(game.tags);
          } catch {
            gameTags = [];
          }
        } else if (Array.isArray(game.tags)) {
          gameTags = game.tags;
        }
        if (typeof game.genres === 'string') {
          try { gameGenres = JSON.parse(game.genres); } catch { gameGenres = []; }
        } else if (Array.isArray(game.genres)) {
          gameGenres = game.genres;
        }

        const gameGenreIds = gameGenres.map((g: any) => g.id);
        const sharedGenres = targetGenreIds.filter(id => gameGenreIds.includes(id)).length;

        let score = sharedGenres * 20;
        if (game.rating) score += Math.min(game.rating * 5, 25);
        if (game.metacritic) score += Math.min(game.metacritic / 5, 15);

        const topTargetGenres = targetGenreIds.slice(0, 3);
        const topMatchCount = topTargetGenres.filter(id => gameGenreIds.includes(id)).length;
        score += topMatchCount * 15;

        return {
          id: game.rawg_id,
          name: game.name,
          background_image: game.background_image,
          rating: game.rating,
          metacritic: game.metacritic,

          genres:
            gameGenres,

          tags:
            gameTags,

          released:
            game.released,

          added:
            game.added,

          sharedGenres,

          similarityScore:
            score,
        };
      });

      // 5. Сортируем
      scored.sort((a, b) => {
        if (b.sharedGenres !== a.sharedGenres) return b.sharedGenres - a.sharedGenres;
        if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
        return (b.rating || 0) - (a.rating || 0);
      });

      const result = scored.slice(0, limit);

      this.logger.log(`[SimilarGames] ✅ Found ${result.length} similar games`);
      result.slice(0, 3).forEach((g, i) => {
        this.logger.debug(`  ${i + 1}. "${g.name}" - shared: ${g.sharedGenres}, score: ${g.similarityScore}`);
      });

      return result;

    } catch (error: any) {
      this.logger.error(`[SimilarGames] Error: ${error.message}`);
      return this.getRelevantGames(limit);
    }
  }

  /**
   * Fallback: поиск похожих игр через RAWG API
   */
  private async getSimilarGamesFromRawg(
    gameId: number,
    limit = 10,
  ) {
    this.logger.log(`[SimilarGames] Fetching from RAWG for #${gameId}`);

    try {
      const target = await fetchFromRawgProxy(
        this.httpService,
        `games/${gameId}`,
        {},
      );

      if (!target) {
        return this.getRelevantGames(limit);
      }

      const genreIds = target.genres
        ?.slice(0, 3)
        .map((g: any) => g.id)
        .join(',');

      if (!genreIds) {
        return this.getRelevantGames(limit);
      }

      const response = await fetchFromRawgProxy(
        this.httpService,
        'games',
        {
          genres: genreIds,
          ordering: '-rating',
          page_size: 40,
        },
      );

      const results = response?.results || [];

      const filtered = results.filter((g: any) => {
        return (
          g.id !== gameId &&
          g.rating >= 3.5 &&
          g.background_image
        );
      });

      const scored = filtered.map((game: any) => ({
  id: game.id,
  name: game.name,
  background_image: game.background_image,
  rating: game.rating,
  metacritic: game.metacritic,

  genres:
    game.genres || [],

  tags:
    game.tags || [],

  released:
    game.released,

  parent_platforms:
    game.parent_platforms || [],

  added:
    game.added,

  similarityScore:
    this.calculateSimilarity(
      target,
      game,
    ),
}));

      scored.sort((a, b) => b.similarityScore - a.similarityScore);

      return scored.slice(0, limit);

    } catch (error: any) {
      this.logger.error(`[SimilarGames] RAWG fallback error: ${error.message}`);
      return this.getRelevantGames(limit);
    }
  }

  /**
   * Вычисление similarity score (для данных из кэша)
   */
  private calculateSimilarityFromCache(
    targetGenres: any[],
    candidateGenres: any[],
    candidateRating: number,
    candidateMetacritic: number | null,
  ): number {
    let score = 0;

    const targetGenreIds = new Set(targetGenres.map((g: any) => g.id));
    const candidateGenreIds = new Set(candidateGenres.map((g: any) => g.id));

    const sharedGenres = [...targetGenreIds].filter(
      (g) => candidateGenreIds.has(g)
    ).length;

    // Каждый общий жанр = 20 баллов
    score += sharedGenres * 20;

    // Бонус за рейтинг (до 25 баллов)
    if (candidateRating) {
      score += Math.min(candidateRating * 5, 25);
    }

    // Бонус за Metacritic (до 15 баллов)
    if (candidateMetacritic) {
      score += Math.min(candidateMetacritic / 5, 15);
    }

    return score;
  }

  /**
   * Вычисление similarity score (для данных из RAWG API)
   */
  private calculateSimilarity(
    target: any,
    candidate: any,
  ): number {
    return this.calculateSimilarityFromCache(
      target.genres || [],
      candidate.genres || [],
      candidate.rating,
      candidate.metacritic,
    );
  }
  async getRelevantGames(limit = 10) {
    this.logger.log(`[PopularGames] Loading ${limit} popular games`);

    try {
      const response = await fetchFromRawgProxy(
        this.httpService,
        'games',
        {
          page: 1,
          page_size: 20,
          ordering: '-added',
        },
      );

      const games = response?.results || [];

      const filtered = games
  .filter((g: any) =>
    g.rating >= 3.5 &&
    g.background_image
  )
  .slice(0, limit)
  .map((game: any) => ({
    id: game.id,
    name: game.name,
    background_image: game.background_image,
    rating: game.rating,
    metacritic: game.metacritic,

    genres:
      game.genres || [],

    tags:
      game.tags || [],

    released:
      game.released,

    parent_platforms:
      game.parent_platforms || [],

    added:
      game.added,
  }));

      this.logger.log(`[PopularGames] ✅ Returning ${filtered.length} games`);

      return filtered;

    } catch (error: any) {
      this.logger.error(`[PopularGames] Error: ${error.message}`);
      return [];
    }
  }
}