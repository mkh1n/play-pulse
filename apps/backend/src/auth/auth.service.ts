import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';

import { LoginDto } from './dto/login.dto';

import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{
    user: Omit<User, 'password_hash'>;
    token: string;
  }> {
    const existingUser =
      await this.usersService.findByLogin(
        registerDto.login,
      );

    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }

    const salt =
      await bcrypt.genSalt(10);

    const passwordHash =
      await bcrypt.hash(
        registerDto.password,
        salt,
      );

    const user =
      await this.usersService.create({
        login:
          registerDto.login,

        password_hash:
          passwordHash,
      });

    await this.usersService.createProfile({
      user_id: user.id,

      name:
        registerDto.login,

      preferred_language:
        'ru',

      total_likes: 0,

      total_dislikes: 0,

      total_games_added: 0,
    });

    const token =
      this.generateToken(user);

    const {
      password_hash,
      ...userWithoutPassword
    } = user;

    return {
      user:
        userWithoutPassword,

      token,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{
    user: Omit<User, 'password_hash'>;
    token: string;
  }> {
    const user =
      await this.usersService.findByLogin(
        loginDto.login,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Неверный логин или пароль',
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        loginDto.password,
        user.password_hash,
      );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Неверный логин или пароль',
      );
    }

    const token =
      this.generateToken(user);

    const {
      password_hash,
      ...userWithoutPassword
    } = user;

    return {
      user:
        userWithoutPassword,

      token,
    };
  }

  private generateToken(
    user: User,
  ): string {
    return this.jwtService.sign({
      sub: user.id,

      login:
        user.login,
    });
  }

  async validateUser(
    userId: number,
  ): Promise<User | null> {
    try {
      return await this.usersService.findById(
        userId,
      );
    } catch {
      return null;
    }
  }
}