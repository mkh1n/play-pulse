import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getGameId(
    gameData: any,
  ): number {
    return Number(
      gameData?.id ||
        gameData?.rawg_id,
    );
  }

  private getGameName(
    gameData: any,
  ): string {
    return (
      gameData?.name ||
      'Unknown Game'
    );
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async processGameAction(
  userId: number,

  gameId: number,

  actionType:
    | 'like'
    | 'dislike'
    | 'wishlist',
) {
  try {
    if (
      !gameId ||
      Number.isNaN(gameId)
    ) {
      throw new Error(
        'Invalid game id',
      );
    }

    if (
      actionType ===
      'like'
    ) {
      await this.removeGameAction(
        userId,
        gameId,
        'dislike',
      );
    }

    if (
      actionType ===
      'dislike'
    ) {
      await this.removeGameAction(
        userId,
        gameId,
        'like',
      );
    }

    const payload = {
      user_id: userId,

      game_id: gameId,

      game_name: `Game ${gameId}`,

      action_type:
        actionType,

      rating: null,

      genres: [],

      tags: [],

      completion_status:
        'not_played',

      purchase_status:
        'not_owned',

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


    if (error) {
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error) {


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

    if (error) {
      throw error;
    }

    return {
      success: true,
    };
  }

  // ============================================================================
  // RATING
  // ============================================================================

  async processGameRating(
  userId: number,
  gameId: number,
  rating: number,
) {
  try {
    const payload = {
      user_id: userId,

      game_id: gameId,

      game_name: `Game ${gameId}`,

      action_type: 'rate',

      rating,

      genres: [],

      tags: [],

      completion_status:
        'not_played',

      purchase_status:
        'not_owned',

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


    if (error) {
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error) {


    throw error;
  }
}

  async getUserGameRating(
    userId: number,
    gameId: number,
  ) {
    const {
      data,
      error,
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

    if (error) {
      return null;
    }

    return (
      data?.rating ||
      null
    );
  }

  async getUserAverageRating(
    userId: number,
  ) {
    const {
      data,
      error,
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
      error ||
      !data?.length
    ) {
      return 0;
    }

    const ratings =
      data.filter(
        (
          item,
        ) =>
          item.rating !==
          null,
      );

    if (
      !ratings.length
    ) {
      return 0;
    }

    const avg =
      ratings.reduce(
        (
          acc,
          item,
        ) =>
          acc +
          item.rating,
        0,
      ) /
      ratings.length;

    return Number(
      avg.toFixed(1),
    );
  }

  // ============================================================================
  // STATUS
  // ============================================================================

 async updateGameCompletionStatus(
  userId: number,
  gameId: number,
  completionStatus:
    | 'not_played'
    | 'playing'
    | 'completed'
    | 'dropped',
) {
  const payload = {
    user_id: userId,

    game_id: gameId,

    game_name: `Game ${gameId}`,

    action_type:
      'status_change',

    completion_status:
      completionStatus,

    purchase_status:
      'not_owned',

    rating: null,

    genres: [],

    tags: [],

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


  if (error) {
    throw error;
  }

  return {
    success: true,
    updated: true,
    data,
  };
}

  // ============================================================================
  // PURCHASE
  // ============================================================================

 async updatePurchaseStatus(
  userId: number,
  gameId: number,
  purchaseStatus:
    | 'owned'
    | 'not_owned'
    | 'want_to_buy',
) {
  const payload = {
    user_id: userId,

    game_id: gameId,

    game_name: `Game ${gameId}`,

    action_type:
      'purchase_change',

    completion_status:
      'not_played',

    purchase_status:
      purchaseStatus,

    rating: null,

    genres: [],

    tags: [],

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


  if (error) {
    throw error;
  }

  return {
    success: true,
    updated: true,
    data,
  };
}

  // ============================================================================
  // USER DATA
  // ============================================================================

  async getAllUserGameActions(
  userId: number,
) {
  const { data, error } =
    await this.supabaseService
      .from(
        'user_game_actions',
      )
      .select('*')
      .eq(
        'user_id',
        userId,
      );

  if (error) {
    throw error;
  }

  return data || [];
}

  async getUserPreferences(
    userId: number,
  ) {
    return {
      success: true,
      userId,
    };
  }

  async getUserGamesOptimized(
    userId: number,
  ) {
    const {
      data,
      error,
    } =
      await this.supabaseService
        .from(
          'user_game_actions',
        )
        .select('*')
        .eq(
          'user_id',
          userId,
        );

    if (error) {
      return [];
    }

    return data || [];
  }

  async getUserActionsHistory(
  userId: number,

  options?: {
    type?: string;
    limit?: number;
    gameId?: number;
  },
) {
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

  if (
    options?.limit
  ) {
    query = query.limit(
      options.limit,
    );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    return [];
  }

  return data || [];
}
}