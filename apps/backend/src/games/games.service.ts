import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Game } from './entities/game.entity';
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
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }


  async getGames(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    ordering: string = '-rating',
    filters: GamesFilterParams = {} // 👈 новый параметр
  ) {
    const params: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page,
      page_size: pageSize,
      ordering,
    };

    if (search) params.search = search;

    if (filters.genres) {
      params.genres = Array.isArray(filters.genres)
        ? filters.genres.join(',')
        : filters.genres;
    }
    if (filters.platforms) {
      params.platforms = Array.isArray(filters.platforms)
        ? filters.platforms.join(',')
        : filters.platforms;
    }
    if (filters.tags) params.tags = filters.tags;
    if (filters.dates) params.dates = filters.dates;
    if (filters.developers) params.developers = filters.developers;
    if (filters.publishers) params.publishers = filters.publishers;

    try {
      console.log("RAWG params:", params);
      const response = await firstValueFrom(
        this.httpService.get('https://api.rawg.io/api/games', { params })
      );

      // 🔥 Кэшируем в фоне, НЕ ожидая завершения
      // и оборачиваем в try/catch чтобы ошибки не падали в ответ
      this.cacheGames(response.data.results)
        .catch(err => console.warn('⚠️ Background cache failed:', err.message));

      // Для is_cached пробуем получить из кэша, но тоже безопасно
      let cachedGames: Game[] = [];
      try {
        const gameIds = response.data.results.map((g: any) => g.id);
        cachedGames = await this.getCachedGames(gameIds);
      } catch (e) {
        console.warn('⚠️ Could not check cache:');
      }

      return {
        ...response.data,
        results: response.data.results.map((game: any) => ({
          ...game,
          is_cached: cachedGames.some((c: any) => c.rawg_id === game.id)
        }))
      };
    } catch (error) {
      console.error('Error fetching games from RAWG:', error);
      throw error;
    }
  }

  async getGameData(gameId: string | number) {
    const id = Number(gameId);

    const params = {
      key: this.configService.get('RAWG_API_KEY'),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.rawg.io/api/games/${id}`, { params })
      );
      const screenshots = await firstValueFrom(
        this.httpService.get(`https://api.rawg.io/api/games/${id}/screenshots`, { params })
      );
      console.log('screenshots', screenshots);


      const gameData = {...response.data, screenshots:screenshots.data};

      // Кэшируем в фоне (не ждем завершения)
      this.cacheGame(gameData).catch(console.error);

      return {
        ...gameData,
        rawg_id: gameData.id
      };

    } catch (error) {
      console.error(`Error fetching game ${id} from RAWG:`, error);
      throw new Error(`Не удалось загрузить данные игры`);
    }
  }

  private async getCachedGame(rawgId: number): Promise<Game | null> {
    const { data, error } = await this.supabaseService
      .from('games')
      .select('*')
      .eq('rawg_id', rawgId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  // Получить несколько игр из кэша
  private async getCachedGames(rawgIds: number[]): Promise<Game[]> {
    if (rawgIds.length === 0) return [];

    const { data, error } = await this.supabaseService
      .from('games')
      .select('*')
      .in('rawg_id', rawgIds);

    if (error) return [];
    return data;
  }


  // Также обновите метод cacheGame
  private async cacheGame(gameData: any): Promise<void> {
    const game = {
      rawg_id: gameData.id,
      name: gameData.name,
      slug: gameData.slug,
      released: gameData.released,
      description: gameData.description,
      description_raw: gameData.description_raw,
      background_image: gameData.background_image,
      website: gameData.website,
      rating: gameData.rating,
      rating_top: gameData.rating_top,
      metacritic: gameData.metacritic,
      playtime: gameData.playtime,
      genres: gameData.genres || [],
      tags: gameData.tags || [],
      platforms: gameData.platforms || [],
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      trailers: gameData.trailers || [],
      screenshots: gameData.screenshots || [],
      reddit_url: gameData.reddit_url,
      metacritic_url: gameData.metacritic_url,
      tba: gameData.tba || false,
      is_cached: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabaseService
      .from('games')
      .upsert([game], { onConflict: 'rawg_id' });

    if (error) {
      console.error('Error caching game:', error);
    }
  }

  // Сохранить несколько игр в кэш
  private async cacheGames(games: any[]): Promise<void> {
    const gamePromises = games.map(game => this.cacheGame(game));
    await Promise.allSettled(gamePromises);
  }

  // Поиск игр в кэше
  async searchCachedGames(query: string, limit: number = 20): Promise<Game[]> {
    const { data, error } = await this.supabaseService
      .from('games')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) return [];
    return data;
  }
}