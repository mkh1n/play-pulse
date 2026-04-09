// apps/backend/src/recommendations/recommendations.controller.ts
import {
  Controller, Get, Post, Query, Body,
  UseGuards, Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly preferencesService: PreferencesService,
  ) {}

  // ============================================================================
  // 🎯 СВАЙПЫ — НОВЫЕ ЭНДПОИНТЫ
  // ============================================================================

  @Get('swipes')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить игры для свайпов (бесконечная лента)' })
  @ApiResponse({ status: 200, description: 'Игры получены' })
  async getSwipeGames(
    @Req() req,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('exclude') exclude?: string
  ) {
    const userId = req.user.id;
    const excludeGameIds = exclude
      ? exclude.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      : [];

    const { games, hasMore } = await this.recommendationService.getSwipeGames(
      userId,
      parseInt(limit),
      parseInt(offset),
      excludeGameIds
    );

    return {
      success: true,
      count: games.length,
      hasMore,
      games,
    };
  }

  @Post('swipe-action')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить действие со свайпа' })
  async processSwipeAction(
    @Req() req,
    @Body() body: { gameId: number; gameName?: string; action: 'like' | 'dislike' | 'skip' }
  ) {
    const userId = req.user.id;
    const { gameId, gameName, action } = body;

    if (action === 'skip') {
      return { success: true, message: 'Skipped', action };
    }

    try {
      const gameData = {
        id: gameId,
        rawg_id: gameId,
        name: gameName || `Game ${gameId}`,
      };

      const result = await this.preferencesService.processGameAction(
        userId,
        gameData,
        action === 'like' ? 'like' : 'dislike'
      );

      return {
        success: true,
        message: action === 'like' ? 'Liked' : 'Disliked',
        action,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        action,
      };
    }
  }

  // ============================================================================
  // 🎯 СТАРЫЕ ЭНДПОИНТЫ (для обратной совместимости)
  // ============================================================================

  @Get('personalized')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getPersonalizedRecommendations(
    @Req() req,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const userId = req.user.id;
    const recommendations = await this.recommendationService.getPersonalizedRecommendations(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    return {
      success: true,
      count: recommendations.length,
      hasMore: recommendations.length === parseInt(limit),
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('similar/:gameId')
  @ApiOperation({ summary: 'Получить похожие игры' })
  async getSimilarGames(
    @Query('limit') limit: string = '10',
    @Req() req,
    @Query('excludeSeen') excludeSeen: string = 'true'
  ) {
    const excludeUserId = excludeSeen === 'true' && req.user?.id ? req.user.id : undefined;
    const games = await this.recommendationService.getSimilarGames(
      parseInt(limit), // gameId не используется в заглушке
      parseInt(limit),
      excludeUserId
    );

    return { success: true, count: games.length, games };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Получить популярные игры' })
  async getPopularGames(@Query('limit') limit: string = '20') {
    const games = await this.recommendationService.getPopularGames(parseInt(limit));
    return { success: true, count: games.length, games };
  }

  @Get('my-preferences')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getMyPreferences(@Req() req) {
    const userId = req.user.id;
    const preferences = await this.preferencesService.getUserPreferences(userId);
    return { success: true,  preferences };
  }

  @Get('my-actions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getMyActions(
    @Req() req,
    @Query('type') type?: string,
    @Query('limit') limit: string = '50'
  ) {
    const userId = req.user.id;
    return await this.preferencesService.getUserActionsHistory(userId, {
      type,
      limit: parseInt(limit),
    });
  }
}