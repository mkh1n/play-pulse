// games.controller.ts
import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Req, ParseIntPipe, Logger, UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { PreferencesService } from '../recommendations/preferences.service';
import { RateGameDto } from './dto/rate-game.dto';
import { UpdateGameStatusDto, UpdatePurchaseDto } from './dto/update-game-status.dto';
import { GameMetaDto } from './dto/game-meta.dto';

@ApiTags('games')
@Controller('games')
export class GamesController {
  private readonly logger = new Logger(GamesController.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly preferencesService: PreferencesService,
  ) { }

  // ============================================================================
  // GAMES LIST
  // ============================================================================

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('games:list')
  @CacheTTL(300)
  @ApiOperation({ summary: 'Получить список игр' })
  async getAllGames(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
    @Query('ordering') ordering: string = '-rating',
    @Query('genres') genres?: string,
    @Query('platforms') platforms?: string,
    @Query('tags') tags?: string,
    @Query('dates') dates?: string,
    @Query('developers') developers?: string,
    @Query('publishers') publishers?: string,
  ) {
    return this.gamesService.getGames(
      parseInt(page),
      parseInt(pageSize),
      search,
      ordering,
      { genres, platforms, tags, dates, developers, publishers },
    );
  }

  // ============================================================================
  // GAME DETAILS
  // ============================================================================

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Получить игру по ID' })
  async getGameById(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.getGameData(id);
  }

  // ============================================================================
  // LIKE - НЕ используем getGameName
  // ============================================================================

  @Post(':id/like')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary: 'Поставить лайк игре',
})
async likeGame(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  body: GameMetaDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  await this.preferencesService.processGameAction(
    userId,
    gameId,
    'like',
    body.gameName,
    body.gameImage,
    body.genres,
    body.tags,
  );

  return {
    success: true,
    message:
      'Игра добавлена в понравившиеся',

    data: {
      gameId,
      action: 'like',
      userId,
    },
  };
}

  @Delete(':id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать лайк с игры' })
  async unlikeGame(@Param('id', ParseIntPipe) gameId: number, @Req() req) {
    const userId = req.user.id;
    await this.preferencesService.removeGameAction(userId, gameId, 'like');
    return { success: true, message: 'Лайк убран', data: { gameId, action: 'like', userId } };
  }

  // ============================================================================
  // DISLIKE - НЕ используем getGameName
  // ============================================================================
@Post(':id/dislike')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary:
    'Поставить дизлайк игре',
})
async dislikeGame(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  body: GameMetaDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  await this.preferencesService.processGameAction(
    userId,
    gameId,
    'dislike',
    body.gameName,
    body.gameImage,
    body.genres,
    body.tags,
  );

  return {
    success: true,
    message:
      'Игра добавлена в непонравившиеся',

    data: {
      gameId,
      action: 'dislike',
      userId,
    },
  };
}

  // ============================================================================
  // WISHLIST - НЕ используем getGameName
  // ============================================================================
@Post(':id/wishlist')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary:
    'Добавить игру в wishlist',
})
async addToWishlist(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  body: GameMetaDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  await this.preferencesService.processGameAction(
    userId,
    gameId,
    'wishlist',
    body.gameName,
    body.gameImage,
    body.genres,
    body.tags,
  );

  return {
    success: true,
    message:
      'Игра добавлена в wishlist',

    data: {
      gameId,
      action: 'wishlist',
      userId,
    },
  };
}
  @Delete(':id/wishlist')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать игру из wishlist' })
  async removeFromWishlist(@Param('id', ParseIntPipe) gameId: number, @Req() req) {
    const userId = req.user.id;
    await this.preferencesService.removeGameAction(userId, gameId, 'wishlist');
    return { success: true, message: 'Игра удалена из wishlist', data: { gameId, action: 'wishlist', userId } };
  }

  // ============================================================================
  // RATING - НЕ используем getGameName
  // ============================================================================
@Post(':id/rate')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary:
    'Поставить оценку игре',
})
async rateGame(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  rateGameDto: RateGameDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  const result =
    await this.preferencesService.processGameRating(
      userId,
      gameId,
      rateGameDto.rating,
      rateGameDto.gameName,
      rateGameDto.gameImage,
    );

  return {
    success: true,

    message: result.updated
      ? 'Оценка обновлена'
      : 'Оценка сохранена',

    data: {
      gameId,
      rating:
        rateGameDto.rating,

      averageRating:
        await this.preferencesService.getUserAverageRating(
          userId,
        ),
    },
  };
}

  @Delete(':id/rate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить свою оценку игры' })
  async removeRating(@Param('id', ParseIntPipe) gameId: number, @Req() req) {
    const userId = req.user.id;
    await this.preferencesService.removeGameAction(userId, gameId, 'rate');
    return { success: true, message: 'Оценка удалена', data: { gameId, userId } };
  }

  @Get(':id/my-rating')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свою оценку игры' })
  async getMyRating(@Param('id', ParseIntPipe) gameId: number, @Req() req) {
    const userId = req.user.id;
    const rating = await this.preferencesService.getUserGameRating(userId, gameId);
    return { hasRating: rating !== null, rating, gameId };
  }

  // ============================================================================
  // STATUS - НЕ используем getGameName
  // ============================================================================
@Post(':id/status')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary:
    'Обновить статус прохождения',
})
async updateGameStatus(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  updateStatusDto: UpdateGameStatusDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  await this.preferencesService.updateGameCompletionStatus(
    userId,
    gameId,
    updateStatusDto.status as any,
    updateStatusDto.gameName,
    updateStatusDto.gameImage,
  );

  return {
    success: true,

    message:
      getStatusMessage(
        updateStatusDto.status,
      ),

    data: {
      gameId,
      status:
        updateStatusDto.status,
      userId,
    },
  };
}

  // ============================================================================
  // PURCHASE - НЕ используем getGameName
  // ============================================================================
@Post(':id/purchase')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({
  summary:
    'Обновить статус покупки',
})
async updatePurchaseStatus(
  @Param('id', ParseIntPipe)
  gameId: number,

  @Body()
  updatePurchaseDto: UpdatePurchaseDto,

  @Req()
  req,
) {
  const userId = req.user.id;

  await this.preferencesService.updatePurchaseStatus(
    userId,
    gameId,
    updatePurchaseDto.purchase as any,
    updatePurchaseDto.gameName,
    updatePurchaseDto.gameImage,
  );

  return {
    success: true,

    message:
      getPurchaseMessage(
        updatePurchaseDto.purchase,
      ),

    data: {
      gameId,
      purchase:
        updatePurchaseDto.purchase,
      userId,
    },
  };
}
}
// ============================================================================
// HELPERS
// ============================================================================

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    not_played: 'Статус сброшен на "Не играл"',
    playing: 'Игра отмечена как "Играю сейчас"',
    completed: 'Игра отмечена как "Завершена"',
    dropped: 'Игра отмечена как "Брошена"',
  };
  return messages[status] || 'Статус обновлен';
}

function getPurchaseMessage(purchase: string): string {
  const messages: Record<string, string> = {
    owned: 'Игра отмечена как "Куплена"',
    not_owned: 'Игра отмечена как "Не куплена"',
    want_to_buy: 'Игра добавлена в "Хочу купить"',
  };
  return messages[purchase] || 'Статус покупки обновлен';
}