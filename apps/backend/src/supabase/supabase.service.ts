import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.constants';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {
    this.logger.log('SupabaseService initialized');
  }

  async onModuleInit() {
    await this.testConnection();
  }

  private async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('user_game_actions')
        .select('count')
        .limit(1);

      if (error) {
        this.logger.error(`Supabase connection test failed: ${error.message}`);
        throw new Error(`Failed to connect to Supabase: ${error.message}`);
      } else {
        this.logger.log('Supabase connection test successful');
      }
    } catch (error: any) {
      this.logger.error(`Supabase connection error: ${error.message}`);
      throw error;
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  from(table: string) {
    this.logger.log(`Accessing table: ${table}`);
    return this.supabase.from(table);
  }
}
