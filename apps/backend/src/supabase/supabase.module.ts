import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_CONFIG } from './supabase.constants';
import { SupabaseService } from './supabase.service';

@Global() // Делаем модуль глобальным
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_CONFIG,
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('SUPABASE_URL')!,
        key: configService.get<string>('SUPABASE_KEY')!,
        serviceKey: configService.get<string>('SUPABASE_SERVICE_KEY'),
      }),
      inject: [ConfigService],
    },
    {
      provide: SUPABASE_CLIENT,
      useFactory: (config: any) => createClient(config.url, config.key),
      inject: [SUPABASE_CONFIG],
    },
    SupabaseService, // Добавляем SupabaseService в providers
  ],
  exports: [SUPABASE_CLIENT, SupabaseService], // Экспортируем и сервис
})
export class SupabaseModule {}