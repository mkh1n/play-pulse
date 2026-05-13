import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [HttpModule, SupabaseModule, ConfigModule, RecommendationsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
