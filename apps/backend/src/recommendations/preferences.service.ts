import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PreferencesService {
  constructor(private readonly supabaseService: SupabaseService) {}
  private readonly logger = new Logger(PreferencesService.name);

async processGameAction(
  userId: number, 
  gameData: any, 
  actionType: 'like' | 'dislike' | 'wishlist'
) {
  try {
    const rawgId = gameData.rawg_id || gameData.id;
    
    this.logger.log(`[processGameAction] userId=${userId}, action=${actionType}, rawgId=${rawgId}`);
    
    // Если ставим лайк - удаляем дизлайк и наоборот
    if (actionType === 'like') {
      await this.removeGameAction(userId, rawgId, 'dislike');
    } else if (actionType === 'dislike') {
      await this.removeGameAction(userId, rawgId, 'like');
    }
    
    // Проверяем существующее действие того же типа
    const { data: existing } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', rawgId)
      .eq('action_type', actionType)
      .maybeSingle();

    const actionData = {
      user_id: userId,
      game_id: rawgId,
      game_name: gameData.name,
      action_type: actionType,
      rating: null,
      genres: gameData.genres || [],
      tags: gameData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      this.logger.log(`[processGameAction] Updating existing action id=${existing.id}`);
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .update(actionData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, updated: true };
    } else {
      this.logger.log(`[processGameAction] Creating new action`);
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .insert([actionData])
        .select()
        .single();

      if (error) throw error;
      return { data, updated: false };
    }
  } catch (error) {
    this.logger.error(`[processGameAction] Error processing ${actionType}:`, error);
    throw error;
  }
}

async removeGameAction(
  userId: number,
  gameId: number, // rawg_id
  actionType: string
) {
  try {
    this.logger.log(`[removeGameAction] Removing ${actionType} for user=${userId}, game=${gameId}`);
    
    const { error } = await this.supabaseService
      .from('user_game_actions')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('action_type', actionType);

    if (error) {
      // Если записи нет - это не ошибка
      if (error.code === 'PGRST116') {
        this.logger.log(`[removeGameAction] No ${actionType} to remove`);
        return { success: true };
      }
      throw error;
    }
    
    this.logger.log(`[removeGameAction] Successfully removed ${actionType}`);
    return { success: true };
  } catch (error) {
    this.logger.error(`[removeGameAction] Error removing ${actionType}:`, error);
    throw error;
  }
}

async processGameRating(userId: number, gameData: any, rating: number) {
  try {
    // ВАЖНО: используем rawg_id
    const rawgId = gameData.rawg_id || gameData.id;
    
    this.logger.log(`[processGameRating] userId=${userId}, rating=${rating}`);
    this.logger.log(`[processGameRating] Game: name="${gameData.name}", rawg_id=${rawgId}`);
    
    const { data: existing } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', rawgId) // ВАЖНО: используем rawg_id
      .eq('action_type', 'rate')
      .maybeSingle();

    const actionData = {
      user_id: userId,
      game_id: rawgId, // ВАЖНО: сохраняем rawg_id
      game_name: gameData.name,
      action_type: 'rate',
      rating: rating,
      genres: gameData.genres || [],
      tags: gameData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      this.logger.log(`[processGameRating] Updating existing rating id=${existing.id}`);
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .update(actionData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, updated: true };
    } else {
      this.logger.log(`[processGameRating] Creating new rating`);
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .insert([actionData])
        .select()
        .single();

      if (error) throw error;
      return { data, updated: false };
    }
  } catch (error) {
    this.logger.error('[processGameRating] Error processing rating:', error);
    throw error;
  }
}



  async getUserGameRating(
    userId: number,
    gameId: number,
  ): Promise<number | null> {
    try {
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .select('rating')
        .eq('user_id', userId)
        .eq('game_id', gameId)
        .eq('action_type', 'rate')
        .single();

      if (error || !data) return null;
      return data.rating;
    } catch (error) {
      return null;
    }
  }

  async getUserAverageRating(userId: number): Promise<number> {
    try {
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .select('rating')
        .eq('user_id', userId)
        .eq('action_type', 'rate');

      if (error || !data || data.length === 0) return 0;

      const sum = data.reduce((acc, item) => acc + item.rating, 0);
      return sum / data.length;
    } catch (error) {
      return 0;
    }
  }

  async getUserPreferences(userId: number): Promise<any> {
    return {
      userId,
      preferences: {},
    };
  }

  // Добавляем новые методы для работы со статусами
async updateGameCompletionStatus(
  userId: number, 
  gameData: any,
  completionStatus: 'not_played' | 'playing' | 'completed' | 'dropped'
) {
  try {
    const statusData = {
      user_id: userId,
      game_id: gameData.id,
      game_name: gameData.name,
      action_type: 'status_change',
      completion_status: completionStatus,
      purchase_status: 'not_owned', // оставляем как есть
      rating: null,
      genres: gameData.genres || [],
      tags: gameData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Проверяем существующую запись статуса
    const { data: existing } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameData.id)
      .eq('action_type', 'status_change')
      .maybeSingle();

    if (existing) {
      // Обновляем существующую
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .update(statusData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, updated: true };
    } else {
      // Создаем новую
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .insert([statusData])
        .select()
        .single();

      if (error) throw error;
      return { data, updated: false };
    }
  } catch (error) {
    console.error('Error updating game completion status:', error);
    throw error;
  }
}

async updatePurchaseStatus(
  userId: number, 
  gameData: any,
  purchaseStatus: 'owned' | 'not_owned' | 'want_to_buy'
) {
  try {
    const statusData = {
      user_id: userId,
      game_id: gameData.id,
      game_name: gameData.name,
      action_type: 'purchase_change',
      completion_status: 'not_played', // оставляем как есть
      purchase_status: purchaseStatus,
      rating: null,
      genres: gameData.genres || [],
      tags: gameData.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Проверяем существующую запись покупки
    const { data: existing } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameData.id)
      .eq('action_type', 'purchase_change')
      .maybeSingle();

    if (existing) {
      // Обновляем существующую
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .update(statusData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { data, updated: true };
    } else {
      // Создаем новую
      const { data, error } = await this.supabaseService
        .from('user_game_actions')
        .insert([statusData])
        .select()
        .single();

      if (error) throw error;
      return { data, updated: false };
    }
  } catch (error) {
    console.error('Error updating purchase status:', error);
    throw error;
  }
}

// Обновляем getUserGameActions чтобы включать статусы
async getUserGameActions(userId: number, gameId: number) {
  try {
    this.logger.log(`[getUserGameActions] Getting all actions for user ${userId}, game ${gameId}`);
    
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (error) throw error;
    
    // Логируем что нашли
    this.logger.log(`[getUserGameActions] Found ${data?.length || 0} records`);
    if (data && data.length > 0) {
      data.forEach((action, index) => {
        this.logger.log(`[getUserGameActions] Record ${index + 1}:`, {
          action_type: action.action_type,
          rating: action.rating,
          completion_status: action.completion_status,
          purchase_status: action.purchase_status
        });
      });
    }
    
    // Преобразуем в объект с флагами
    const result = {
      // Основные действия
      liked: false,
      disliked: false,
      in_wishlist: false,
      rating: null as number | null,
      
      // Статусы
      completion_status: 'not_played' as 'not_played' | 'playing' | 'completed' | 'dropped',
      purchase_status: 'not_owned' as 'owned' | 'not_owned' | 'want_to_buy',
      
      // Для отладки
      _debug: {
        foundRecords: data?.length || 0,
        actionTypes: data?.map(a => a.action_type) || []
      }
    };

    // Обрабатываем каждую запись
    data?.forEach(action => {
      switch (action.action_type) {
        case 'like':
          result.liked = true;
          break;
        case 'dislike':
          result.disliked = true;
          break;
        case 'wishlist':
          result.in_wishlist = true;
          break;
        case 'rate':
          if (action.rating !== null && action.rating !== undefined) {
            result.rating = Number(action.rating);
          }
          break;
        case 'status_change':
          if (action.completion_status) {
            result.completion_status = action.completion_status;
          }
          break;
        case 'purchase_change':
          if (action.purchase_status) {
            result.purchase_status = action.purchase_status;
          }
          break;
      }
    });

    this.logger.log(`[getUserGameActions] Result:`, result);
    return result;
    
  } catch (error) {
    this.logger.error('[getUserGameActions] Error:', error);
    return {
      liked: false,
      disliked: false,
      in_wishlist: false,
      rating: null,
      completion_status: 'not_played',
      purchase_status: 'not_owned',
      _error: "error"
    };
  }
}
// preferences.service.ts
async getUserGames(userId: number) {
  try {
    // Получаем все действия пользователя
    const { data, error } = await this.supabaseService
      .from('user_game_actions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    // Группируем по game_id чтобы получить уникальные игры
    const uniqueGames = new Map();
    
    data?.forEach(action => {
      const gameId = action.game_id;
      if (!uniqueGames.has(gameId)) {
        uniqueGames.set(gameId, {
          id: gameId,
          name: action.game_name,
          actions: []
        });
      }
      
      uniqueGames.get(gameId).actions.push({
        type: action.action_type,
        rating: action.rating,
        completion_status: action.completion_status,
        purchase_status: action.purchase_status,
        created_at: action.created_at
      });
    });
    
    // Преобразуем Map в массив
    const games = Array.from(uniqueGames.values());
    
    // Добавляем данные игр из кэша если нужно
    const gameIds = games.map(g => g.id);
    if (gameIds.length > 0) {
      // Получаем данные игр с жанрами и тегами как JSON массивы
      const { data: gameDetails, error: detailsError } = await this.supabaseService
        .from('games')
        .select('rawg_id, background_image, rating, metacritic, genres, tags')
        .in('rawg_id', gameIds);
        
      if (!detailsError && gameDetails) {
        games.forEach(game => {
          const detail = gameDetails.find(g => g.rawg_id === game.id);
          if (detail) {
            game.background_image = detail.background_image;
            game.rating = detail.rating;
            game.metacritic = detail.metacritic;
            
            // Парсим JSON если нужно
            game.genres = typeof detail.genres === 'string' 
              ? JSON.parse(detail.genres) 
              : detail.genres;
              
            game.tags = typeof detail.tags === 'string'
              ? JSON.parse(detail.tags)
              : detail.tags;
          }
        });
      }
    }
    
    return games;
    
  } catch (error) {
    console.error('Error getting user games:', error);
    return [];
  }
}
}
