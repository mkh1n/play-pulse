import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { PreferencesService } from './preferences.service';
import { UsersModule } from '../users/users.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    HttpModule,
    UsersModule,
    SupabaseModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationService, PreferencesService],
  exports: [RecommendationService, PreferencesService],
})
export class RecommendationsModule {}