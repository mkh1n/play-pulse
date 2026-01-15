import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService], // Важно: экспортируем сервис
})
export class PreferencesModule {}