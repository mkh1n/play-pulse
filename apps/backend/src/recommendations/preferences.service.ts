import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);
  
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // apps/backend/src/recommendations/preferences.service.ts

async processGameAction(
  userId: number,
  gameId: number,
  actionType:
    | 'like'
    | 'dislike'
    | 'wishlist',
  gameName?: string,
  gameImage?: string,
){
  try {
    if (!gameId || Number.isNaN(gameId)) {
      throw new Error('Invalid game id');
    }

    // Remove conflicting actions
    if (actionType === 'like') {
      await this.removeGameAction(userId, gameId, 'dislike');
    }
    if (actionType === 'dislike') {
      await this.removeGameAction(userId, gameId, 'like');
    }

    const payload: any = {
  user_id: userId,

  game_id: gameId,

  game_name:
    gameName ||
    `Game #${gameId}`,

  game_image:
    gameImage || null,

  action_type: actionType,

  rating: null,

  genres: [],

  tags: [],

  completion_status:
    'not_played',

  purchase_status:
    'not_owned',
};

    // Используем upsert
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .upsert([payload], {
        onConflict: 'user_id,game_id,action_type',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error(`Error processing action: ${error.message}`);
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error: any) {
    this.logger.error(`Error in processGameAction: ${error.message}`);
    throw error;
  }
}

  async removeGameAction(
    userId: number,
    gameId: number,
    actionType: string,
  ) {
    const { error } = await this.supabaseService
      .from('user_game_actions')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('action_type', actionType);

    if (error) {
      throw error;
    }

    return { success: true };
  }

async processGameRating(
  userId: number,
  gameId: number,
  rating: number,
  gameName?: string,
  gameImage?: string,
){
  try {
    const payload: any = {
  user_id: userId,

  game_id: gameId,

  game_name:
    gameName ||
    `Game #${gameId}`,

  game_image:
    gameImage || null,

  action_type: 'rate',

  rating,

  genres: [],

  tags: [],

  completion_status:
    'not_played',

  purchase_status:
    'not_owned',
};

    // Используем upsert вместо select + insert/update
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .upsert([payload], {
        onConflict: 'user_id,game_id,action_type',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error(`Error processing rating: ${error.message}`);
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error: any) {
    this.logger.error(`Error in processGameRating: ${error.message}`);
    throw error;
  }
}

  async getUserGameRating(userId: number, gameId: number) {
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('rating')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('action_type', 'rate')
      .maybeSingle();

    if (error) {
      return null;
    }

    return data?.rating || null;
  }

  async getUserAverageRating(userId: number) {
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('rating')
      .eq('user_id', userId)
      .eq('action_type', 'rate');

    if (error || !data?.length) {
      return 0;
    }

    const ratings = data.filter((item) => item.rating !== null);

    if (!ratings.length) {
      return 0;
    }

    const avg = ratings.reduce((acc, item) => acc + item.rating, 0) / ratings.length;

    return Number(avg.toFixed(1));
  }

async updateGameCompletionStatus(
  userId: number,
  gameId: number,
  completionStatus:
    | 'not_played'
    | 'playing'
    | 'completed'
    | 'dropped',
  gameName?: string,
  gameImage?: string,
) {
  try {
   const payload: any = {
  user_id: userId,

  game_id: gameId,

  game_name:
    gameName ||
    `Game #${gameId}`,

  game_image:
    gameImage || null,

  action_type:
    'status_change',

  completion_status:
    completionStatus,

  purchase_status:
    'not_owned',

  rating: null,

  genres: [],

  tags: [],
};

    // Используем upsert вместо select + insert/update
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .upsert([payload], {
        onConflict: 'user_id,game_id,action_type', // Уникальный ключ
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error(`Error updating status: ${error.message}`);
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error: any) {
    this.logger.error(`Error in updateGameCompletionStatus: ${error.message}`);
    throw error;
  }
}

  async updatePurchaseStatus(
  userId: number,
  gameId: number,
  purchaseStatus:
    | 'owned'
    | 'not_owned'
    | 'want_to_buy',
  gameName?: string,
  gameImage?: string,
){
  try {
    const payload = {
  user_id: userId,

  game_id: gameId,

  game_name:
    gameName ||
    `Game #${gameId}`,

  game_image:
    gameImage || null,

  action_type:
    'purchase_change',

  completion_status:
    'not_played',

  purchase_status:
    purchaseStatus,

  rating: null,

  genres: [],

  tags: [],
};

    // Используем upsert вместо select + insert/update
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .upsert([payload], {
        onConflict: 'user_id,game_id,action_type',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      this.logger.error(`Error updating purchase status: ${error.message}`);
      throw error;
    }

    return {
      success: true,
      updated: true,
      data,
    };
  } catch (error: any) {
    this.logger.error(`Error in updatePurchaseStatus: ${error.message}`);
    throw error;
  }
}

  // apps/backend/src/recommendations/preferences.service.ts

// В preferences.service.ts
async getAllUserGameActions(userId: number) {
  const startTime = Date.now();
  
  try {
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('game_id, action_type, rating, completion_status, purchase_status')
      .eq('user_id', userId)
      .limit(500);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      this.logger.warn(`Slow query: getAllUserGameActions took ${duration}ms for user ${userId}`);
    }

    if (error) {
      this.logger.error(`Error in getAllUserGameActions: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error: any) {
    const duration = Date.now() - startTime;
    this.logger.error(`Error in getAllUserGameActions after ${duration}ms: ${error.message}`);
    return [];
  }
}

  async getUserPreferences(userId: number) {
    return { success: true, userId };
  }

  async getUserGamesOptimized(userId: number) {
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return [];
    }

    return data || [];
  }

  async getUserActionsHistory(
    userId: number,
    options?: { type?: string; limit?: number; gameId?: number },
  ) {
    let query = this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('action_type', options.type);
    }

    if (options?.gameId) {
      query = query.eq('game_id', options.gameId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return data || [];
  }
}
