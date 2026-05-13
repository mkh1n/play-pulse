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
  limit: string = '20',

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

  const result =
    await this.recommendationService.getSwipeGames(
      userId,
      parseInt(limit),
      excludeGameIds,
    );

  return {
    success: true,

    ...result,
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
}