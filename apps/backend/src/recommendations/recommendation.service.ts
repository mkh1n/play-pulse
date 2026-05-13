// apps/backend/src/recommendations/recommendation.service.ts
// Упрощенный сервис - только рандомные игры для свайпов из RAWG

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GamesService } from '../games/games.service';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly gamesService: GamesService,
  ) {}

  /**
   * Получить случайные игры для свайпов из RAWG
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
        ...(actions?.map((a) => a.game_id) || []),
        ...excludeGameIds,
      ];

      this.logger.debug(`[RandomSwipes] Excluding ${interactedIds.length} games`);

      // Получаем игры из RAWG с высоким рейтингом
      const rawgResponse = await this.gamesService.getGames(
        1,
        limit * 5, // Берем с запасом
        undefined,
        '-rating', // Сортируем по рейтингу
        {},
      );

      let games = rawgResponse.results || [];

      // Фильтруем игры с которыми уже взаимодействовали
      if (interactedIds.length > 0) {
        games = games.filter((game: any) => !interactedIds.includes(game.id));
      }

      // Дополнительная фильтрация: рейтинг > 7 и есть background_image
      games = games.filter((game: any) => 
        game.rating > 7 && 
        game.background_image && 
        game.background_image.trim() !== ''
      );

      if (!games.length) {
        this.logger.warn('[RandomSwipes] No games found, trying another page');
        
        // Пробуем вторую страницу
        const rawgResponse2 = await this.gamesService.getGames(
          2,
          limit * 5,
          undefined,
          '-rating',
          {},
        );
        
        games = rawgResponse2.results || [];
        
        if (interactedIds.length > 0) {
          games = games.filter((game: any) => !interactedIds.includes(game.id));
        }
        
        games = games.filter((game: any) => 
          game.rating > 7 && 
          game.background_image && 
          game.background_image.trim() !== ''
        );
      }

      // Перемешиваем для разнообразия
      const shuffled = games.sort(() => Math.random() - 0.5);

      // Возвращаем limit игр
      const result = shuffled.slice(0, limit);
      
      this.logger.log(`[RandomSwipes] Returning ${result.length} games`);
      
      return result;
    } catch (error: any) {
      this.logger.error(`[RandomSwipes] Critical error: ${error.message}`);
      
      return [];
    }
  }
}
