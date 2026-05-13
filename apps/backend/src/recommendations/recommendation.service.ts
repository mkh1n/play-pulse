import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import pLimit from 'p-limit';

import { SupabaseService } from '../supabase/supabase.service';

import { fetchFromRawgProxy } from '../games/rawg-proxy';

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
  ) {}

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
  // SWIPE GAMES
  // =====================================================

  async getSwipeGames(
    userId: number,

    limit = 20,

    excludeGameIds: number[] = [],
  ) {
    try {
      const cached =
        this.swipePools.get(
          userId,
        );

      let pool: any[] = [];

      const expired =
        !cached ||
        Date.now() -
          cached.fetchedAt >
          this.SWIPE_POOL_TTL;

      // =====================================================
      // BUILD NEW POOL
      // =====================================================

      if (expired) {
        this.logger.log(
          `[SwipePool] rebuilding for user ${userId}`,
        );

        pool =
          await this.buildSwipePool(
            userId,
          );

        this.swipePools.set(
          userId,
          {
            data: pool,

            fetchedAt:
              Date.now(),
          },
        );
      } else {
        pool = cached.data;
      }

      // =====================================================
      // EXCLUDE CURRENT SESSION IDS
      // =====================================================

      const exclude =
        new Set<number>(
          excludeGameIds,
        );

      const filtered =
        pool.filter(
          (game) =>
            !exclude.has(
              game.id,
            ),
        );

      return {
        games:
          filtered.slice(
            0,
            limit,
          ),

        hasMore:
          filtered.length >
          limit,
      };
    } catch (error: any) {
      this.logger.error(
        `[SwipeGames] ${error.message}`,
      );

      return {
        games:
          await this.getPopularGames(
            limit,
          ),

        hasMore: true,
      };
    }
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

    const [
      personalized,
      popular,
    ] =
      await Promise.all([
        this.getPersonalizedGames(
          signals,
          150,
        ),

        this.getPopularGames(
          150,
        ),
      ]);

    const merged = [
      ...personalized,

      ...popular,
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
    // SHUFFLE TOP RESULTS
    // =====================================================

    const top =
      scored.slice(
        0,
        300,
      );

    return this.shuffleArray(
      top,
    );
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

    if (
      !topGenres.length
    ) {
      return [];
    }

    const requests =
      topGenres.map(
        (genreId) =>
          this.cachedRAWG(
            'games',
            {
              genres:
                genreId,

              ordering:
                '-added',

              page_size: 30,
            },
          ),
      );

    const results =
      await Promise.all(
        requests,
      );

    return results.flatMap(
      (r) =>
        r?.results || [],
    );
  }

  // =====================================================
  // POPULAR
  // =====================================================

  async getPopularGames(
    limit = 20,
  ) {
    const response =
      await this.cachedRAWG(
        'games',
        {
          ordering:
            '-added',

          page_size:
            limit,
        },
      );

    return (
      response?.results || []
    ).filter((g: any) =>
      this.isQualityGame(
        g,
      ),
    );
  }

  // =====================================================
  // USER SIGNALS
  // =====================================================

  private async fetchUserSignals(
    userId: number,
  ): Promise<UserSignals> {
    const {
      data,
    } =
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

        case 'wishlist':
          multiplier = 3;
          break;

        case 'rate':
          multiplier =
            Number(
              action.rating ||
                0,
            );
          break;

        case 'dislike':
          multiplier = -5;
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

    if (game.added) {
      score += Math.min(
        Math.log10(
          game.added,
        ) * 8,

        20,
      );
    }

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