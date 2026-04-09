// apps/backend/src/recommendations/recomendations.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';
import { UsersModule } from '../users/users.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 секунд таймаут
      maxRedirects: 5,
    }),
    UsersModule,
    SupabaseModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationService, PreferencesService],
  exports: [RecommendationService, PreferencesService], // Важно для других модулей
})
export class RecommendationsModule {}