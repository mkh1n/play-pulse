// apps/backend/src/swipes/swipes.controller.ts
import {
  Controller, Get, Post, Query, Body, Param, ParseIntPipe,
  UseGuards, Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SwipesService } from './swipes.service';
import { PreferencesService } from '../preferences/preferences.service';

@ApiTags('swipes')
@Controller('swipes')
export class SwipesController {
  constructor(
    private readonly swipesService: SwipesService,
    private readonly preferencesService: PreferencesService,
  ) { }

  // ============================================================================
  // СВАЙПЫ - СЛУЧАЙНЫЕ ИГРЫ С РЕЙТИНГОМ > 7 И BACKGROUND_IMAGE
  // ============================================================================
  @Get('')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getSwipeGames(
    @Req() req,
    @Query('limit') limit: string = '10',
    @Query('exclude') exclude?: string,
  ) {
    const userId = req.user.id;

    const excludeGameIds = exclude
      ? exclude
        .split(',')
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id))
      : [];

    const games = await this.swipesService.getRandomGamesForSwipes(
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
  // BATCH SWIPE ACTIONS
  // ============================================================================
  @Post('swipe-action/batch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обработать пачку действий со свайпами' })
  async processBatchSwipeActions(
    @Req() req,
    @Body() body: { actions: Array<{ gameId: number; gameName: string; gameImage?: string; genres?: Array<{ id?: number | string; name?: string }>; tags?: Array<{ id?: number | string; name?: string }>; action: 'like' | 'dislike' }> }
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
      const { gameId, gameName, gameImage, genres, tags, action: actionType } = action;

      if (!gameId || !actionType) {
        results.push({
          gameId,
          success: false,
          error: 'Invalid action data',
        });
        continue;
      }

      try {
        await this.preferencesService.processGameAction(userId, gameId, actionType, gameName, gameImage, genres, tags);
        results.push({
          gameId,
          action: actionType,
          success: true,
        });
      } catch (error: any) {
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
