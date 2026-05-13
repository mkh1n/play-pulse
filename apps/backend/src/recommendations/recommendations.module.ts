// apps/backend/src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, SupabaseModule],
  controllers: [RecommendationsController, PreferencesController],
  providers: [RecommendationService, PreferencesService],
  exports: [RecommendationService, PreferencesService],
})
export class RecommendationsModule {}
