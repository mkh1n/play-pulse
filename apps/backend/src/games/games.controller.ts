import { 
  Controller, Get, Post, Put, Delete, 
  Param, Body, Query, UseGuards, Req, ParseIntPipe, 
  Logger
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { PreferencesService } from '../recommendations/preferences.service';
import { RateGameDto } from './dto/rate-game.dto';
import { UpdateGameStatusDto, UpdatePurchaseDto } from './dto/update-game-status.dto';

@ApiTags('games')
@Controller('games')
export class GamesController {
    private readonly logger = new Logger(PreferencesService.name);
  
  constructor(
    private readonly gamesService: GamesService,
    private readonly preferencesService: PreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить список игр' })
  async getAllGames(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
    @Query('ordering') ordering: string = '-rating',
  ) {
    return this.gamesService.getGames(
      parseInt(page),
      parseInt(pageSize),
      search,
      ordering
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить игру по ID' })
  async getGameById(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.getGameData(id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поставить лайк игре' })
  async likeGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    const gameData = await this.gamesService.getGameData(gameId);
    
    const result = await this.preferencesService.processGameAction(
      userId,
      gameData,
      'like'
    );

    return {
      success: true,
      message: 'Игра добавлена в понравившиеся',
      data: {
        gameId,
        gameName: gameData.name,
        action: 'like',
        userId
      }
    };
  }

  @Delete(':id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать лайк с игры' })
  async unlikeGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    
    const result = await this.preferencesService.removeGameAction(
      userId,
      gameId,
      'like'
    );

    return {
      success: true,
      message: 'Лайк убран',
      data: {
        gameId,
        action: 'like',
        userId
      }
    };
  }

  @Post(':id/dislike')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поставить дизлайк игре' })
  async dislikeGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    const gameData = await this.gamesService.getGameData(gameId);
    
    const result = await this.preferencesService.processGameAction(
      userId,
      gameData,
      'dislike'
    );

    return {
      success: true,
      message: 'Игра добавлена в непонравившиеся',
      data: {
        gameId,
        gameName: gameData.name,
        action: 'dislike',
        userId
      }
    };
  }

  @Delete(':id/dislike')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать дизлайк с игры' })
  async undislikeGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    
    const result = await this.preferencesService.removeGameAction(
      userId,
      gameId,
      'dislike'
    );

    return {
      success: true,
      message: 'Дизлайк убран',
      data: {
        gameId,
        action: 'dislike',
        userId
      }
    };
  }

  @Post(':id/wishlist')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить игру в wishlist' })
  async addToWishlist(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    const gameData = await this.gamesService.getGameData(gameId);
    
    const result = await this.preferencesService.processGameAction(
      userId,
      gameData,
      'wishlist'
    );

    return {
      success: true,
      message: 'Игра добавлена в wishlist',
      data: {
        gameId,
        gameName: gameData.name,
        action: 'wishlist',
        userId
      }
    };
  }

  @Delete(':id/wishlist')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Убрать игру из wishlist' })
  async removeFromWishlist(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    
    const result = await this.preferencesService.removeGameAction(
      userId,
      gameId,
      'wishlist'
    );

    return {
      success: true,
      message: 'Игра удалена из wishlist',
      data: {
        gameId,
        action: 'wishlist',
        userId
      }
    };
  }

  @Get(':id/user-actions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свои действия для игры' })
  async getUserActions(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    const actions = await this.preferencesService.getUserGameActions(
      userId,
      gameId
    );

    return {
      success: true,
      data: actions
    };
  }

  @Post(':id/rate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поставить оценку игре (1-10)' })
  async rateGame(
    @Param('id', ParseIntPipe) gameId: number,
    @Body() rateGameDto: RateGameDto,
    @Req() req
  ) {
    const userId = req.user.id;
    
    // Получаем данные игры
    const gameData = await this.gamesService.getGameData(gameId);
    
    const result = await this.preferencesService.processGameRating(
      userId, 
      gameData, 
      rateGameDto.rating
    );

    return {
      success: true,
      message: result.updated ? 'Оценка обновлена' : 'Оценка сохранена',
      data: {
        rating: rateGameDto.rating,
        game: {
          id: gameId,
          name: gameData.name
        },
        averageRating: await this.preferencesService.getUserAverageRating(userId)
      }
    };
  }
@Delete(':id/rate')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({ summary: 'Удалить свою оценку игры' })
async removeRating(
  @Param('id', ParseIntPipe) gameId: number,
  @Req() req
) {
  const userId = req.user.id;
  
  const result = await this.preferencesService.removeGameAction(
    userId,
    gameId,
    'rate'
  );

  return {
    success: true,
    message: 'Оценка удалена',
    data: {
      gameId,
      userId
    }
  };
}
  @Get(':id/my-rating')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свою оценку для игры' })
  async getMyRating(
    @Param('id', ParseIntPipe) gameId: number,
    @Req() req
  ) {
    const userId = req.user.id;
    const rating = await this.preferencesService.getUserGameRating(userId, gameId);
    
    return {
      hasRating: rating !== null,
      rating: rating,
      gameId: gameId
    };
  }

  @Post(':id/status')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({ summary: 'Обновить статус прохождения игры' })
async updateGameStatus(
  @Param('id', ParseIntPipe) gameId: number,
  @Body() updateStatusDto: UpdateGameStatusDto,
  @Req() req
) {
  const userId = req.user.id;
  this.logger.log(`[updateGameStatus] userId=${userId}, gameId=${gameId}, status=${updateStatusDto.status}`);
  
  const gameData = await this.gamesService.getGameData(gameId);
  
  const result = await this.preferencesService.updateGameCompletionStatus(
    userId,
    gameData,
    updateStatusDto.status  as 'not_played' | 'playing' | 'completed' | 'dropped',
  );

  return {
    success: true,
    message: getStatusMessage(updateStatusDto.status),
    data: {
      gameId,
      gameName: gameData.name,
      status: updateStatusDto.status,
      userId
    }
  };
}

@Post(':id/purchase')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({ summary: 'Обновить статус покупки игры' })
async updatePurchaseStatus(
  @Param('id', ParseIntPipe) gameId: number,
  @Body() updatePurchaseDto: UpdatePurchaseDto,
  @Req() req
) {
  const userId = req.user.id;
  this.logger.log(`[updatePurchaseStatus] userId=${userId}, gameId=${gameId}, purchase=${updatePurchaseDto.purchase}`);
  
  const gameData = await this.gamesService.getGameData(gameId);
  
  const result = await this.preferencesService.updatePurchaseStatus(
    userId,
    gameData,
    updatePurchaseDto.purchase  as 'owned' | 'not_owned' | 'want_to_buy',
  );

  return {
    success: true,
    message: getPurchaseMessage(updatePurchaseDto.purchase),
    data: {
      gameId,
      gameName: gameData.name,
      purchase: updatePurchaseDto.purchase,
      userId
    }
  };
}

}

// Вспомогательные функции
function getStatusMessage(status: string): string {
  const messages = {
    'not_played': 'Статус сброшен на "Не играл"',
    'playing': 'Игра отмечена как "Играю сейчас"',
    'completed': 'Игра отмечена как "Завершена"',
    'dropped': 'Игра отмечена как "Брошена"'
  };
  return messages[status] || 'Статус обновлен';
}

function getPurchaseMessage(purchase: string): string {
  const messages = {
    'owned': 'Игра отмечена как "Куплена"',
    'not_owned': 'Игра отмечена как "Не куплена"',
    'want_to_buy': 'Игра добавлена в "Хочу купить"'
  };
  return messages[purchase] || 'Статус покупки обновлен';
}