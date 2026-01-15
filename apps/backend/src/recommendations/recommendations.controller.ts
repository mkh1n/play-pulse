import { 
  Controller, Get, Post, Query, 
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
  ) {}

  // ПОЛУЧИТЬ ПЕРСОНАЛИЗИРОВАННЫЕ РЕКОМЕНДАЦИИ
  @Get('personalized')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить персонализированные рекомендации' })
  @ApiResponse({ status: 200, description: 'Рекомендации получены' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getPersonalizedRecommendations(
    @Req() req,
    @Query('limit') limit: string = '20'
  ) {
    const userId = req.user.id;
    const recommendations = await this.recommendationService.getPersonalizedRecommendations(
      userId, 
      parseInt(limit)
    );

    return {
      success: true,
      count: recommendations.length,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // ПОЛУЧИТЬ СВОИ ПРЕДПОЧТЕНИЯ
  @Get('my-preferences')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свои предпочтения (жанры, теги)' })
  async getMyPreferences(@Req() req) {
    const userId = req.user.id;
    const preferences = await this.preferencesService.getUserPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  // ПОЛУЧИТЬ ПОПУЛЯРНЫЕ ИГРЫ ДЛЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ
   @Get('popular')
  @ApiOperation({ summary: 'Получить популярные игры' })
  async getPopularGames(@Query('limit') limit: string = '20') {
    const games = await this.recommendationService.getPopularGames(parseInt(limit));

    return {
      success: true,
      count: games.length,
      games,
    };
  }

  // ПОЛУЧИТЬ НОВЫЕ ИГРЫ
  @Get('new')
  @ApiOperation({ summary: 'Получить новые игры' })
  async getNewGames(@Query('limit') limit: string = '20') {
    // Временно используем популярные игры
    const games = await this.recommendationService.getPopularGames(parseInt(limit));
    
    return {
      success: true,
      count: games.length,
      games: games.map(game => ({
        ...game,
        recommendationReason: 'Новая популярная игра'
      })),
    };
  }


  // ПОЛУЧИТЬ РЕКОМЕНДАЦИИ ПО ЖАНРУ
  @Get('by-genre/:genreId')
  @ApiOperation({ summary: 'Получить игры по жанру' })
  async getRecommendationsByGenre(
    @Param('genreId') genreId: string,
    @Query('limit') limit: string = '20'
  ) {
    // Реализация получения игр по жанру
    return {
      success: true,
      message: `Рекомендации по жанру ${genreId}`,
      limit: parseInt(limit),
    };
  }

  // ПОЛУЧИТЬ ИСТОРИЮ ДЕЙСТВИЙ
  @Get('my-actions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить историю своих действий' })
  async getMyActions(
    @Req() req,
    @Query('type') type?: string,
    @Query('limit') limit: string = '50'
  ) {
    // Реализация получения истории действий
    return {
      success: true,
      userId: req.user.id,
      type,
      limit: parseInt(limit),
    };
  }
}