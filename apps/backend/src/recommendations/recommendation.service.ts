// apps/backend/src/recommendations/recommendation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// 🔧 Интерфейсы
interface UserSignals {
  preferredGenreIds: Set<number>;
  preferredGenreWeights: Map<number, number>;
  preferredTagIds: Set<number>;
  preferredTagWeights: Map<number, number>;
  highlyRatedGames: Array<{ id: number; genres: number[]; tags: number[]; rating: number }>;
  seenGameIds: Set<number>;
}

interface ScoredGame {
  id: number;
  name: string;
  rating: number;
  genres: any[];
  tags: any[];
  platforms: any[];
  background_image: string;
  hybridScore: number;
  recommendationReason: string;
  _rawgData: any;
}

interface GameSignature {
  genres: Set<number>;
  tags: Set<number>;
  platforms: Set<number>;
  developers: Set<number>;
  publishers: Set<number>;
  rating?: number;
  released?: string;
  added?: number;
  metadataScore: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly RAWG_BASE_URL = 'https://api.rawg.io/api/games';
  
  // 🎯 Кэш для персонализированных
  private readonly userCache = new Map<number, {
    games: ScoredGame[];
    fetchedAt: number;
    rawgPage: number;
    signals: UserSignals;
  }>();
  
  // 🎯 Кэш для свайпов
  private readonly swipeCache = new Map<number, {
    games: any[];
    fetchedAt: number;
    rawgPage: number;
    rawgOrderings: string[];
    excludeIds: Set<number>;
  }>();
  
  private readonly PERSONALIZED_TTL = 30 * 60 * 1000;
  private readonly SWIPE_TTL = 15 * 60 * 1000;
  private readonly RAWG_BATCH_SIZE = 100;
  
  // ⚙️ Пороги для "бедных" метаданных игр
  private readonly LOW_METADATA_TAGS_THRESHOLD = 4;
  private readonly LOW_METADATA_GENRES_THRESHOLD = 2;
  
  // 🔥 Разные сортировки для разнообразия
  private readonly RAWG_ORDERINGS = ['-rating', '-added', '-released', 'name'];

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================================
  // 🎯 СВАЙПЫ — БЕСКОНЕЧНАЯ ЛЕНТА
  // ============================================================================
  async getSwipeGames(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    excludeGameIds?: number[]
  ): Promise<{ games: any[]; hasMore: boolean }> {
    try {
      this.logger.log(`[SwipeGames] User ${userId}, limit ${limit}, offset ${offset}`);

      // 1. Получаем ВСЕ увиденные игры
      const seenGameIds = await this.getAllSeenGameIds(userId);
      const excludeIds = new Set<number>([...seenGameIds, ...(excludeGameIds || [])]);

      this.logger.log(`[SwipeGames] Excluding ${excludeIds.size} seen games`);

      // 2. Проверяем/инициализируем кэш
      const cacheKey = userId;
      const cached = this.swipeCache.get(cacheKey);
      const now = Date.now();

      if (!cached || (now - cached.fetchedAt) > this.SWIPE_TTL) {
        this.logger.log(`[SwipeGames] Cache miss, initializing...`);
        this.swipeCache.set(cacheKey, {
          games: [],
          fetchedAt: now,
          rawgPage: 1,
          rawgOrderings: this.shuffleArray([...this.RAWG_ORDERINGS]),
          excludeIds: new Set<number>(excludeIds),
        });
      }

      const swipeCache = this.swipeCache.get(cacheKey)!;
      excludeIds.forEach(id => swipeCache.excludeIds.add(id));

      // 3. Считаем доступные игры в кэше
      const availableInCache = swipeCache.games.filter(g => !swipeCache.excludeIds.has(g.id)).length;

      // 4. Если мало игр — догружаем из RAWG
      if (availableInCache < limit + offset) {
        this.logger.log(`[SwipeGames] Need more: ${availableInCache} < ${limit + offset}`);
        await this.extendSwipeCache(userId, swipeCache, limit * 2);
      }

      // 5. Фильтруем, сортируем, возвращаем
      const availableGames = swipeCache.games
        .filter(g => !swipeCache.excludeIds.has(g.id))
        .map(game => ({
          ...game,
          swipeScore: this.calculateSwipeScore(game),
        }))
        .sort((a, b) => b.swipeScore - a.swipeScore);

      const result = availableGames.slice(offset, offset + limit);
      const hasMore = availableGames.length > offset + limit || swipeCache.rawgPage <= 20;

      this.logger.log(`[SwipeGames] Returning ${result.length} games, hasMore: ${hasMore}`);

      return { games: result, hasMore };

    } catch (error: any) {
      this.logger.error(`[SwipeGames] Error: ${error.message}`);
      const popular = await this.getPopularGames(limit);
      const seenIds = await this.getAllSeenGameIds(userId);
      const filtered = popular.filter(g => !seenIds.includes(g.id));

      return { games: filtered, hasMore: filtered.length === limit };
    }
  }

  // 🔹 Докачка игр в кэш
  private async extendSwipeCache(
    userId: number,
    swipeCache: any,
    targetCount: number
  ): Promise<void> {
    const currentCount = swipeCache.games.filter((g: any) => !swipeCache.excludeIds.has(g.id)).length;
    if (currentCount >= targetCount) return;

    this.logger.log(`[SwipeCache] Extending: ${currentCount} -> ${targetCount}`);

    const orderingIndex = (swipeCache.rawgPage - 1) % this.RAWG_ORDERINGS.length;
    const ordering = swipeCache.rawgOrderings[orderingIndex] || this.RAWG_ORDERINGS[0];

    const [genrePrefs, tagPrefs] = await Promise.all([
      this.supabaseService
        .from('user_genre_preferences')
        .select('genre_id, weight')
        .eq('user_id', userId)
        .order('weight', { ascending: false })
        .limit(5),
      this.supabaseService
        .from('user_tag_preferences')
        .select('tag_id, weight')
        .eq('user_id', userId)
        .order('weight', { ascending: false })
        .limit(5),
    ]);

    const preferredGenres = (genrePrefs.data || [])
      .filter(g => g.weight > 1.5)
      .map(g => g.genre_id)
      .slice(0, 3);

    const rawgGames = await this.fetchSwipeGamesFromRAWG({
      preferredGenres,
      ordering,
      page: swipeCache.rawgPage,
      pageSize: this.RAWG_BATCH_SIZE,
    });

    const existingIds = new Set(swipeCache.games.map((g: any) => g.id));
    const newGames = rawgGames.filter(g =>
      !swipeCache.excludeIds.has(g.id) &&
      !existingIds.has(g.id)
    );

    if (newGames.length > 0) {
      swipeCache.games.push(...newGames);
      this.logger.log(`[SwipeCache] Added ${newGames.length} new games`);
    }

    swipeCache.rawgPage += 1;

    if (swipeCache.rawgPage > 20) {
      swipeCache.rawgPage = 1;
      swipeCache.rawgOrderings = this.shuffleArray([...this.RAWG_ORDERINGS]);
      this.logger.log(`[SwipeCache] Reset page, new orderings`);
    }

    swipeCache.fetchedAt = Date.now();
  }

  // 🔹 Запрос из RAWG с рандомизацией
  private async fetchSwipeGamesFromRAWG(params: {
    preferredGenres: number[];
    ordering: string;
    page: number;
    pageSize: number;
  }): Promise<any[]> {
    const { preferredGenres, ordering, page, pageSize } = params;

    const queryParams: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page,
      page_size: pageSize,
      ordering,
    };

    if (preferredGenres.length > 0) {
      queryParams.genres = preferredGenres.join(',');
    }

    if (ordering === '-rating' && page > 5) {
      const currentYear = new Date().getFullYear();
      queryParams.dates = `2010-01-01,${currentYear}-12-31`;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params: queryParams })
      );
      return response.data.results || [];
    } catch (error: any) {
      this.logger.error(`[RAWG Swipe] Error: ${error.message}`);
      return [];
    }
  }

  // 🔹 Скор для свайпов
  private calculateSwipeScore(game: any): number {
    let score = 0;

    score += (game.rating || 5) * 0.25;
    if (game.added) {
      score += Math.min(Math.log10(game.added + 1) * 0.3, 1.5);
    }

    if (game.released) {
      const releaseYear = new Date(game.released).getFullYear();
      const currentYear = new Date().getFullYear();
      const ageBonus = Math.max(0, (currentYear - releaseYear) / 10);
      score += (1 - ageBonus) * 0.1;
    }

    if (game.genres?.length > 0) {
      score += Math.min(game.genres.length * 0.05, 0.25);
    }

    score += Math.random() * 0.2;

    return score;
  }

  // 🔹 Получить ВСЕ увиденные игры
  private async getAllSeenGameIds(userId: number): Promise<number[]> {
    const { data } = await this.supabaseService
      .from('user_game_actions')
      .select('game_id')
      .eq('user_id', userId)
      .in('action_type', ['like', 'dislike', 'rate', 'mark_completed', 'wishlist']);

    return data?.map((d: any) => d.game_id) || [];
  }

  // ============================================================================
  // 🎯 ПЕРСОНАЛИЗИРОВАННЫЕ РЕКОМЕНДАЦИИ
  // ============================================================================
  async getPersonalizedRecommendations(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const cacheKey = userId;
      const cached = this.userCache.get(cacheKey);
      const now = Date.now();

      if (!cached || (now - cached.fetchedAt) > this.PERSONALIZED_TTL) {
        this.logger.log(`[Recommendations] Cache miss for user ${userId}, refreshing...`);
        await this.refreshUserCache(userId);
      }

      const userCache = this.userCache.get(cacheKey);
      if (!userCache) return await this.getPopularGames(limit);

      const sliced = userCache.games.slice(offset, offset + limit);

      if (sliced.length < limit && userCache.rawgPage < 5) {
        await this.extendUserCache(userId, userCache.rawgPage + 1);
        const extended = this.userCache.get(cacheKey);
        if (extended) return extended.games.slice(offset, offset + limit);
      }

      return sliced;

    } catch (error: any) {
      this.logger.error(`[getPersonalizedRecommendations] Error: ${error.message}`);
      return await this.getPopularGames(limit);
    }
  }

  private async refreshUserCache(userId: number): Promise<void> {
    const signals = await this.fetchUserSignals(userId);
    const rawgGames = await this.fetchFromRAWG(signals, 1, this.RAWG_BATCH_SIZE);

    const filtered = rawgGames
      .filter(g => !signals.seenGameIds.has(g.id))
      .map(game => {
        const qualityCheck = this.checkQualityWithReasons(game);
        if (!qualityCheck.passed) {
          this.logger.debug(`[QualityFilter] Rejected ${game.name}: ${qualityCheck.reason}`);
          return null;
        }
        return this.scoreGame(game, signals);
      })
      .filter((g): g is ScoredGame => g !== null && g.hybridScore >= 3.5);

    const sorted = filtered.sort((a, b) => b.hybridScore - a.hybridScore);

    this.userCache.set(userId, {
      games: sorted,
      fetchedAt: Date.now(),
      rawgPage: 1,
      signals,
    });

    this.logger.log(`[Cache] Stored ${sorted.length} scored games for user ${userId}`);
  }

  private async extendUserCache(userId: number, nextPage: number): Promise<void> {
    const cached = this.userCache.get(userId);
    if (!cached) return;

    const signals = cached.signals;
    const newGames = await this.fetchFromRAWG(signals, nextPage, this.RAWG_BATCH_SIZE);

    const existingIds = new Set(cached.games.map(g => g.id));
    const filtered = newGames
      .filter(g => !signals.seenGameIds.has(g.id) && !existingIds.has(g.id))
      .map(game => {
        const qualityCheck = this.checkQualityWithReasons(game);
        if (!qualityCheck.passed) return null;
        return this.scoreGame(game, signals);
      })
      .filter((g): g is ScoredGame => g !== null && g.hybridScore >= 3.5);

    const combined = [...cached.games, ...filtered]
      .sort((a, b) => b.hybridScore - a.hybridScore);

    this.userCache.set(userId, {
      games: combined,
      fetchedAt: cached.fetchedAt,
      rawgPage: nextPage,
      signals,
    });
  }

  // ============================================================================
  // 🔍 ПОХОЖИЕ ИГРЫ
  // ============================================================================
  async getSimilarGames(
    gameId: number,
    limit: number = 10,
    excludeUserId?: number
  ): Promise<any[]> {
    try {
      this.logger.log(`[Similar] Generating similar games for ${gameId} (adaptive weights)`);
      return await this.generateSimilarGames(gameId, excludeUserId, limit);
    } catch (error: any) {
      this.logger.error(`[getSimilarGames] Error: ${error.message}`);
      return await this.getPopularGames(limit);
    }
  }

  private async generateSimilarGames(
    gameId: number,
    excludeUserId?: number,
    limit: number = 10
  ): Promise<any[]> {
    const targetGame = await this.fetchGameFromRAWG(gameId);
    if (!targetGame) return [];

    const targetSig = this.buildGameSignature(targetGame);

    const isLowMetadata = this.isLowMetadataGame(targetSig);
    this.logger.debug(`[Similar] Game ${gameId} "${targetGame.name}": lowMetadata=${isLowMetadata}`);

    const candidates = await this.fetchCandidateGames(targetGame, 250, isLowMetadata);

    const excludeIds = new Set<number>([gameId]);
    if (excludeUserId) {
      const seen = await this.getUserSeenGameIds(excludeUserId);
      seen.forEach(id => excludeIds.add(id));
    }

    let scored = candidates
      .filter(g => !excludeIds.has(g.id))
      .map(game => {
        const qualityCheck = this.checkQualitySimilar(game);
        if (!qualityCheck.passed) {
          return { game, similarity: 0.1, skip: true };
        }

        const sig = this.buildGameSignature(game);
        const similarity = this.calculateAdaptiveSimilarity(targetSig, sig, isLowMetadata);
        return { game, similarity, skip: similarity < (isLowMetadata ? 0.12 : 0.15) };
      })
      .filter(({ skip }) => !skip)
      .map(({ game, similarity }) => ({
        ...game,
        similarityScore: similarity,
        similarityReasons: this.getSimilarityReasons(targetGame, game, similarity, isLowMetadata)
      }));

    if (scored.length < limit) {
      this.logger.log(`[Similar] Only ${scored.length} games found, expanding search...`);

      const extraCandidates = await this.fetchCandidateGamesExpanded(targetGame, 150, isLowMetadata);

      const extraScored = extraCandidates
        .filter(g => !excludeIds.has(g.id) && !scored.some(s => s.id === g.id))
        .map(game => {
          const sig = this.buildGameSignature(game);
          const similarity = this.calculateAdaptiveSimilarity(targetSig, sig, isLowMetadata);
          return { game, similarity, skip: similarity < 0.10 };
        })
        .filter(({ skip }) => !skip)
        .map(({ game, similarity }) => ({
          ...game,
          similarityScore: similarity,
          similarityReasons: this.getSimilarityReasons(targetGame, game, similarity, isLowMetadata)
        }));

      scored = [...scored, ...extraScored];
    }

    const sorted = scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return this.addGentleDiversity(sorted, limit, isLowMetadata);
  }

  // ============================================================================
  // ⚖️ АДАПТИВНАЯ ВЕСОВАЯ СИСТЕМА
  // ============================================================================

  private isLowMetadataGame(sig: GameSignature): boolean {
    return sig.tags.size < this.LOW_METADATA_TAGS_THRESHOLD ||
      sig.genres.size < this.LOW_METADATA_GENRES_THRESHOLD;
  }

  private calculateAdaptiveSimilarity(
    sig1: GameSignature,
    sig2: GameSignature,
    isLowMetadata: boolean
  ): number {
    let similarity = 0;

    if (isLowMetadata) {
      const weights = {
        tags: 0.25,
        genres: 0.20,
        publishers: 0.20,
        developers: 0.15,
        platforms: 0.15,
        rating: 0.05,
      };

      if (sig1.tags.size > 0 || sig2.tags.size > 0) {
        similarity += this.jaccard(sig1.tags, sig2.tags) * weights.tags;
      }

      if (sig1.genres.size > 0 || sig2.genres.size > 0) {
        similarity += this.jaccard(sig1.genres, sig2.genres) * weights.genres;
      }

      if (sig1.publishers.size > 0 && sig2.publishers.size > 0) {
        similarity += this.jaccard(sig1.publishers, sig2.publishers) * weights.publishers;
      }

      if (sig1.developers.size > 0 && sig2.developers.size > 0) {
        similarity += this.jaccard(sig1.developers, sig2.developers) * weights.developers;
      }

      if (sig1.platforms.size > 0 || sig2.platforms.size > 0) {
        similarity += this.jaccard(sig1.platforms, sig2.platforms) * weights.platforms;
      }

      if (sig1.rating && sig2.rating) {
        const ratingDiff = Math.abs(sig1.rating - sig2.rating);
        similarity += Math.max(0, 1 - ratingDiff / 5) * weights.rating;
      }

    } else {
      const weights = {
        tags: 0.45,
        genres: 0.30,
        publishers: 0.10,
        developers: 0.08,
        platforms: 0.05,
        rating: 0.02,
      };

      similarity += this.jaccard(sig1.tags, sig2.tags) * weights.tags;
      similarity += this.jaccard(sig1.genres, sig2.genres) * weights.genres;

      if (sig1.publishers.size > 0 && sig2.publishers.size > 0) {
        similarity += this.jaccard(sig1.publishers, sig2.publishers) * weights.publishers;
      }
      if (sig1.developers.size > 0 && sig2.developers.size > 0) {
        similarity += this.jaccard(sig1.developers, sig2.developers) * weights.developers;
      }
      similarity += this.jaccard(sig1.platforms, sig2.platforms) * weights.platforms;

      if (sig1.rating && sig2.rating) {
        const ratingDiff = Math.abs(sig1.rating - sig2.rating);
        similarity += Math.max(0, 1 - ratingDiff / 5) * weights.rating;
      }
    }

    return Math.min(similarity, 1);
  }

  private calculateStrictSimilarityForRating(
    game: any,
    ratedGame: { genres: number[]; tags: number[]; rating: number }
  ): number {
    const g1 = new Set<number>(game.genres?.map((g: any) => Number(g.id)) || []);
    const g2 = new Set<number>(ratedGame.genres || []);
    const t1 = new Set<number>(game.tags?.map((t: any) => Number(t.id)) || []);
    const t2 = new Set<number>(ratedGame.tags || []);

    const genreSim = this.jaccard(g1, g2);
    const tagSim = this.jaccard(t1, t2);
    const ratingSim = game.rating && ratedGame.rating
      ? Math.max(0, 1 - Math.abs(game.rating - ratedGame.rating) / 3)
      : 1;

    return tagSim * 0.5 + genreSim * 0.3 + ratingSim * 0.2;
  }

  private scoreGame(game: any, signals: UserSignals): ScoredGame {
    let genreScore = 0;
    if (game.genres?.length && signals.preferredGenreIds.size > 0) {
      const matches = game.genres.filter((g: any) => signals.preferredGenreIds.has(g.id));
      if (matches.length > 0) {
        const maxWeight = Math.max(...matches.map((g: any) => signals.preferredGenreWeights.get(g.id) || 1));
        genreScore = (matches.length / game.genres.length) * maxWeight * 3.0;
      }
    }

    let tagScore = 0;
    if (game.tags?.length && signals.preferredTagIds.size > 0) {
      const matches = game.tags.filter((t: any) => signals.preferredTagIds.has(t.id));
      if (matches.length > 0) {
        const maxWeight = Math.max(...matches.map((t: any) => signals.preferredTagWeights.get(t.id) || 1));
        tagScore = (matches.length / game.tags.length) * maxWeight * 4.0;
      }
    }

    let similarityScore = 0;
    if (signals.highlyRatedGames.length > 0) {
      const similarities = signals.highlyRatedGames.map(rated =>
        this.calculateStrictSimilarityForRating(game, rated)
      );
      const maxSim = Math.max(...similarities);
      similarityScore = maxSim * 2.0;
    }

    const personalizationScore = Math.min(genreScore + tagScore + similarityScore, 9);
    const popularityScore = this.calculateQualityPopularityScore(game);
    const hybridScore = personalizationScore + popularityScore;

    return {
      id: game.id,
      name: game.name,
      rating: game.rating,
      genres: game.genres || [],
      tags: game.tags || [],
      platforms: game.platforms || [],
      background_image: game.background_image,
      hybridScore: Math.round(hybridScore * 10) / 10,
      recommendationReason: this.getRecommendationReason(game, signals),
      _rawgData: game,
    };
  }

  private calculateQualityPopularityScore(game: any): number {
    let score = 0;
    if (game.rating) score += (game.rating / 10) * 0.5;
    if (game.metacritic) score += (game.metacritic / 100) * 0.25;
    if (game.added) {
      const addedScore = game.added >= 5000 ? 0.25 : Math.log10(game.added + 1) / 4;
      score += addedScore * 0.25;
    }
    return Math.min(score, 1);
  }

  private jaccard(set1: Set<number>, set2: Set<number>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    const intersection = [...set1].filter(id => set2.has(id)).length;
    const union = new Set([...set1, ...set2]).size;
    return intersection / union;
  }

  private buildGameSignature(game: any): GameSignature {
    const genres = new Set<number>(game.genres?.map((g: any) => Number(g.id)) || []);
    const tags = new Set<number>(game.tags?.map((t: any) => Number(t.id)) || []);
    const platforms = new Set<number>(game.platforms?.map((p: any) => Number(p.platform?.id)) || []);
    const developers = new Set<number>(game.developers?.map((d: any) => Number(d.id)) || []);
    const publishers = new Set<number>(game.publishers?.map((p: any) => Number(p.id)) || []);

    const metadataScore = Math.min(1, (tags.size + genres.size) / 10);

    return {
      genres,
      tags,
      platforms,
      developers,
      publishers,
      rating: game.rating,
      released: game.released,
      added: game.added,
      metadataScore,
    };
  }

  // ============================================================================
  // 🎯 ПРОВЕРКА КАЧЕСТВА
  // ============================================================================

  private checkQualityWithReasons(game: any): { passed: boolean; reason: string } {
    if (!game.rating || game.rating < 3.5) return { passed: false, reason: `rating ${game.rating} < 3.5` };
    if (!game.added || game.added < 500) return { passed: false, reason: `added ${game.added} < 500` };
    const releaseYear = game.released ? new Date(game.released).getFullYear() : null;
    if (releaseYear && releaseYear < 2005) {
      const hasClassicGenre = game.genres?.some((g: any) => [4, 5, 3, 2].includes(g.id));
      if (!hasClassicGenre) return { passed: false, reason: `old game (${releaseYear})` };
    }
    if (!game.name || game.name.trim() === '') return { passed: false, reason: 'invalid name' };
    return { passed: true, reason: 'ok' };
  }

  private checkQualitySimilar(game: any): { passed: boolean; reason: string } {
    if (!game.rating || game.rating < 3.0) return { passed: false, reason: `rating < 3.0` };
    if (!game.added || game.added < 200) return { passed: false, reason: `added < 200` };
    if (!game.name || game.name.trim() === '') return { passed: false, reason: 'invalid name' };
    return { passed: true, reason: 'ok' };
  }

  // ============================================================================
  // 🎲 АДАПТИВНАЯ ДИВЕРСИФИКАЦИЯ
  // ============================================================================

  private addGentleDiversity(games: any[], limit: number, isLowMetadata: boolean): any[] {
    if (games.length <= limit) return games;

    const result: any[] = [];
    const usedTags = new Set<number>();
    const usedGenres = new Set<number>();
    const usedPublishers = new Set<number>();

    const topRatio = isLowMetadata ? 0.90 : 0.85;
    const topCount = Math.floor(limit * topRatio);

    for (let i = 0; i < topCount && i < games.length; i++) {
      result.push(games[i]);
      games[i].tags?.forEach((t: any) => usedTags.add(t.id));
      games[i].genres?.forEach((g: any) => usedGenres.add(g.id));
      games[i].publishers?.forEach((p: any) => usedPublishers.add(p.id));
    }

    const remaining = games.slice(topCount).filter((g: any) => {
      const hasNewTag = g.tags?.some((t: any) => !usedTags.has(t.id));
      const hasNewGenre = g.genres?.some((gen: any) => !usedGenres.has(gen.id));
      const hasNewPublisher = g.publishers?.some((p: any) => !usedPublishers.has(p.id));

      const minScore = isLowMetadata ? 0.15 : 0.20;
      return (hasNewTag || hasNewGenre || (isLowMetadata && hasNewPublisher)) && g.similarityScore >= minScore;
    });

    result.push(...remaining.slice(0, limit - result.length));
    return result;
  }

  // ============================================================================
  // 📝 ОБЪЯСНЕНИЯ
  // ============================================================================

  private getRecommendationReason(game: any, signals: UserSignals): string {
    const reasons: string[] = [];

    game.tags?.forEach((gameTag: any) => {
      if (signals.preferredTagWeights.has(gameTag.id)) {
        const weight = signals.preferredTagWeights.get(gameTag.id) || 0;
        if (weight >= 1.8) reasons.push(`тег "${gameTag.name}"`);
      }
    });

    game.genres?.forEach((gameGenre: any) => {
      if (signals.preferredGenreWeights.has(gameGenre.id)) {
        const weight = signals.preferredGenreWeights.get(gameGenre.id) || 0;
        if (weight >= 2.0) reasons.push(`жанр "${gameGenre.name}"`);
      }
    });

    if (reasons.length === 0) {
      return 'Качественная игра, которая может вам понравиться';
    }

    return `Рекомендуем, потому что вам нравится ${reasons.slice(0, 2).join(' и ')}`;
  }

  private getSimilarityReasons(
    game1: any,
    game2: any,
    similarity: number,
    isLowMetadata: boolean
  ): string[] {
    const reasons: string[] = [];

    if (isLowMetadata) {
      const commonPublishers = game1.publishers?.filter((p1: any) =>
        game2.publishers?.some((p2: any) => p2.id === p1.id)
      ) || [];

      if (commonPublishers.length > 0) {
        reasons.push(`издатель: ${commonPublishers.slice(0, 1).map((p: any) => p.name).join(', ')}`);
      }

      const commonDevelopers = game1.developers?.filter((d1: any) =>
        game2.developers?.some((d2: any) => d2.id === d1.id)
      ) || [];

      if (commonDevelopers.length > 0 && reasons.length < 2) {
        reasons.push(`разработчик: ${commonDevelopers.slice(0, 1).map((d: any) => d.name).join(', ')}`);
      }
    }

    const commonTags = game1.tags?.filter((t1: any) =>
      game2.tags?.some((t2: any) => t2.id === t1.id)
    ) || [];

    if (commonTags.length > 0 && reasons.length < 2) {
      reasons.push(`тег${commonTags.length > 1 ? 'и' : ''}: ${commonTags.slice(0, 2).map((t: any) => t.name).join(', ')}`);
    }

    const commonGenres = game1.genres?.filter((g1: any) =>
      game2.genres?.some((g2: any) => g2.id === g1.id)
    ) || [];

    if (commonGenres.length > 0 && reasons.length < 2) {
      reasons.push(`жанр${commonGenres.length > 1 ? 'ы' : ''}: ${commonGenres.slice(0, 1).map((g: any) => g.name).join(', ')}`);
    }

    if (isLowMetadata) {
      const commonPlatforms = game1.platforms?.filter((p1: any) =>
        game2.platforms?.some((p2: any) => p2.platform?.id === p1.platform?.id)
      ) || [];

      if (commonPlatforms.length > 0 && reasons.length < 2) {
        reasons.push(`платформа: ${commonPlatforms.slice(0, 1).map((p: any) => p.platform?.name).join(', ')}`);
      }
    }

    if (reasons.length === 0) {
      reasons.push(`схожесть ${Math.round(similarity * 100)}%`);
    }

    return reasons;
  }

  // ============================================================================
  // 📡 RAWG API
  // ============================================================================

  private async fetchFromRAWG(signals: UserSignals, page: number, pageSize: number): Promise<any[]> {
    const params: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page,
      page_size: pageSize,
      ordering: '-rating',
    };

    if (signals.preferredGenreIds.size > 0) {
      const topGenres = Array.from(signals.preferredGenreIds).slice(0, 3).join(',');
      params.genres = topGenres;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params })
      );
      return response.data.results || [];
    } catch (error: any) {
      this.logger.error(`[RAWG] Fetch error: ${error.message}`);
      return [];
    }
  }

  private async fetchCandidateGames(
    targetGame: any,
    count: number,
    isLowMetadata: boolean
  ): Promise<any[]> {
    const params: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page_size: count,
      ordering: '-rating',
    };

    if (isLowMetadata) {
      if (targetGame.genres?.length > 0) {
        params.genres = targetGame.genres[0].id;
      }
      if (targetGame.platforms?.length > 0) {
        params.platforms = targetGame.platforms[0].platform?.id;
      }
    } else {
      if (targetGame.genres?.length) {
        const genreIds = targetGame.genres.slice(0, 3).map((g: any) => g.id);
        params.genres = genreIds.join(',');
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params })
      );
      return response.data.results || [];
    } catch (error: any) {
      this.logger.error(`[RAWG candidates] Error: ${error.message}`);
      return [];
    }
  }

  private async fetchCandidateGamesExpanded(
    targetGame: any,
    count: number,
    isLowMetadata: boolean
  ): Promise<any[]> {
    const params: any = {
      key: this.configService.get('RAWG_API_KEY'),
      page_size: count,
      ordering: '-added',
    };

    if (isLowMetadata) {
      if (targetGame.platforms?.length > 0) {
        params.platforms = targetGame.platforms[0].platform?.id;
      }
    } else {
      if (targetGame.genres?.length) {
        const genreIds = targetGame.genres.slice(0, 2).map((g: any) => g.id);
        params.genres = genreIds.join(',');
      }
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params })
      );
      return response.data.results || [];
    } catch (error: any) {
      this.logger.error(`[RAWG expanded] Error: ${error.message}`);
      return [];
    }
  }

  private async fetchGameFromRAWG(gameId: number): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.RAWG_BASE_URL}/${gameId}`, {
          params: { key: this.configService.get('RAWG_API_KEY') }
        })
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`[RAWG game] Error: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // 👤 ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
  // ============================================================================

  private async fetchUserSignals(userId: number): Promise<UserSignals> {
    const [genrePrefs, tagPrefs, userActions] = await Promise.all([
      this.supabaseService
        .from('user_genre_preferences')
        .select('genre_id, genre_name, weight')
        .eq('user_id', userId)
        .order('weight', { ascending: false }),

      this.supabaseService
        .from('user_tag_preferences')
        .select('tag_id, tag_name, weight')
        .eq('user_id', userId)
        .order('weight', { ascending: false }),

      this.supabaseService
        .from('user_game_actions')
        .select('game_id, action_type, rating, genres, tags')
        .eq('user_id', userId),
    ]);

    const preferredGenreIds = new Set<number>();
    const preferredGenreWeights = new Map<number, number>();
    genrePrefs.data?.forEach((g: any) => {
      if (g.weight > 1.5) {
        preferredGenreIds.add(g.genre_id);
        preferredGenreWeights.set(g.genre_id, g.weight);
      }
    });

    const preferredTagIds = new Set<number>();
    const preferredTagWeights = new Map<number, number>();
    tagPrefs.data?.forEach((t: any) => {
      if (t.weight > 1.5) {
        preferredTagIds.add(t.tag_id);
        preferredTagWeights.set(t.tag_id, t.weight);
      }
    });

    const highlyRatedGames = (userActions.data || [])
      .filter((a: any) => a.action_type === 'rate' && a.rating >= 7)
      .map((a: any) => ({
        id: a.game_id,
        genres: (a.genres || []).map((g: any) => Number(g.id)),
        tags: (a.tags || []).map((t: any) => Number(t.id)),
        rating: a.rating,
      }));

    const seenGameIds = new Set((userActions.data || []).map((a: any) => a.game_id));

    return {
      preferredGenreIds,
      preferredGenreWeights,
      preferredTagIds,
      preferredTagWeights,
      highlyRatedGames,
      seenGameIds,
    };
  }

  private async getUserSeenGameIds(userId: number): Promise<number[]> {
    const { data } = await this.supabaseService
      .from('user_game_actions')
      .select('game_id')
      .eq('user_id', userId);
    return data?.map((d: any) => d.game_id) || [];
  }

  // ============================================================================
  // 🏆 ПОПУЛЯРНЫЕ ИГРЫ (фолбэк)
  // ============================================================================
  async getPopularGames(limit: number): Promise<any[]> {
    const params = {
      key: this.configService.get('RAWG_API_KEY'),
      page_size: limit * 2,
      ordering: '-rating',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.RAWG_BASE_URL, { params })
      );

      return response.data.results
        .filter(g => this.checkQualityWithReasons(g).passed)
        .slice(0, limit * 2)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit)
        .map((game: any) => ({
          ...game,
          hybridScore: game.rating || 5.0,
          recommendationReason: 'Популярная качественная игра'
        }));
    } catch (error: any) {
      this.logger.error(`[getPopularGames] Error: ${error.message}`);
      return [];
    }
  }

  // ============================================================================
  // 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================================================

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}