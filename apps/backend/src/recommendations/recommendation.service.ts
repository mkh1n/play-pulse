import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import pLimit from 'p-limit';

import { SupabaseService } from '../supabase/supabase.service';

import { fetchFromRawgProxy } from '../games/rawg-proxy';

import { PreferencesService } from './preferences.service';

interface UserSignals {
  genreWeights: Map<number, number>;

  tagWeights: Map<number, number>;

  seenGameIds: Set<number>;
}

interface CacheEntry<T> {
  data: T;

  fetchedAt: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger =
    new Logger(
      RecommendationService.name,
    );

  private readonly rawgLimit =
    pLimit(3);

  private readonly RAWG_CACHE_TTL =
    1000 * 60 * 60;

  private readonly SWIPE_POOL_TTL =
    1000 * 60 * 30;

  private readonly rawgCache =
    new Map<
      string,
      CacheEntry<any>
    >();

  private readonly inflight =
    new Map<
      string,
      Promise<any>
    >();

  // =====================================================
  // USER SWIPE POOLS
  // =====================================================

  private readonly swipePools =
    new Map<
      number,
      CacheEntry<any[]>
    >();

  constructor(
    private readonly httpService: HttpService,

    private readonly supabaseService: SupabaseService,
    
    private readonly preferencesService: PreferencesService,
  ) {
    // Регистрируем callback для инвалидации кэша при действиях пользователя
    this.preferencesService.invalidateSwipeCache = (userId: number) => {
      this.invalidateUserPool(userId);
    };
  }

  // =====================================================
  // SWIPE POOL INVALIDATION
  // =====================================================

  invalidateUserPool(
    userId: number,
  ) {
    this.swipePools.delete(
      userId,
    );
  }

  // =====================================================
  // SWIPE GAMES - FAST VERSION FOR REAL-TIME FEED
  // =====================================================

  async getSwipeRecommendations(
    userId: number,
    limit = 10,
    excludeGameIds: number[] = [],
  ) {
    this.logger.log(`[SwipeFeed] loading ${limit} games for user ${userId}`);

    try {
      // ПЕРВОЕ: Пробуем получить из готовой очереди (очень быстро!)
      const { data: queueData, error: queueError } = await this.supabaseService
        .getClient()
        .rpc('get_user_recommendations_from_queue', {
          p_user_id: userId,
          p_limit: limit,
        });

      if (!queueError && queueData && queueData.length > 0) {
        this.logger.log(`[SwipeFeed] Got ${queueData.length} games from queue`);
        
        // Помечаем игры как потребленные
        for (const item of queueData) {
          await this.supabaseService
            .getClient()
            .rpc('mark_recommendation_consumed', {
              p_user_id: userId,
              p_game_id: item.game_id,
            });
        }

        // Проверяем, нужно ли пополнить очередь
        const { data: stateData } = await this.supabaseService
          .getClient()
          .from('user_recommendation_state')
          .select('preferences_dirty')
          .eq('user_id', userId)
          .single();

        if (stateData?.preferences_dirty || queueData.length < limit) {
          // Пополняем очередь в фоне (не ждем ответа)
          this.rebuildUserQueue(userId).catch(err => 
            this.logger.warn(`[SwipeFeed] Background rebuild failed: ${err.message}`)
          );
        }

        return queueData.map(item => ({
          id: item.game_id,
          name: item.name,
          background_image: item.background_image,
          rating: item.rating,
          genres: item.genres,
          released: item.released,
          metacritic: item.metacritic,
        }));
      }

      // ЕСЛИ ОЧЕРЕДЬ ПУСТАЯ: Генерируем рекомендации на лету
      this.logger.log('[SwipeFeed] Queue empty, generating on-the-fly');
      return await this.generateSwipeRecommendations(userId, limit, excludeGameIds);
    } catch (error: any) {
      this.logger.error(`[SwipeFeed] Critical error: ${error.message}`);
      
      // Fallback на популярные игры
      return await this.getPopularGames(limit);
    }
  }

  // =====================================================
  // GENERATE SWIPE RECOMMENDATIONS ON-THE-FLY
  // =====================================================

  private async generateSwipeRecommendations(
    userId: number,
    limit = 10,
    excludeGameIds: number[] = [],
  ) {
    // 1. Получаем ID игр, с которыми пользователь взаимодействовал
    const { data: actions, error: actionsError } =
      await this.supabaseService
        .getClient()
        .from('user_game_actions')
        .select('game_id')
        .eq('user_id', userId);

    if (actionsError) {
      this.logger.warn(`[SwipeFeed] Can't load actions: ${actionsError.message}`);
    }

    const interactedIds = [
      ...(actions?.map((a) => a.game_id) || []),
      ...excludeGameIds,
    ];

    // 2. Базовый запрос - только нужные поля
    let query = this.supabaseService
      .getClient()
      .from('games')
      .select(`
        id,
        name,
        background_image,
        rating,
        genres,
        released,
        metacritic
      `)
      .order('rating', { ascending: false })
      .limit(limit * 3);

    // 3. Исключаем просмотренные игры НА УРОВНЕ SQL
    if (interactedIds.length > 0) {
      query = query.not(
        'id',
        'in',
        `(${interactedIds.join(',')})`,
      );
    }

    const { data: games, error: gamesError } = await query;

    if (gamesError) {
      throw new Error(gamesError.message);
    }

    if (!games?.length) {
      // Если игры закончились, пробуем без исключений
      this.logger.warn('[SwipeFeed] No more games, trying without exclusions');
      
      const { data: fallbackGames } = await this.supabaseService
        .getClient()
        .from('games')
        .select(`
          id,
          name,
          background_image,
          rating,
          genres,
          released
        `)
        .order('rating', { ascending: false })
        .limit(limit);

      return fallbackGames || [];
    }

    // 4. Простая рандомизация для разнообразия
    const shuffled = games.sort(() => Math.random() - 0.5);

    // 5. Возвращаем limit игр
    return shuffled.slice(0, limit);
  }

  // =====================================================
  // REBUILD USER QUEUE (BACKGROUND)
  // =====================================================

  private async rebuildUserQueue(userId: number) {
    try {
      this.logger.log(`[SwipeFeed] Rebuilding queue for user ${userId}`);

      // Вызываем хранимую процедуру для пополнения очереди
      const { error } = await this.supabaseService
        .getClient()
        .rpc('rebuild_user_recommendation_queue', {
          p_user_id: userId,
          p_queue_size: 100,
        });

      if (error) {
        throw error;
      }

      // Помечаем очередь как обновленную
      await this.supabaseService
        .getClient()
        .from('user_recommendation_state')
        .upsert({
          user_id: userId,
          preferences_dirty: false,
          last_rebuild: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      this.logger.log(`[SwipeFeed] Queue rebuilt successfully for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`[SwipeFeed] Queue rebuild failed: ${error.message}`);
    }
  }

  // =====================================================
  // SWIPE GAMES - LEGACY WITH POOL BUILDING
  // =====================================================

  async getSwipeGames(
    userId: number,
    limit = 20,
    excludeGameIds: number[] = [],
  ) {
    // Для обратной совместимости используем быстрый метод
    const games = await this.getSwipeRecommendations(
      userId,
      limit,
      excludeGameIds,
    );

    return {
      games,
      hasMore: games.length === limit,
    };
  }

  // =====================================================
  // BUILD USER SWIPE POOL
  // =====================================================

  private async buildSwipePool(
    userId: number,
  ) {
    const signals =
      await this.fetchUserSignals(
        userId,
      );

    const hiddenIds =
      signals.seenGameIds;

    // =====================================================
    // MIX STRATEGY: 60% personalized, 40% popular + new discoveries
    // =====================================================

    const [
      personalized,
      popular,
    ] =
      await Promise.all([
        this.getPersonalizedGames(
          signals,
          100,  // Уменьшили для баланса
        ),

        this.getPopularGames(
          80,   // Уменьшили для баланса
        ),
      ]);

    // =====================================================
    // ADD NEW DISCOVERIES (games from genres user hasn't explored)
    // =====================================================

    const discovered = await this.getDiscoveryGames(signals, 50);

    const merged = [
      ...personalized,
      ...popular,
      ...discovered,
    ];

    // =====================================================
    // UNIQUE
    // =====================================================

    const unique =
      Array.from(
        new Map(
          merged.map(
            (game) => [
              game.id,
              game,
            ],
          ),
        ).values(),
      );

    // =====================================================
    // FILTER
    // =====================================================

    const filtered =
      unique.filter(
        (game) =>
          !hiddenIds.has(
            game.id,
          ) &&
          this.isQualityGame(
            game,
          ),
      );

    // =====================================================
    // SCORE
    // =====================================================

    const scored =
      filtered.map(
        (game) => ({
          ...game,

          swipeScore:
            this.scoreGame(
              game,
              signals,
            ),
        }),
      );

    scored.sort(
      (a, b) =>
        b.swipeScore -
        a.swipeScore,
    );

    // =====================================================
    // SHUFFLE TOP RESULTS WITH WEIGHTED DISTRIBUTION
    // =====================================================

    const top =
      scored.slice(
        0,
        300,
      );

    // Перемешиваем с сохранением весов: первые 60% - персонализированные, остальные - популярные и новые
    return this.shuffleWithWeights(top, signals);
  }

  // =====================================================
  // PERSONALIZED
  // =====================================================

  private async getPersonalizedGames(
    signals: UserSignals,
    limit = 40,
  ) {
    const topGenres =
      Array.from(
        signals.genreWeights.entries(),
      )
        .sort(
          (a, b) =>
            b[1] - a[1],
        )
        .slice(0, 5)
        .map(
          ([genreId]) =>
            genreId,
        );

    if (!topGenres.length) {
      return [];
    }

    // Используем БД кэш вместо RAWG API для скорости
    try {
      const genreIdList = topGenres.join(',');
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .contains('genres', [{ id: topGenres[0] }])
        .order('rating', { ascending: false })
        .limit(limit * 2);

      if (error || !data) {
        return [];
      }

      return data.filter(g => this.isQualityGame(g));
    } catch (error) {
      this.logger.error(`[getPersonalizedGames] Error: ${error.message}`);
      return [];
    }
  }

  // =====================================================
  // POPULAR
  // =====================================================

  async getPopularGames(
    limit = 20,
  ) {
    try {
      // Используем БД кэш для скорости
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .order('rating', { ascending: false })
        .limit(limit * 2);

      if (error || !data) {
        return [];
      }

      return data.filter(g => this.isQualityGame(g)).slice(0, limit);
    } catch (error) {
      this.logger.error(`[getPopularGames] Error: ${error.message}`);
      return [];
    }
  }

  // =====================================================
  // USER SIGNALS
  // =====================================================

  private async fetchUserSignals(
    userId: number,
  ): Promise<UserSignals> {
    try {
      const { data, error } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select(`
            game_id,
            action_type,
            rating,
            genres,
            tags,
            purchase_status,
            completion_status
          `)
          .eq(
            'user_id',
            userId,
          );

      if (error) {
        this.logger.error(`[fetchUserSignals] Error: ${error.message}`);
        // Возвращаем пустые сигналы при ошибке БД, чтобы не ломать весь поток
        return {
          genreWeights: new Map(),
          tagWeights: new Map(),
          seenGameIds: new Set(),
        };
      }

      const genreWeights =
        new Map<
          number,
          number
        >();

      const tagWeights =
        new Map<
          number,
          number
        >();

      const seenGameIds =
        new Set<number>();

      for (const action of data || []) {
        // =====================================================
        // HIDE ALREADY INTERACTED GAMES
        // =====================================================

        // Добавляем ВСЕ игры с которыми было взаимодействие
        seenGameIds.add(
          action.game_id,
        );

        let multiplier = 0;

        switch (
          action.action_type
        ) {
          case 'like':
            multiplier = 5;
            break;

          case 'dislike':
            multiplier = -5;
            break;

          case 'wishlist':
          case 'add_to_wishlist':
            multiplier = 3;
            break;

          case 'rate':
            multiplier =
              Number(
                action.rating ||
                  0,
              );
            break;

          // Статусы тоже считаем взаимодействием
          case 'status_change':
          case 'purchase_change':
            multiplier = 2;
            break;
        }

        if (
          action.purchase_status ===
          'owned'
        ) {
          multiplier += 2;
        }

        if (
          action.completion_status ===
          'completed'
        ) {
          multiplier += 3;
        }

        const genres =
          Array.isArray(
            action.genres,
          )
            ? action.genres
            : [];

        const tags =
          Array.isArray(
            action.tags,
          )
            ? action.tags
            : [];

        for (const genre of genres) {
          if (!genre?.id)
            continue;

          genreWeights.set(
            genre.id,

            (genreWeights.get(
              genre.id,
            ) || 0) +
              multiplier,
          );
        }

        for (const tag of tags) {
          if (!tag?.id)
            continue;

          tagWeights.set(
            tag.id,

            (tagWeights.get(
              tag.id,
            ) || 0) +
              multiplier,
          );
        }
      }

      return {
        genreWeights,

        tagWeights,

        seenGameIds,
      };
    } catch (error: any) {
      this.logger.error(`[fetchUserSignals] Critical error: ${error.message}`);
      // Возвращаем пустые сигналы при критической ошибке
      return {
        genreWeights: new Map(),
        tagWeights: new Map(),
        seenGameIds: new Set(),
      };
    }
  }

  // =====================================================
  // SCORE
  // =====================================================

  private scoreGame(
    game: any,

    signals: UserSignals,
  ) {
    let score = 0;

    const genres =
      game.genres || [];

    const tags =
      game.tags || [];

    for (const genre of genres) {
      score +=
        (signals.genreWeights.get(
          genre.id,
        ) || 0) * 10;
    }

    for (const tag of tags) {
      score +=
        (signals.tagWeights.get(
          tag.id,
        ) || 0) * 2;
    }

    if (game.rating) {
      score +=
        game.rating * 5;
    }

    if (game.metacritic) {
      score +=
        game.metacritic / 5;
    }

    // Поле 'added' больше не используется, так как его нет в схеме БД
    // Вместо этого используем rating и metacritic для скоринга

    return score;
  }

  // =====================================================
  // SHUFFLE
  // =====================================================

  private shuffleArray<T>(
    array: T[],
  ): T[] {
    const copy =
      [...array];

    for (
      let i =
        copy.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
            (i + 1),
        );

      [
        copy[i],
        copy[j],
      ] = [
        copy[j],
        copy[i],
      ];
    }

    return copy;
  }

  // =====================================================
  // SHUFFLE WITH WEIGHTS - для смешивания персонализированных и новых игр
  // =====================================================

  private shuffleWithWeights<T extends { swipeScore?: number }>(
    array: T[],
    signals: UserSignals,
  ): T[] {
    const copy = [...array];
    
    // Разделяем на персонализированные (высокий score) и остальные
    const threshold = array.length > 0 
      ? array.reduce((acc, g) => acc + (g.swipeScore || 0), 0) / array.length 
      : 0;
    
    const personalized = copy.filter(g => (g.swipeScore || 0) >= threshold);
    const others = copy.filter(g => (g.swipeScore || 0) < threshold);
    
    // Перемешиваем каждую группу отдельно
    const shuffledPersonalized = this.shuffleArray(personalized);
    const shuffledOthers = this.shuffleArray(others);
    
    // Чередуем: 2 персонализированные, 1 другая для баланса
    const result: T[] = [];
    let pIdx = 0, oIdx = 0;
    
    while (pIdx < shuffledPersonalized.length || oIdx < shuffledOthers.length) {
      // Добавляем 2 персонализированные
      if (pIdx < shuffledPersonalized.length) {
        result.push(shuffledPersonalized[pIdx++]);
      }
      if (pIdx < shuffledPersonalized.length) {
        result.push(shuffledPersonalized[pIdx++]);
      }
      // Добавляем 1 другую
      if (oIdx < shuffledOthers.length) {
        result.push(shuffledOthers[oIdx++]);
      }
    }
    
    return result;
  }

  // =====================================================
  // DISCOVERY GAMES - новые игры из неизведанных жанров
  // =====================================================

  private async getDiscoveryGames(
    signals: UserSignals,
    limit = 30,
  ) {
    // Находим жанры, которые пользователь еще не исследовал
    const knownGenreIds = Array.from(signals.genreWeights.keys());

    try {
      // Получаем игры из БД кэша
      const { data, error } = await this.supabaseService
        .from('games')
        .select('*')
        .order('rating', { ascending: false })
        .limit(limit * 3);

      if (error || !data) {
        return [];
      }

      // Фильтруем игры, которые содержат жанры, не знакомые пользователю
      const discoveryGames = data.filter(game => {
        const gameGenreIds = (game.genres || []).map((g: any) => g.id);
        const hasUnknownGenre = gameGenreIds.some((id: number) => !knownGenreIds.includes(id));
        return hasUnknownGenre && this.isQualityGame(game);
      });

      return discoveryGames.slice(0, limit);
    } catch (error) {
      this.logger.error(`[getDiscoveryGames] Error: ${error.message}`);
      return [];
    }
  }

    // =====================================================
  // RAWG CACHE
  // =====================================================

  private async cachedRAWG(
    endpoint: string,

    params: any,
  ) {
    const key =
      `${endpoint}:${JSON.stringify(
        params,
      )}`;

    const cached =
      this.rawgCache.get(
        key,
      );

    if (
      cached &&
      Date.now() -
        cached.fetchedAt <
        this.RAWG_CACHE_TTL
    ) {
      return cached.data;
    }

    if (
      this.inflight.has(
        key,
      )
    ) {
      return this.inflight.get(
        key,
      );
    }

    const promise =
      this.rawgLimit(
        async () => {
          const data =
            await fetchFromRawgProxy(
              this.httpService,

              endpoint,

              params,
            );

          this.rawgCache.set(
            key,
            {
              data,

              fetchedAt:
                Date.now(),
            },
          );

          return data;
        },
      );

    this.inflight.set(
      key,
      promise,
    );

    try {
      return await promise;
    } finally {
      this.inflight.delete(
        key,
      );
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private isQualityGame(
    game: any,
  ) {
    return (
      !!game.background_image &&
      !!game.rating &&
      game.rating >= 3
    );
  }

  // =====================================================
  // PERSONALIZED RECOMMENDATIONS
  // =====================================================

  async getPersonalizedRecommendations(
    userId: number,

    limit = 20,

    offset = 0,
  ) {
    const signals =
      await this.fetchUserSignals(
        userId,
      );

    const games =
      await this.getPersonalizedGames(
        signals,

        limit + offset,
      );

    const unique =
      Array.from(
        new Map(
          games.map((g) => [
            g.id,
            g,
          ]),
        ).values(),
      );

    const scored =
      unique.map(
        (game) => ({
          ...game,

          recommendationScore:
            this.scoreGame(
              game,
              signals,
            ),
        }),
      );

    scored.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore,
    );

    return scored.slice(
      offset,
      offset + limit,
    );
  }

  // =====================================================
  // SIMILAR GAMES
  // =====================================================

  async getSimilarGames(
    gameId: number,

    limit = 10,
  ) {
    try {
      const target =
        await this.cachedRAWG(
          `games/${gameId}`,
          {},
        );

      if (!target) {
        return this.getPopularGames(
          limit,
        );
      }

      const genres =
        target.genres
          ?.slice(0, 2)
          .map(
            (g: any) =>
              g.id,
          )
          .join(',');

      const response =
        await this.cachedRAWG(
          'games',
          {
            genres,

            ordering:
              '-added',

            page_size: 40,
          },
        );

      const results =
        response?.results || [];

      const filtered =
        results.filter(
          (g: any) =>
            g.id !==
            gameId,
        );

      const scored =
        filtered.map(
          (game: any) => ({
            ...game,

            similarityScore:
              this.calculateSimilarity(
                target,
                game,
              ),
          }),
        );

      scored.sort(
        (a, b) =>
          b.similarityScore -
          a.similarityScore,
      );

      return scored.slice(
        0,
        limit,
      );
    } catch (error: any) {
      this.logger.error(
        `[SimilarGames] ${error.message}`,
      );

      return this.getPopularGames(
        limit,
      );
    }
  }

  // =====================================================
  // SIMILARITY
  // =====================================================

  private calculateSimilarity(
    target: any,

    candidate: any,
  ) {
    let score = 0;

    const targetGenres =
      new Set(
        target.genres?.map(
          (g: any) => g.id,
        ) || [],
      );

    const candidateGenres =
      new Set(
        candidate.genres?.map(
          (g: any) => g.id,
        ) || [],
      );

    const sharedGenres =
      [...targetGenres].filter(
        (g) =>
          candidateGenres.has(
            g,
          ),
      ).length;

    score +=
      sharedGenres * 40;

    if (
      candidate.rating
    ) {
      score +=
        candidate.rating *
        5;
    }

    if (
      candidate.metacritic
    ) {
      score +=
        candidate.metacritic /
        5;
    }

    return score;
  }
}