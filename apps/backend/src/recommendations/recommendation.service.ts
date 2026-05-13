// apps/backend/src/recommendations/recommendation.service.ts
// Упрощенный сервис - только рандомные игры для свайпов

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Получить случайные игры для свайпов
   * - Рейтинг > 7
   * - Есть background_image
   * - Исключая игры с которыми пользователь уже взаимодействовал
   */
  async getRandomGamesForSwipes(
  userId: number,
  limit = 10,
  excludeGameIds: number[] = [],
) {
  this.logger.log(`[RandomSwipes] loading ${limit} games for user ${userId}`);

  try {
    // Получаем ID игр с которыми пользователь взаимодействовал
    const { data: actions, error: actionsError } = await this.supabaseService
      .getClient()
      .from('user_game_actions')
      .select('game_id')
      .eq('user_id', userId);

    if (actionsError) {
      this.logger.warn(`[RandomSwipes] Can't load actions: ${actionsError.message}`);
    }

    const interactedIds = [
      ...(actions?.map((a: any) => a.game_id) || []),
      ...excludeGameIds,
    ];

    let games: any[] = [];

    if (interactedIds.length > 0) {
      // Separate query when we need to exclude IDs
      const { data, error } = await this.supabaseService
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
        .not('background_image', 'is', null)
        .gt('rating', 7)
        .not('id', 'in', `(${interactedIds.join(',')})`)
        .order('rating', { ascending: false })
        .limit(limit * 3);

      if (error) throw new Error(error.message);
      games = data || [];
    } else {
      // Simpler query without exclusions
      const { data, error } = await this.supabaseService
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
        .not('background_image', 'is', null)
        .gt('rating', 7)
        .order('rating', { ascending: false })
        .limit(limit * 3);

      if (error) throw new Error(error.message);
      games = data || [];
    }

    if (!games?.length) {
      // Fallback без исключений
      this.logger.warn('[RandomSwipes] No more games, trying without exclusions');
      
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
        .not('background_image', 'is', null)
        .gt('rating', 7)
        .order('rating', { ascending: false })
        .limit(limit);

      return fallbackGames || [];
    }

    // Перемешиваем для разнообразия
    const shuffled = games.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  } catch (error: any) {
    this.logger.error(`[RandomSwipes] Critical error: ${error.message}`);
    
    // Fallback на популярные игры
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
      .not('background_image', 'is', null)
      .gt('rating', 7)
      .order('rating', { ascending: false })
      .limit(limit);

    return fallbackGames || [];
  }
}
}
