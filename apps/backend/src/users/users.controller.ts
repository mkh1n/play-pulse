import { 
  Controller, Get, Put, Body, 
  UseGuards, Req, Param 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PreferencesService } from '../recommendations/preferences.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
     constructor(
    private readonly usersService: UsersService,
    private readonly preferencesService: PreferencesService // Добавьте эту зависимость
  ) {}

  // ПОЛУЧИТЬ ПРОФИЛЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свой профиль' })
  @ApiResponse({ status: 200, description: 'Профиль получен' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getMyProfile(@Req() req) {
    const user = await this.usersService.findById(req.user.id);
    const profile = await this.usersService.getProfile(req.user.id);
    
    return {
      user,
      profile,
    };
  }

  // ОБНОВИТЬ ПРОФИЛЬ
  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить свой профиль' })
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  // ПОЛУЧИТЬ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ПО ID (публичный)
  @Get(':id')
  @ApiOperation({ summary: 'Получить публичный профиль пользователя' })
  async getUserPublicProfile(@Param('id') userId: string) {
    const user = await this.usersService.findById(parseInt(userId));
    const profile = await this.usersService.getProfile(parseInt(userId));
    
    return {
      id: user.id,
      username: user.username,
      profile: {
        avatar_url: profile?.avatar_url,
        bio: profile?.bio,
      },
      created_at: user.created_at,
    };
  }

  // ПОЛУЧИТЬ СТАТИСТИКУ ПОЛЬЗОВАТЕЛЯ
  @Get(':id/stats')
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  async getUserStats(@Param('id') userId: string) {
    const user = await this.usersService.findById(parseInt(userId));
    const profile = await this.usersService.getProfile(parseInt(userId));
    
    return {
      userId: user.id,
      username: user.username,
      joinedAt: user.created_at,
      profile: profile || {},
      stats: await this.usersService.getUsersStats(),
    };
  }

  @Get('me/games')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiOperation({ summary: 'Получить все игры пользователя' })
async getUserGames(@Req() req) {
  const userId = req.user.id;
  
  const games = await this.preferencesService.getUserGames(userId);
  
  return {
    success: true,
    count: games.length,
    games
  };
}
}