// apps/backend/src/games/games.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [
    HttpModule,
    SupabaseModule,
    ConfigModule,
    forwardRef(() => RecommendationsModule),
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}