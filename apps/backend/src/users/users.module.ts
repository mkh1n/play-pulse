import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { PreferencesModule } from '@/recommendations/preferences.module';

@Module({
  imports: [SupabaseModule, PreferencesModule],
   // Импортируем SupabaseModule
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}