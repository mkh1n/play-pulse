// apps/backend/src/swipes/swipes.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SwipesController } from './swipes.controller';
import { SwipesService } from './swipes.service';
import { PreferencesService } from '../preferences/preferences.service';
import { PreferencesController } from '../preferences/preferences.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    HttpModule, // ← Нужен для запросов к RAWG
    SupabaseModule,
    GamesModule,
  ],
  controllers: [SwipesController, PreferencesController],
  providers: [SwipesService, PreferencesService],
  exports: [SwipesService, PreferencesService],
})
export class SwipesModule {}