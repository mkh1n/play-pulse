import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PreferencesService } from '../recommendations/preferences.service';

describe('GamesController', () => {
  let controller: GamesController;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [GamesController],

        providers: [
          {
            provide: GamesService,
            useValue: {
              getGames: jest.fn(),
              getGameData: jest.fn(),
            },
          },

          {
            provide: PreferencesService,
            useValue: {
              processGameAction: jest.fn(),
              removeGameAction: jest.fn(),
              getUserGameActions: jest.fn(),
              processGameRating: jest.fn(),
              getUserAverageRating: jest.fn(),
              getUserGameRating: jest.fn(),
              updateGameCompletionStatus: jest.fn(),
              updatePurchaseStatus: jest.fn(),
            },
          },

          {
            provide: CACHE_MANAGER,
            useValue: {},
          },
        ],
      }).compile();

    controller = module.get<GamesController>(GamesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});