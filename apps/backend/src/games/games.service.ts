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
}