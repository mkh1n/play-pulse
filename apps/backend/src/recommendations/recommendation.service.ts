// apps/backend/src/recommendations/recommendation.service.ts

import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import { SupabaseService } from '../supabase/supabase.service';

import { fetchFromRawgProxy } from '../games/rawg-proxy';

interface UserSignals {
  preferredGenres: number[];

  preferredTags: number[];

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

  // =========================================================
  // CONFIG
  // =========================================================

  private readonly RAWG_CACHE_TTL =
    1000 * 60 * 60;

  private readonly USER_CACHE_TTL =
    1000 * 60 * 15;

  private readonly POOL_CACHE_TTL =
    1000 * 60 * 60;

  private readonly MAX_POOL_PAGES =
    2;

  // =========================================================
  // CACHE
  // =========================================================

  private readonly rawgCache =
    new Map<
      string,
      CacheEntry<any>
    >();

  private readonly poolCache =
    new Map<
      string,
      CacheEntry<any[]>
    >();

  private readonly userCache =
    new Map<
      number,
      CacheEntry<any[]>
    >();

  constructor(
    private readonly httpService: HttpService,

    private readonly supabaseService: SupabaseService,
  ) { }

  // =========================================================
  // SIMILAR GAMES
  // =========================================================

  async getSimilarGames(
    gameId: number,
    limit = 10,
  ): Promise<any[]> {
    try {
      const targetGame =
        await this.fetchGame(
          gameId,
        );

      if (!targetGame) {
        return this.getPopularGames(
          limit,
        );
      }

      const pool =
        await this.getCandidatePool(
          targetGame,
        );

      const scored = pool
        .filter(
          (game) =>
            game.id !== gameId,
        )
        .map((game) => ({
          ...game,

          similarityScore:
            this.calculateSimilarity(
              targetGame,
              game,
            ),

          recommendationReason:
            this.getSimilarityReason(
              targetGame,
              game,
            ),
        }))
        .sort(
          (a, b) =>
            b.similarityScore -
            a.similarityScore,
        );

      const top =
        scored.slice(
          0,
          limit * 4,
        );

      let diversified =
        this.diversify(
          top,
          limit,
        );

      if (
        diversified.length < 4
      ) {
        diversified =
          scored.slice(
            0,
            Math.max(
              limit,
              4,
            ),
          );
      }

      return diversified;
    } catch (error: any) {
      this.logger.error(
        `[SimilarGames] ${error.message}`,
      );

      return this.getPopularGames(
        limit,
      );
    }
  }

  // =========================================================
  // PERSONALIZED
  // =========================================================

  async getPersonalizedRecommendations(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<any[]> {
    try {
      const cached =
        this.userCache.get(
          userId,
        );

      if (
        cached &&
        Date.now() -
        cached.fetchedAt <
        this.USER_CACHE_TTL
      ) {
        return cached.data.slice(
          offset,
          offset + limit,
        );
      }

      const signals =
        await this.fetchUserSignals(
          userId,
        );

      const pools =
        await Promise.all([
          ...signals.preferredGenres
            .slice(0, 5)
            .map((genreId) =>
              this.cachedRAWG(
                'games',
                {
                  genres:
                    genreId,

                  page_size: 50,

                  ordering:
                    '-added',
                },
              ),
            ),

          this.cachedRAWG(
            'games',
            {
              ordering:
                '-rating',

              page_size: 50,
            },
          ),
        ]);

      const merged =
        pools.flatMap(
          (p) =>
            p.results || [],
        );

      const unique =
        Array.from(
          new Map(
            merged.map(
              (g) => [
                g.id,
                g,
              ],
            ),
          ).values(),
        );

      const scored =
        unique
          .filter(
            (g) =>
              !signals.seenGameIds.has(
                g.id,
              ),
          )
          .map((game) => ({
            ...game,

            hybridScore:
              this.scoreGame(
                game,
                signals,
              ),

            recommendationReason:
              this.getRecommendationReason(
                game,
                signals,
              ),
          }))
          .sort(
            (a, b) =>
              b.hybridScore -
              a.hybridScore,
          );

      const diversified =
        this.diversify(
          scored,
          limit * 3,
        );

      this.userCache.set(
        userId,
        {
          data: diversified,

          fetchedAt:
            Date.now(),
        },
      );

      return diversified.slice(
        offset,
        offset + limit,
      );
    } catch (error: any) {
      this.logger.error(
        `[Recommendations] ${error.message}`,
      );

      return this.getPopularGames(
        limit,
      );
    }
  }

  // =========================================================
  // POPULAR
  // =========================================================

  async getPopularGames(
    limit = 20,
  ): Promise<any[]> {
    const response =
      await this.cachedRAWG(
        'games',
        {
          ordering:
            '-added',

          page_size:
            limit * 2,
        },
      );

    return (
      response?.results || []
    )
      .filter((g: any) =>
        this.isQualityGame(
          g,
        ),
      )
      .slice(0, limit);
  }

  // =========================================================
  // RAWG
  // =========================================================

  private async cachedRAWG(
    endpoint: string,
    params: any,
  ): Promise<any> {
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
  }

  private async fetchGame(
    gameId: number,
  ): Promise<any> {
    return this.cachedRAWG(
      `games/${gameId}`,
      {},
    );
  }

  // =========================================================
  // CANDIDATE POOL
  // =========================================================

  private async getCandidatePool(
    targetGame: any,
  ): Promise<any[]> {
    const genres =
      targetGame.genres
        ?.slice(0, 2)
        .map((g: any) => g.id)
        .join(',');

    const key =
      `pool:${genres}`;

    const cached =
      this.poolCache.get(key);

    if (
      cached &&
      Date.now() -
      cached.fetchedAt <
      this.POOL_CACHE_TTL
    ) {
      return cached.data;
    }

    const allGames: any[] =
      [];

    for (
      let page = 1;
      page <= 2;
      page++
    ) {
      const response =
        await this.cachedRAWG(
          'games',
          {
            genres,

            page,

            page_size: 40,

            ordering:
              '-added',
          },
        );

      allGames.push(
        ...(response?.results ||
          []),
      );
    }

    const unique =
      Array.from(
        new Map(
          allGames.map(
            (g) => [
              g.id,
              g,
            ],
          ),
        ).values(),
      );

    this.poolCache.set(
      key,
      {
        data: unique,

        fetchedAt:
          Date.now(),
      },
    );

    return unique;
  }


  // =========================================================
  // SWIPE
  // =========================================================

async getSwipeGames(
  userId: number,
  limit = 20,
  excludeGameIds: number[] = [],
): Promise<{
  games: any[];

  hasMore: boolean;
}> {
  try {
    const signals =
      await this.fetchUserSignals(
        userId,
      );

    // =========================================
    // ИГРЫ КОТОРЫЕ НЕЛЬЗЯ ПОКАЗЫВАТЬ
    // =========================================

    const hiddenIds =
      new Set<number>([
        ...excludeGameIds,
      ]);

    // wishlist / completed / owned
    const {
      data: actions,
    } =
      await this.supabaseService
        .from(
          'user_game_actions',
        )
        .select(
          `
          game_id,
          completion_status,
          purchase_status,
          action_type
        `,
        )
        .eq(
          'user_id',
          userId,
        );

    for (const action of actions || []) {
      if (
        action.action_type ===
          'wishlist' ||

        action.purchase_status ===
          'owned' ||

        action.completion_status ===
          'completed'
      ) {
        hiddenIds.add(
          action.game_id,
        );
      }
    }

    // =========================================
    // ПЕРСОНАЛИЗИРОВАННЫЕ ИГРЫ
    // =========================================

    const personalized =
      await this.getPersonalizedRecommendations(
        userId,
        120,
      );

    // =========================================
    // ПОПУЛЯРНЫЕ
    // =========================================

    const popular =
      await this.getPopularGames(
        80,
      );

    // =========================================
    // RANDOM EXPLORATION
    // =========================================

    const randomPool =
      await this.cachedRAWG(
        'games',
        {
          ordering:
            '-added',

          page:
            Math.floor(
              Math.random() *
                10,
            ) + 1,

          page_size: 40,
        },
      );

    const randomGames =
      randomPool?.results ||
      [];

    // =========================================
    // MIX
    // =========================================

    const mixed = [
      ...personalized.map(
        (g) => ({
          ...g,
          source:
            'personalized',
        }),
      ),

      ...popular.map(
        (g) => ({
          ...g,
          source:
            'popular',
        }),
      ),

      ...randomGames.map(
        (g: any) => ({
          ...g,
          source:
            'explore',
        }),
      ),
    ];

    // =========================================
    // UNIQUE
    // =========================================

    const unique =
      Array.from(
        new Map(
          mixed.map(
            (g) => [
              g.id,
              g,
            ],
          ),
        ).values(),
      );

    // =========================================
    // FILTER
    // =========================================

    const filtered =
      unique.filter(
        (g) =>
          !hiddenIds.has(
            g.id,
          ) &&
          this.isQualityGame(
            g,
          ),
      );

    // =========================================
    // SHUFFLE
    // =========================================

    const shuffled =
      filtered.sort(
        () =>
          Math.random() -
          0.5,
      );

    // =========================================
    // FINAL SCORE
    // =========================================

    const scored =
      shuffled.map(
        (game) => ({
          ...game,

          swipeScore:
            this.scoreGame(
              game,
              signals,
            ) +

            Math.random() *
              15,
        }),
      );

    scored.sort(
      (a, b) =>
        b.swipeScore -
        a.swipeScore,
    );

    return {
      games: scored.slice(
        0,
        limit,
      ),

      hasMore: true,
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


  // =========================================================
  // USER SIGNALS
  // =========================================================

  private async fetchUserSignals(
    userId: number,
  ): Promise<UserSignals> {
    const [
      genrePrefs,
      tagPrefs,
      userActions,
    ] = await Promise.all([
      this.supabaseService
        .from(
          'user_genre_preferences',
        )
        .select(
          'genre_id, weight',
        )
        .eq(
          'user_id',
          userId,
        )
        .order(
          'weight',
          {
            ascending:
              false,
          },
        ),

      this.supabaseService
        .from(
          'user_tag_preferences',
        )
        .select(
          'tag_id, weight',
        )
        .eq(
          'user_id',
          userId,
        )
        .order(
          'weight',
          {
            ascending:
              false,
          },
        ),

      this.supabaseService
        .from(
          'user_game_actions',
        )
        .select(
          'game_id',
        )
        .eq(
          'user_id',
          userId,
        ),
    ]);

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

    const preferredGenres =
      (
        genrePrefs.data ||
        []
      )
        .slice(0, 10)
        .map((g: any) => {
          genreWeights.set(
            g.genre_id,
            g.weight,
          );

          return g.genre_id;
        });

    const preferredTags =
      (
        tagPrefs.data ||
        []
      )
        .slice(0, 20)
        .map((t: any) => {
          tagWeights.set(
            t.tag_id,
            t.weight,
          );

          return t.tag_id;
        });

    return {
      preferredGenres,

      preferredTags,

      genreWeights,

      tagWeights,

      seenGameIds:
        new Set(
          (
            userActions.data ||
            []
          ).map(
            (a: any) =>
              a.game_id,
          ),
        ),
    };
  }

  // =========================================================
  // PERSONALIZED SCORING
  // =========================================================

  private scoreGame(
    game: any,
    signals: UserSignals,
  ): number {
    let score = 0;

    const genres =
      game.genres || [];

    const tags =
      game.tags || [];

    for (const genre of genres) {
      if (
        signals.genreWeights.has(
          genre.id,
        )
      ) {
        score +=
          (signals.genreWeights.get(
            genre.id,
          ) || 0) * 10;
      }
    }

    for (const tag of tags) {
      if (
        signals.tagWeights.has(
          tag.id,
        )
      ) {
        score +=
          (signals.tagWeights.get(
            tag.id,
          ) || 0) * 3;
      }
    }

    if (game.rating) {
      score +=
        game.rating * 4;
    }

    if (game.metacritic) {
      score +=
        game.metacritic /
        5;
    }

    if (game.added) {
      score += Math.min(
        Math.log10(
          game.added,
        ) * 8,
        25,
      );
    }

    return score;
  }

  // =========================================================
  // SIMILARITY
  // =========================================================

  private calculateSimilarity(
    target: any,
    candidate: any,
  ): number {
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

    const targetTags =
      new Set(
        target.tags?.map(
          (t: any) => t.id,
        ) || [],
      );

    const candidateTags =
      new Set(
        candidate.tags?.map(
          (t: any) => t.id,
        ) || [],
      );

    // =====================================================
    // GENRES
    // =====================================================

    const sharedGenres =
      [...targetGenres].filter(
        (g) =>
          candidateGenres.has(
            g,
          ),
      ).length;

    score +=
      sharedGenres * 35;

    // =====================================================
    // TAGS
    // =====================================================

    const sharedTags =
      [...targetTags].filter(
        (t) =>
          candidateTags.has(
            t,
          ),
      ).length;

    score += sharedTags * 8;

    // =====================================================
    // RATING
    // =====================================================

    if (
      target.rating &&
      candidate.rating
    ) {
      const diff =
        Math.abs(
          target.rating -
          candidate.rating,
        );

      score += Math.max(
        0,
        20 - diff * 5,
      );
    }

    // =====================================================
    // POPULARITY
    // =====================================================

    if (candidate.added) {
      score += Math.min(
        Math.log10(
          candidate.added,
        ) * 10,
        25,
      );
    }

    // =====================================================
    // METACRITIC
    // =====================================================

    if (
      candidate.metacritic
    ) {
      score +=
        candidate.metacritic /
        10;
    }

    // =====================================================
    // RELEASE YEAR
    // =====================================================

    if (
      target.released &&
      candidate.released
    ) {
      const year1 =
        new Date(
          target.released,
        ).getFullYear();

      const year2 =
        new Date(
          candidate.released,
        ).getFullYear();

      const diff =
        Math.abs(
          year1 - year2,
        );

      score += Math.max(
        0,
        10 - diff,
      );
    }

    return score;
  }

  // =========================================================
  // DIVERSIFY
  // =========================================================

  private diversify(
    games: any[],
    limit: number,
  ): any[] {
    const result: any[] =
      [];

    const usedGenres =
      new Set<number>();

    for (const game of games) {
      const genres =
        game.genres?.map(
          (g: any) => g.id,
        ) || [];

      const overlap =
        genres.filter((g) =>
          usedGenres.has(g),
        ).length;

      if (overlap <= 4) {
        result.push(game);

        genres.forEach((g) =>
          usedGenres.add(g),
        );
      }

      if (
        result.length >= limit
      ) {
        break;
      }
    }

    return result;
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private isQualityGame(
    game: any,
  ): boolean {
    return !!game.background_image;
  }

  private getRecommendationReason(
    game: any,
    signals: UserSignals,
  ): string {
    const matchingGenres =
      game.genres?.filter(
        (g: any) =>
          signals.genreWeights.has(
            g.id,
          ),
      ) || [];

    if (
      matchingGenres.length >
      0
    ) {
      return `Похожий жанр: ${matchingGenres[0].name}`;
    }

    const matchingTags =
      game.tags?.filter(
        (t: any) =>
          signals.tagWeights.has(
            t.id,
          ),
      ) || [];

    if (
      matchingTags.length > 0
    ) {
      return `Похожий тег: ${matchingTags[0].name}`;
    }

    return 'Рекомендуем вам';
  }

  private getSimilarityReason(
    target: any,
    game: any,
  ): string {
    const commonGenres =
      target.genres?.filter(
        (g1: any) =>
          game.genres?.some(
            (g2: any) =>
              g1.id ===
              g2.id,
          ),
      ) || [];

    if (
      commonGenres.length >
      0
    ) {
      return `Похожий жанр: ${commonGenres[0].name}`;
    }

    const commonTags =
      target.tags?.filter(
        (t1: any) =>
          game.tags?.some(
            (t2: any) =>
              t1.id ===
              t2.id,
          ),
      ) || [];

    if (
      commonTags.length > 0
    ) {
      return `Похожий тег: ${commonTags[0].name}`;
    }

    return 'Похожая игра';
  }
}

