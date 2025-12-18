// backend/src/games/games.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // Ваши существующие endpoints
  @Get()
  async getAllGames(@Query() query: any) {
    return this.gamesService.getGames(query);
  }

  @Get(':id')
  async getGameById(@Param('id') id: string) {
    return this.gamesService.getGameById(+id);
  }

  // Новые endpoints для жанров и платформ
  @Get('metadata/genres')
  async getGenres() {
    return this.gamesService.getGenresFromRAWG();
  }

  @Get('metadata/platforms')
  async getPlatforms() {
    return this.gamesService.getPlatformsFromRAWG();
  }

  // Или объединенный endpoint для всех метаданных
  @Get('metadata/all')
  async getAllMetadata() {
    const [genres, platforms] = await Promise.all([
      this.gamesService.getGenresFromRAWG(),
      this.gamesService.getPlatformsFromRAWG(),
    ]);
    return { genres, platforms };
  }
}