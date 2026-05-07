import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { GamesService } from './games.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          GamesService,

          {
            provide: SupabaseService,
            useValue: {},
          },

          {
            provide: HttpService,
            useValue: {},
          },

          {
            provide: ConfigService,
            useValue: {},
          },
        ],
      }).compile();

    service = module.get<GamesService>(GamesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});