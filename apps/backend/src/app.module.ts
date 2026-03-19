import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-yet';

// Модули
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { RecommendationsModule } from './recommendations/recomendations.module';
import { RequestLoggerMiddleware } from './common/filters/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
     CacheModule.register({
      isGlobal: true,  // ← ЭТО КЛЮЧЕВОЕ
      ttl: 300,        // 5 минут по умолчанию
      max: 100,        // максимум 100 ключей

    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    GamesModule,
    RecommendationsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Логируем все запросы
  }
}