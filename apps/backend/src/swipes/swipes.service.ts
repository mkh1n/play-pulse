// apps/backend/src/swipes/swipes.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '../supabase/supabase.service';
import { fetchFromRawgProxy } from '../games/rawg-proxy';

@Injectable()
export class SwipesService {
  private readonly logger = new Logger(SwipesService.name);

  private readonly MIN_RATING = 4.0;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
  ) { }

  async getRandomGamesForSwipes(
    userId: number,
    limit = 10,
    excludeGameIds: number[] = [],
  ) {
    this.logger.log(`[RandomSwipes] Loading ${limit} games for user ${userId}`);

    try {
      // 1. Получаем ID игр, с которыми пользователь взаимодействовал
      const { data: actions } = await this.supabaseService
        .getClient()
        .from('user_game_actions')
        .select('game_id')
        .eq('user_id', userId);

      const interactedIds = [
        ...(actions?.map((a: any) => a.game_id) || []),
        ...excludeGameIds,
      ].filter(id => id != null);

      const uniqueInteractedIds = [...new Set(interactedIds)];

      this.logger.log(`[RandomSwipes] Excluding ${uniqueInteractedIds.length} games`);

      // 2. Делаем ПАРАЛЛЕЛЬНЫЕ запросы к 3 случайным страницам из топа-10
      const randomPages = this.getRandomElements([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);

      this.logger.log(`[RandomSwipes] Fetching pages: ${randomPages.join(', ')}`);

      const pagePromises = randomPages.map(page =>
        fetchFromRawgProxy(this.httpService, 'games', {
          page,
          page_size: 20,
          ordering: '-rating',
        }).catch(err => {
          this.logger.warn(`[RandomSwipes] Page ${page} failed: ${err.message}`);
          return { results: [] };
        })
      );

      // Ждем все запросы параллельно (макс 3-5 секунд)
      const responses = await Promise.all(pagePromises);

      // 3. Собираем и фильтруем игры
      let allGames: any[] = [];

      for (const response of responses) {
        const games = response?.results || [];
        const filtered = games.filter((game: any) => {
          return (
            game.rating >= this.MIN_RATING &&
            game.background_image &&
            !uniqueInteractedIds.includes(game.id)
          );
        });
        allGames.push(...filtered);
      }

      this.logger.log(`[RandomSwipes] Found ${allGames.length} valid games`);

      // 4. Если не хватило — еще 2 страницы параллельно
      if (allGames.length < limit) {
        this.logger.warn('[RandomSwipes] Not enough, fetching 2 more pages');

        const extraPages = this.getRandomElements([11, 12, 13, 14, 15], 2);
        const extraPromises = extraPages.map(page =>
          fetchFromRawgProxy(this.httpService, 'games', {
            page,
            page_size: 20,
            ordering: '-rating',
          }).catch(() => ({ results: [] }))
        );

        const extraResponses = await Promise.all(extraPromises);

        for (const response of extraResponses) {
          const games = response?.results || [];
          const filtered = games.filter((game: any) => {
            return (
              game.rating >= this.MIN_RATING &&
              game.background_image &&
              !uniqueInteractedIds.includes(game.id)
            );
          });
          allGames.push(...filtered);
        }
      }

      // 5. Если ВООБЩЕ нет — fallback с мягкими условиями (1 страница)
      if (allGames.length === 0) {
        this.logger.warn('[RandomSwipes] Fallback: any popular game with image');

        const response = await fetchFromRawgProxy(this.httpService, 'games', {
          page: 1,
          page_size: 20,
          ordering: '-added',
        });

        const games = response?.results || [];
        allGames = games.filter((game: any) =>
          game.background_image && !uniqueInteractedIds.includes(game.id)
        );
      }

      // 6. Перемешиваем и возвращаем
      const shuffled = this.shuffleArray(allGames);
      const result = shuffled.slice(0, limit);

      this.logger.log(`[RandomSwipes] ✅ Returning ${result.length} games`);

      return result.map((game: any) => ({
        id: game.id,
        name: game.name,
        background_image: game.background_image,
        rating: game.rating,

        genres:
          game.genres || [],

        tags:
          game.tags || [],

        released:
          game.released,

        metacritic:
          game.metacritic,

        added:
          game.added,

        parent_platforms:
          game.parent_platforms || [],
      }));

    } catch (error: any) {
      this.logger.error(`[RandomSwipes] ❌ Critical error: ${error.message}`);
      return [];
    }
  }

  /**
   * Получить N случайных элементов из массива
   */
  private getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffleArray(array);
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

}