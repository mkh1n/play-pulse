// apps/backend/src/recommendations/recommendations.controller.ts
import {
  Controller, Get, Post, Query, Body,
  UseGuards, Req, Param
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
  ) { }

  // ============================================================================
  // СВАЙПЫ 
  // ============================================================================
@Get('swipes')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
async getSwipeGames(
  @Req() req,

  @Query('limit')
  limit: string = '10',

  @Query('exclude')
  exclude?: string,
) {
  const userId =
    req.user.id;

  const excludeGameIds =
    exclude
      ? exclude
          .split(',')
          .map((id) =>
            parseInt(
              id.trim(),
            ),
          )
          .filter(
            (id) =>
              !isNaN(id),
          )
      : [];

  // Используем быстрый метод без rebuild пула
  const games =
    await this.recommendationService.getSwipeRecommendations(
      userId,
      parseInt(limit),
      excludeGameIds,
    );

  return {
    success: true,
    games,
    hasMore: games.length === parseInt(limit),
  };
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
  @ApiOperation({
    summary: 'Получить похожие игры',
  })
  async getSimilarGames(
    @Param('gameId')
    gameId: string,

    @Query('limit')
    limit: string = '10',

    @Req()
    req,

    @Query('excludeSeen')
    excludeSeen: string = 'false',
  ) {
    try {
      const parsedGameId =
        parseInt(gameId);

      const parsedLimit =
        parseInt(limit);

      if (
        isNaN(parsedGameId)
      ) {
        return {
          success: false,

          count: 0,

          games: [],

          error:
            'Invalid gameId',
        };
      }

      const excludeUserId =
        excludeSeen ===
          'true' &&
          req.user?.id
          ? req.user.id
          : undefined;

      const games =
        await this.recommendationService.getSimilarGames(
          parsedGameId,
          parsedLimit,
        );

      return {
        success: true,

        count:
          games.length,

        games,
      };
    } catch (error: any) {
      return {
        success: false,

        count: 0,

        games: [],

        error:
          error.message,
      };
    }
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
    return { success: true, preferences };
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

  // ============================================================================
  // 📦 BATCH SWIPE ACTIONS
  // ============================================================================
  @Post('swipe-action/batch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обработать пачку действий со свайпами' })
  async processBatchSwipeActions(
    @Req() req,
    @Body() body: { actions: Array<{ gameId: number; gameName: string; action: 'like' | 'dislike' }> }
  ) {
    const userId = req.user.id;
    const { actions } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return {
        success: false,
        error: 'Invalid payload: expected array of actions',
      };
    }

    const results = [];
    
    for (const action of actions) {
      const { gameId, gameName, action: actionType } = action;

      if (!gameId || !actionType) {
        results.push({
          gameId,
          success: false,
          error: 'Invalid action data',
        });
        continue;
      }

      try {
        await this.preferencesService.processGameAction(userId, gameId, actionType);
        results.push({
          gameId,
          action: actionType,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`[BATCH] Error processing game ${gameId}: ${error.message}`);
        results.push({
          gameId,
          action: actionType,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
    };
  }
}