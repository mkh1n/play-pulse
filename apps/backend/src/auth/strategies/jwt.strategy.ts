import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  private readonly userCache =
    new Map<
      number,
      {
        user: any;
        expiresAt: number;
      }
    >();

  private readonly CACHE_TTL =
    5 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,

    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.get<string>(
          'JWT_SECRET',
        ) ||
        'your-secret-key-change-this',
    });
  }

  async validate(
    payload: any,
  ) {
    const userId =
      payload.sub;

    // =========================
    // CACHE
    // =========================

    const cached =
      this.userCache.get(
        userId,
      );

    if (
      cached &&
      Date.now() <
        cached.expiresAt
    ) {
      return cached.user;
    }

    // =========================
    // DB
    // =========================

    const user =
      await this.authService.validateUser(
        userId,
      );

    if (!user) {
      throw new UnauthorizedException();
    }

    const normalizedUser =
      {
        id: user.id,

        login:
          user.login,
      };

    // =========================
    // SAVE CACHE
    // =========================

    this.userCache.set(
      userId,
      {
        user:
          normalizedUser,

        expiresAt:
          Date.now() +
          this.CACHE_TTL,
      },
    );

    return normalizedUser;
  }
}