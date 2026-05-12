import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { UsersService } from './users.service';

import { UpdateProfileDto } from './dto/update-profile.dto';

import { PreferencesService } from '../recommendations/preferences.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly preferencesService: PreferencesService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Получить свой профиль',
  })
  async getMyProfile(@Req() req) {
    const user =
      await this.usersService.findById(
        req.user.id,
      );

    const profile =
      await this.usersService.getProfile(
        req.user.id,
      );

    return {
      user,
      profile,
    };
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Обновить профиль',
  })
  async updateProfile(
    @Req() req,
    @Body()
    updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      updateProfileDto,
    );
  }

@Get('me/games')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
async getUserGames(
  @Req() req,
) {
  const games =
    await this.preferencesService.getUserGamesOptimized(
      req.user.id,
    );

  return {
    success: true,
    count:
      games.length,
    games,
  };
}
  @Get(':id')
  @ApiOperation({
    summary:
      'Публичный профиль',
  })
  async getUserPublicProfile(
    @Param('id')
    userId: string,
  ) {
    const parsedId =
      parseInt(userId);

    const user =
      await this.usersService.findById(
        parsedId,
      );

    const profile =
      await this.usersService.getProfile(
        parsedId,
      );

    return {
      id: user.id,
      username:
        user.username,

      profile: {
        avatar_url:
          profile?.avatar_url,

        bio: profile?.bio,
      },

      created_at:
        user.created_at,
    };
  }

  @Get(':id/stats')
  @ApiOperation({
    summary:
      'Статистика пользователя',
  })
  async getUserStats(
    @Param('id')
    userId: string,
  ) {
    const parsedId =
      parseInt(userId);

    const user =
      await this.usersService.findById(
        parsedId,
      );

    const profile =
      await this.usersService.getProfile(
        parsedId,
      );

    return {
      userId: user.id,

      username:
        user.username,

      joinedAt:
        user.created_at,

      profile:
        profile || {},

      stats:
        await this.usersService.getUsersStats(),
    };
  }
}