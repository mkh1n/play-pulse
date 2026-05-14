// apps/backend/src/recommendations/recommendations.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    HttpModule, // ← Нужен для запросов к RAWG
    SupabaseModule,
    GamesModule,
  ],
  controllers: [RecommendationsController, PreferencesController],
  providers: [RecommendationService, PreferencesService],
  exports: [RecommendationService, PreferencesService],
})
export class RecommendationsModule {}