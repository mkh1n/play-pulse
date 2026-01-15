import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Получить персонализированные рекомендации
  async getPersonalizedRecommendations(userId: number, limit: number = 20) {
    // Получаем предпочтения пользователя
    const [genrePrefs, tagPrefs, userRatings] = await Promise.all([
      this.supabaseService
        .from('user_genre_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('weight', { ascending: false })
        .limit(5),
      this.supabaseService
        .from('user_tag_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('weight', { ascending: false })
        .limit(5),
      this.supabaseService
        .from('user_game_actions')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', 'rate')
        .limit(50),
    ]);

    const genrePrefsData = genrePrefs.data || [];
    const tagPrefsData = tagPrefs.data || [];
    const userRatingsData = userRatings.data || [];

    // Если нет данных, возвращаем популярные игры
    if (genrePrefsData.length === 0 && tagPrefsData.length === 0 && userRatingsData.length === 0) {
      return this.getPopularGames(limit);
    }

    // Формируем запрос к RAWG API
    const params: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page_size: limit,
    };

    // Добавляем фильтрацию по любимым жанрам
    if (genrePrefsData.length > 0) {
      const topGenreIds = genrePrefsData
        .filter(g => g.weight > 1.5)
        .slice(0, 2)
        .map(g => g.genre_id);
      
      if (topGenreIds.length > 0) {
        params.genres = topGenreIds.join(',');
      }
    }

    // Получаем игры
    const response = await firstValueFrom(
      this.httpService.get('https://api.rawg.io/api/games', { params })
    );

    const games = response.data.results;
    
    // Взвешиваем с учетом оценок пользователя
    return this.weightGamesWithRatings(games, genrePrefsData, tagPrefsData, userRatingsData);
  }

  // Взвешивание игр с учетом оценок
  private weightGamesWithRatings(
    games: any[], 
    genrePrefs: any[], 
    tagPrefs: any[], 
    userRatings: any[]
  ) {
    return games.map(game => {
      let score = game.rating || 5.0;
      
      // 1. Вклад жанров (40%)
      if (game.genres) {
        let genreScore = 0;
        let genreCount = 0;
        
        game.genres.forEach(gameGenre => {
          const pref = genrePrefs.find(gp => gp.genre_id === gameGenre.id);
          if (pref) {
            genreScore += pref.weight;
            genreCount++;
          }
        });
        
        if (genreCount > 0) {
          const avgGenreScore = genreScore / genreCount;
          score += (avgGenreScore - 1.0) * 0.4;
        }
      }

      // 2. Вклад тегов (30%)
      if (game.tags) {
        let tagScore = 0;
        let tagCount = 0;
        
        game.tags.forEach(gameTag => {
          const pref = tagPrefs.find(tp => tp.tag_id === gameTag.id);
          if (pref) {
            tagScore += pref.weight;
            tagCount++;
          }
        });
        
        if (tagCount > 0) {
          const avgTagScore = tagScore / tagCount;
          score += (avgTagScore - 1.0) * 0.3;
        }
      }

      // 3. Учет оценок пользователя на похожие игры (30%)
      if (userRatings.length > 0) {
        const similarityScore = this.calculateGameSimilarityScore(game, userRatings);
        score += similarityScore * 0.3;
      }

      return { 
        ...game, 
        personalizedScore: score,
        recommendationReason: this.getRecommendationReason(game, genrePrefs, tagPrefs)
      };
    })
    .filter(game => game.personalizedScore >= 4.0)
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, 20);
  }

  // Расчет схожести с уже оцененными играми
  private calculateGameSimilarityScore(game: any, userRatings: any[]): number {
    let totalSimilarity = 0;
    let totalWeight = 0;

    userRatings.forEach(rating => {
      const similarity = this.calculateGamesSimilarity(game, rating);
      const ratingWeight = this.getNormalizedRating(rating.rating);
      
      totalSimilarity += similarity * ratingWeight;
      totalWeight += ratingWeight;
    });

    return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
  }

  // Получить нормализованную оценку (0.0 - 1.0)
  private getNormalizedRating(rating: number): number {
    if (!rating || rating < 1 || rating > 10) return 0.5;
    return (rating - 1) / 9;
  }

  // Расчет схожести двух игр
  private calculateGamesSimilarity(game1: any, ratingAction: any): number {
    let similarity = 0;
    
    // Схожесть по жанрам
    const game1Genres = new Set(game1.genres?.map(g => g.id) || []);
    const game2Genres = new Set(ratingAction.genres?.map(g => g.id) || []);
    
    const genreIntersection = [...game1Genres].filter(id => game2Genres.has(id)).length;
    const genreUnion = new Set([...game1Genres, ...game2Genres]).size;
    
    if (genreUnion > 0) {
      similarity += (genreIntersection / genreUnion) * 0.6;
    }

    // Схожесть по тегам
    const game1Tags = new Set(game1.tags?.map(t => t.id) || []);
    const game2Tags = new Set(ratingAction.tags?.map(t => t.id) || []);
    
    const tagIntersection = [...game1Tags].filter(id => game2Tags.has(id)).length;
    const tagUnion = new Set([...game1Tags, ...game2Tags]).size;
    
    if (tagUnion > 0) {
      similarity += (tagIntersection / tagUnion) * 0.4;
    }

    return similarity;
  }

  // Генерация объяснения рекомендации
  private getRecommendationReason(game: any, genrePrefs: any[], tagPrefs: any[]): string {
    const reasons: string[] = [];
    
    game.genres?.forEach(gameGenre => {
      const pref = genrePrefs.find(gp => gp.genre_id === gameGenre.id);
      if (pref && pref.weight > 1.8) {
        reasons.push(`вам нравится жанр "${pref.genre_name}"`);
      }
    });

    game.tags?.forEach(gameTag => {
      const pref = tagPrefs.find(tp => tp.tag_id === gameTag.id);
      if (pref && pref.weight > 1.8) {
        reasons.push(`вы любите "${pref.tag_name}"`);
      }
    });

    if (reasons.length === 0) {
      return 'Популярная игра в ваших любимых категориях';
    }

    return `Рекомендуем, потому что ${reasons.slice(0, 2).join(' и ')}`;
  }

  // Получить популярные игры
  async getPopularGames(limit: number) {
    const params = {
      key: this.configService.get('RAWG_API_KEY'),
      page_size: limit,
      ordering: '-rating',
    };

    const response = await firstValueFrom(
      this.httpService.get('https://api.rawg.io/api/games', { params })
    );

    return response.data.results.map(game => ({
      ...game,
      personalizedScore: game.rating || 5.0,
      recommendationReason: 'Популярная игра с высоким рейтингом'
    }));
  }

  
}