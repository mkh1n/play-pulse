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
import { UsersService } from './users.service';
import { PreferencesService } from '../preferences/preferences.service';
import { UpdateUserDto } from './dto/update-user-dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,

    private readonly preferencesService: PreferencesService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(
    @Req() req,
  ) {
    const user =
      await this.usersService.findById(
        req.user.id,
      );

    const profile =
      await this.usersService.getProfile(
        req.user.id,
      );

    return {
      user: {
        id: user.id,

        login:
          user.login,
          
        created_at:
          user.created_at,
      },

      profile,
    };
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  async updateUser(
    @Req() req,
    @Body()
    dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(
      req.user.id,
      dto,
    );
  }

  @Put('me/profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Req() req,
    @Body()
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      dto,
    );
  }

  @Get('me/games')
  @UseGuards(AuthGuard('jwt'))
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
  async getPublicProfile(
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

      login:
        user.login,

      profile,
    };
  }
}