import {
  Controller, Get, Post, Query,
  UseGuards, Req, Param, UseInterceptors,
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
// recommendations.controller.ts
@Get('personalized')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
async getPersonalizedRecommendations(
  @Req() req,
  @Query('limit') limit: string = '20',
  @Query('offset') offset: string = '0'  // ← Добавить
) {
  const userId = req.user.id;
  const recommendations = await this.recommendationService.getPersonalizedRecommendations(
    userId,
    parseInt(limit),
    parseInt(offset)  // ← Передать
  );
  
  return {
    success: true,
    count: recommendations.length,
    hasMore: recommendations.length === parseInt(limit),
    recommendations,
  };
}

@Get('similar/:gameId')
async getSimilarGames(
  @Param('gameId') gameId: string,
  @Query('limit') limit: string = '10',
  @Req() req,
  @Query('excludeSeen') excludeSeen: string = 'true'
) {
  const excludeUserId = excludeSeen === 'true' && req.user?.id ? req.user.id : undefined;
  
  const games = await this.recommendationService.getSimilarGames(
    parseInt(gameId),
    parseInt(limit),
    excludeUserId
  );

  return { success: true, count: games.length, games };
}

  // 🏆 Популярные игры
  @Get('popular')
  async getPopularGames(@Query('limit') limit: string = '20') {
    const games = await this.recommendationService.getPopularGames(parseInt(limit));

    return {
      success: true,
      count: games.length,
      games,
    };
  }

  // 📊 Предпочтения пользователя
  @Get('my-preferences')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getMyPreferences(@Req() req) {
    const userId = req.user.id;
    const preferences = await this.preferencesService.getUserPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  // 📜 История действий
  @Get('my-actions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить историю своих действий' })
  async getMyActions(
    @Req() req,
    @Query('type') type?: string,
    @Query('limit') limit: string = '50'
  ) {
    const userId = req.user.id;

    // ✅ Вызываем метод сервиса вместо прямого доступа к БД
    return await this.preferencesService.getUserActionsHistory(userId, {
      type,
      limit: parseInt(limit),
    });
  }
}