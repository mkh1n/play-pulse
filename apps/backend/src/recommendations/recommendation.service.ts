// apps/backend/src/recommendations/recommendation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '../supabase/supabase.service';
import { fetchFromRawgProxy } from '../games/rawg-proxy';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  private readonly MIN_RATING = 4.0;
  private readonly MIN_RATINGS_COUNT = 30;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
  ) { }

  async getRandomGamesForSwipes(
    userId: number,
    limit = 10,
    excludeGameIds: number[] = [],
  ) {
    this.logger.log(`[RandomSwipes] Loading ${limit} games for user ${userId}`);

    try {
      // 1. Получаем ID игр, с которыми пользователь взаимодействовал
      const { data: actions } = await this.supabaseService
        .getClient()
        .from('user_game_actions')
        .select('game_id')
        .eq('user_id', userId);

      const interactedIds = [
        ...(actions?.map((a: any) => a.game_id) || []),
        ...excludeGameIds,
      ].filter(id => id != null);

      const uniqueInteractedIds = [...new Set(interactedIds)];

      this.logger.log(`[RandomSwipes] Excluding ${uniqueInteractedIds.length} games`);

      // 2. Делаем ПАРАЛЛЕЛЬНЫЕ запросы к 3 случайным страницам из топа-10
      const randomPages = this.getRandomElements([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);

      this.logger.log(`[RandomSwipes] Fetching pages: ${randomPages.join(', ')}`);

      const pagePromises = randomPages.map(page =>
        fetchFromRawgProxy(this.httpService, 'games', {
          page,
          page_size: 20,
          ordering: '-rating',
        }).catch(err => {
          this.logger.warn(`[RandomSwipes] Page ${page} failed: ${err.message}`);
          return { results: [] };
        })
      );

      // Ждем все запросы параллельно (макс 3-5 секунд)
      const responses = await Promise.all(pagePromises);

      // 3. Собираем и фильтруем игры
      let allGames: any[] = [];

      for (const response of responses) {
        const games = response?.results || [];
        const filtered = games.filter((game: any) => {
          return (
            game.rating >= this.MIN_RATING &&
            game.ratings_count >= this.MIN_RATINGS_COUNT &&
            game.background_image &&
            !uniqueInteractedIds.includes(game.id)
          );
        });
        allGames.push(...filtered);
      }

      this.logger.log(`[RandomSwipes] Found ${allGames.length} valid games`);

      // 4. Если не хватило — еще 2 страницы параллельно
      if (allGames.length < limit) {
        this.logger.warn('[RandomSwipes] Not enough, fetching 2 more pages');

        const extraPages = this.getRandomElements([11, 12, 13, 14, 15], 2);
        const extraPromises = extraPages.map(page =>
          fetchFromRawgProxy(this.httpService, 'games', {
            page,
            page_size: 20,
            ordering: '-rating',
          }).catch(() => ({ results: [] }))
        );

        const extraResponses = await Promise.all(extraPromises);

        for (const response of extraResponses) {
          const games = response?.results || [];
          const filtered = games.filter((game: any) => {
            return (
              game.rating >= this.MIN_RATING &&
              game.ratings_count >= this.MIN_RATINGS_COUNT &&
              game.background_image &&
              !uniqueInteractedIds.includes(game.id)
            );
          });
          allGames.push(...filtered);
        }
      }

      // 5. Если ВООБЩЕ нет — fallback с мягкими условиями (1 страница)
      if (allGames.length === 0) {
        this.logger.warn('[RandomSwipes] Fallback: any popular game with image');

        const response = await fetchFromRawgProxy(this.httpService, 'games', {
          page: 1,
          page_size: 20,
          ordering: '-added',
        });

        const games = response?.results || [];
        allGames = games.filter((game: any) =>
          game.background_image && !uniqueInteractedIds.includes(game.id)
        );
      }

      // 6. Перемешиваем и возвращаем
      const shuffled = this.shuffleArray(allGames);
      const result = shuffled.slice(0, limit);

      this.logger.log(`[RandomSwipes] ✅ Returning ${result.length} games`);

      return result.map((game: any) => ({
        id: game.id,
        name: game.name,
        background_image: game.background_image,
        rating: game.rating,

        genres:
          game.genres || [],

        tags:
          game.tags || [],

        released:
          game.released,

        metacritic:
          game.metacritic,

        ratings_count:
          game.ratings_count,

        added:
          game.added,

        parent_platforms:
          game.parent_platforms || [],
      }));

    } catch (error: any) {
      this.logger.error(`[RandomSwipes] ❌ Critical error: ${error.message}`);
      return [];
    }
  }

  /**
   * Получить N случайных элементов из массива
   */
  private getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // apps/backend/src/recommendations/recommendation.service.ts

  /**
   * Получить похожие игры на основе жанров (из БД)
   */
  // apps/backend/src/recommendations/recommendation.service.ts

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
        return this.getPopularGames(limit);
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
  ratings_count,
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

          ratings_count:
            game.ratings_count,

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
      return this.getPopularGames(limit);
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
        return this.getPopularGames(limit);
      }

      const genreIds = target.genres
        ?.slice(0, 3)
        .map((g: any) => g.id)
        .join(',');

      if (!genreIds) {
        return this.getPopularGames(limit);
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

  ratings_count:
    game.ratings_count,

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
      return this.getPopularGames(limit);
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
  async getPopularGames(limit = 10) {
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

    ratings_count:
      game.ratings_count,

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