import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { PreferencesModule } from 'src/recommendations/preferences.module';

@Module({
  imports: [
    HttpModule,
    SupabaseModule,
    ConfigModule,
    PreferencesModule, // Импортируем PreferencesModule
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}