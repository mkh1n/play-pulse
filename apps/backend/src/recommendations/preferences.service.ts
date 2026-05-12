import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PreferencesService {
  private readonly logger =
    new Logger(
      PreferencesService.name,
    );

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  private normalizeGame(
    gameData: any,
  ) {
    return {
      rawg_id:
        Number(
          gameData?.rawg_id ||
            gameData?.id,
        ) || 0,

      name:
        gameData?.name ||
        'Unknown Game',

      genres:
        gameData?.genres ||
        [],

      tags:
        gameData?.tags ||
        [],
    };
  }

  async processGameAction(
    userId: number,
    gameData: any,
    actionType:
      | 'like'
      | 'dislike'
      | 'wishlist',
  ) {
    try {
      const game =
        this.normalizeGame(
          gameData,
        );

      if (
        actionType ===
        'like'
      ) {
        await this.removeGameAction(
          userId,
          game.rawg_id,
          'dislike',
        );
      }

      if (
        actionType ===
        'dislike'
      ) {
        await this.removeGameAction(
          userId,
          game.rawg_id,
          'like',
        );
      }

      const payload = {
        user_id: userId,

        game_id:
          game.rawg_id,

        game_name:
          game.name,

        action_type:
          actionType,

        rating: null,

        completion_status:
          'not_played',

        purchase_status:
          'not_owned',

        genres:
          game.genres,

        tags:
          game.tags,

        updated_at:
          new Date().toISOString(),
      };

      const {
        data,
        error,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .upsert(
            [payload],
            {
              onConflict:
                'user_id,game_id,action_type',
            },
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        updated: true,
        data,
      };
    } catch (error) {
      this.logger.error(
        '[processGameAction]',
        error,
      );

      throw error;
    }
  }

  async removeGameAction(
    userId: number,
    gameId: number,
    actionType: string,
  ) {
    const { error } =
      await this.supabaseService
        .from(
          'user_game_actions',
        )
        .delete()
        .eq(
          'user_id',
          userId,
        )
        .eq(
          'game_id',
          gameId,
        )
        .eq(
          'action_type',
          actionType,
        );

    if (
      error &&
      error.code !==
        'PGRST116'
    ) {
      throw error;
    }

    return {
      success: true,
    };
  }

  async processGameRating(
    userId: number,
    gameData: any,
    rating: number,
  ) {
    try {
      const game =
        this.normalizeGame(
          gameData,
        );

      const {
        data: existing,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select('id')
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'game_id',
            game.rawg_id,
          )
          .eq(
            'action_type',
            'rate',
          )
          .maybeSingle();

      const payload = {
        user_id: userId,

        game_id:
          game.rawg_id,

        game_name:
          game.name,

        action_type:
          'rate',

        rating,

        completion_status:
          'not_played',

        purchase_status:
          'not_owned',

        genres:
          game.genres,

        tags:
          game.tags,

        updated_at:
          new Date().toISOString(),
      };

      const {
        data,
        error,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .upsert(
            [payload],
            {
              onConflict:
                'user_id,game_id,action_type',
            },
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        updated:
          !!existing,
        data,
      };
    } catch (error) {
      this.logger.error(
        '[processGameRating]',
        error,
      );

      throw error;
    }
  }

  async removeRating(
    userId: number,
    gameId: number,
  ) {
    return this.removeGameAction(
      userId,
      gameId,
      'rate',
    );
  }

  async getUserGameRating(
    userId: number,
    gameId: number,
  ) {
    try {
      const {
        data,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select('rating')
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'game_id',
            gameId,
          )
          .eq(
            'action_type',
            'rate',
          )
          .maybeSingle();

      return (
        data?.rating ||
        null
      );
    } catch {
      return null;
    }
  }

  async getUserAverageRating(
    userId: number,
  ) {
    try {
      const {
        data,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select('rating')
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'action_type',
            'rate',
          );

      if (
        !data ||
        data.length === 0
      ) {
        return 0;
      }

      const valid =
        data.filter(
          (
            item,
          ) =>
            item.rating !==
              null &&
            item.rating !==
              undefined,
        );

      if (
        valid.length ===
        0
      ) {
        return 0;
      }

      const sum =
        valid.reduce(
          (
            acc,
            item,
          ) =>
            acc +
            Number(
              item.rating,
            ),
          0,
        );

      return Number(
        (
          sum /
          valid.length
        ).toFixed(1),
      );
    } catch {
      return 0;
    }
  }

  async getUserPreferences(
    userId: number,
  ) {
    return {
      success: true,
      userId,
    };
  }

  async updateGameCompletionStatus(
    userId: number,
    gameData: any,
    completionStatus:
      | 'not_played'
      | 'playing'
      | 'completed'
      | 'dropped',
  ) {
    const game =
      this.normalizeGame(
        gameData,
      );

    const payload = {
      user_id: userId,

      game_id:
        game.rawg_id,

      game_name:
        game.name,

      action_type:
        'status_change',

      completion_status:
        completionStatus,

      purchase_status:
        'not_owned',

      rating: null,

      genres:
        game.genres,

      tags:
        game.tags,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from(
          'user_game_actions',
        )
        .upsert(
          [payload],
          {
            onConflict:
              'user_id,game_id,action_type',
          },
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  }

  async updatePurchaseStatus(
    userId: number,
    gameData: any,
    purchaseStatus:
      | 'owned'
      | 'not_owned'
      | 'want_to_buy',
  ) {
    const game =
      this.normalizeGame(
        gameData,
      );

    const payload = {
      user_id: userId,

      game_id:
        game.rawg_id,

      game_name:
        game.name,

      action_type:
        'purchase_change',

      completion_status:
        'not_played',

      purchase_status:
        purchaseStatus,

      rating: null,

      genres:
        game.genres,

      tags:
        game.tags,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from(
          'user_game_actions',
        )
        .upsert(
          [payload],
          {
            onConflict:
              'user_id,game_id,action_type',
          },
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  }

  async getUserGameActions(
    userId: number,
    gameId: number,
  ) {
    try {
      const {
        data,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select('*')
          .eq(
            'user_id',
            userId,
          )
          .eq(
            'game_id',
            gameId,
          );

      const result = {
        liked: false,
        disliked: false,
        in_wishlist: false,
        rating:
          null as number | null,

        completion_status:
          'not_played',

        purchase_status:
          'not_owned',
      };

      data?.forEach(
        (
          action,
        ) => {
          switch (
            action.action_type
          ) {
            case 'like':
              result.liked =
                true;
              break;

            case 'dislike':
              result.disliked =
                true;
              break;

            case 'wishlist':
              result.in_wishlist =
                true;
              break;

            case 'rate':
              result.rating =
                action.rating;
              break;

            case 'status_change':
              result.completion_status =
                action.completion_status;
              break;

            case 'purchase_change':
              result.purchase_status =
                action.purchase_status;
              break;
          }
        },
      );

      return result;
    } catch {
      return {
        liked: false,
        disliked: false,
        in_wishlist: false,
        rating: null,
        completion_status:
          'not_played',
        purchase_status:
          'not_owned',
      };
    }
  }

  async getUserActionsHistory(
    userId: number,
    options?: {
      type?: string;
      limit?: number;
      gameId?: number;
    },
  ) {
    try {
      let query =
        this.supabaseService
          .from(
            'user_game_actions',
          )
          .select('*')
          .eq(
            'user_id',
            userId,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          );

      if (
        options?.type
      ) {
        query = query.eq(
          'action_type',
          options.type,
        );
      }

      if (
        options?.gameId
      ) {
        query = query.eq(
          'game_id',
          options.gameId,
        );
      }

      query = query.limit(
        options?.limit ||
          50,
      );

      const {
        data,
        error,
      } =
        await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        actions:
          data || [],
      };
    } catch (
      error
    ) {
      return {
        success: false,
        actions: [],
      };
    }
  }

  async getUserGamesOptimized(
    userId: number,
  ) {
    try {
      const {
        data: actions,
        error,
      } =
        await this.supabaseService
          .from(
            'user_game_actions',
          )
          .select(
            `
            game_id,
            game_name,
            action_type,
            rating,
            completion_status,
            purchase_status,
            created_at,
            updated_at
          `,
          )
          .eq(
            'user_id',
            userId,
          );

      if (
        error ||
        !actions
      ) {
        return [];
      }

      const gameIds = [
        ...new Set(
          actions.map(
            (
              a,
            ) =>
              a.game_id,
          ),
        ),
      ];

      // Если нет игр, возвращаем пустой массив
      if (gameIds.length === 0) {
        return [];
      }

      const {
        data: gamesData,
      } =
        await this.supabaseService
          .from('games')
          .select(
            `
            rawg_id,
            name,
            background_image,
            rating,
            metacritic,
            genres,
            tags
          `,
          )
          .in(
            'rawg_id',
            gameIds,
          );

      const gameMap = new Map();

      // Сначала создаем базовую структуру для каждой игры
      actions.forEach((action) => {
        if (!gameMap.has(action.game_id)) {
          const detail = gamesData?.find(
            (g) => g.rawg_id === action.game_id,
          );

          gameMap.set(action.game_id, {
            id: action.game_id,
            name: detail?.name || action.game_name,
            background_image: detail?.background_image || null,
            rating: detail?.rating || 0,
            metacritic: detail?.metacritic || null,
            genres: typeof detail?.genres === 'string'
              ? JSON.parse(detail.genres)
              : detail?.genres || [],
            tags: typeof detail?.tags === 'string'
              ? JSON.parse(detail.tags)
              : detail?.tags || [],
            liked: false,
            disliked: false,
            in_wishlist: false,
            user_rating: null as number | null,
            completion_status: 'not_played' as string,
            purchase_status: 'not_owned' as string,
            actions_count: 0,
            updated_at: action.created_at,
          });
        }
      });

      // Затем применяем действия к каждой игре
      actions.forEach((action) => {
        const game = gameMap.get(action.game_id);

        switch (action.action_type) {
          case 'like':
            game.liked = true;
            break;
          case 'dislike':
            game.disliked = true;
            break;
          case 'wishlist':
            game.in_wishlist = true;
            break;
          case 'rate':
            game.user_rating = action.rating;
            break;
          case 'status_change':
            game.completion_status = action.completion_status || 'not_played';
            break;
          case 'purchase_change':
            game.purchase_status = action.purchase_status || 'not_owned';
            break;
        }

        game.actions_count += 1;

        // Обновляем updated_at на самое свежее значение
        const actionTime = new Date(action.updated_at || action.created_at).getTime();
        const currentTime = new Date(game.updated_at).getTime();
        if (actionTime > currentTime) {
          game.updated_at = action.updated_at || action.created_at;
        }
      });

      return Array.from(gameMap.values());
    } catch (error) {
      this.logger.error(
        '[getUserGamesOptimized]',
        error,
      );

      return [];
    }
  }
}