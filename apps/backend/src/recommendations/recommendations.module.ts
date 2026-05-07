// apps/backend/src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';
import { UsersModule } from '../users/users.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    UsersModule,
    SupabaseModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationService, PreferencesService],
  exports: [RecommendationService, PreferencesService], // Важно для других модулей
})
export class RecommendationsModule {}