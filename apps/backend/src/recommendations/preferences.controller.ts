// В controllers/preferences.controller.ts
import { Controller, Get, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';

@ApiTags('preferences')
@Controller('preferences')
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
  ) {}

  @Get('game-actions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(CacheInterceptor) // Добавляем кэширование
  @CacheTTL(60) // Кэшируем на 60 секунд
  async getAllGameActions(@Req() req) {
    return this.preferencesService.getAllUserGameActions(req.user.id);
  }
}