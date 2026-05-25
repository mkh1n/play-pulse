import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PreferencesService } from '../preferences/preferences.service';

describe('GamesController', () => {
  let controller: GamesController;

  const gamesService = {
    getGames: jest.fn(),
    getGameData: jest.fn(),
    getSimilarGames: jest.fn(),
    getPopularGames: jest.fn(),
  };

  const preferencesService = {
    processGameAction: jest.fn(),
    removeGameAction: jest.fn(),
    processGameRating: jest.fn(),
    getUserAverageRating: jest.fn(),
    getUserGameRating: jest.fn(),
    updateGameCompletionStatus: jest.fn(),
    updatePurchaseStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [GamesController],
        providers: [
          {
            provide: GamesService,
            useValue: gamesService,
          },
          {
            provide: PreferencesService,
            useValue: preferencesService,
          },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
            },
          },
        ],
      }).compile();

    controller = module.get<GamesController>(GamesController);
  });

  it('delegates game list queries with parsed pagination and filters', async () => {
    gamesService.getGames.mockResolvedValue({ results: [] });

    await controller.getAllGames(
      '2',
      '12',
      'elden',
      '-released',
      '4',
      '187',
      '31',
      '2020-01-01,2025-01-01',
      '1',
      '2',
    );

    expect(gamesService.getGames).toHaveBeenCalledWith(
      2,
      12,
      'elden',
      '-released',
      {
        genres: '4',
        platforms: '187',
        tags: '31',
        dates: '2020-01-01,2025-01-01',
        developers: '1',
        publishers: '2',
      },
    );
  });

  it('wraps similar games response in the current API shape', async () => {
    gamesService.getSimilarGames.mockResolvedValue([{ id: 10 }]);

    await expect(controller.getSimilarGames(5, '8')).resolves.toEqual({
      success: true,
      games: [{ id: 10 }],
      source: 'similar',
    });
    expect(gamesService.getSimilarGames).toHaveBeenCalledWith(5, 8);
  });

  it('stores a like with game metadata and user id', async () => {
    preferencesService.processGameAction.mockResolvedValue({ success: true });

    await expect(
      controller.likeGame(
        42,
        {
          gameName: 'Portal 2',
          gameImage: 'portal.jpg',
          genres: [{ id: 7, name: 'Puzzle' }],
          tags: [{ id: 31, name: 'Singleplayer' }],
        },
        { user: { id: 99 } },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: {
        gameId: 42,
        action: 'like',
        userId: 99,
      },
    });

    expect(preferencesService.processGameAction).toHaveBeenCalledWith(
      99,
      42,
      'like',
      'Portal 2',
      'portal.jpg',
      [{ id: 7, name: 'Puzzle' }],
      [{ id: 31, name: 'Singleplayer' }],
    );
  });

  it('rates a game and includes recalculated user average', async () => {
    preferencesService.processGameRating.mockResolvedValue({ updated: true });
    preferencesService.getUserAverageRating.mockResolvedValue(8.5);

    await expect(
      controller.rateGame(
        42,
        {
          rating: 9,
          gameName: 'Portal 2',
          gameImage: 'portal.jpg',
          genres: [],
          tags: [],
        },
        { user: { id: 99 } },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: {
        gameId: 42,
        rating: 9,
        averageRating: 8.5,
      },
    });

    expect(preferencesService.processGameRating).toHaveBeenCalledWith(
      99,
      42,
      9,
      'Portal 2',
      'portal.jpg',
      [],
      [],
    );
  });

  it('updates completion and purchase statuses through preferences service', async () => {
    preferencesService.updateGameCompletionStatus.mockResolvedValue({
      success: true,
    });
    preferencesService.updatePurchaseStatus.mockResolvedValue({
      success: true,
    });

    await controller.updateGameStatus(
      42,
      {
        status: 'completed',
        gameName: 'Portal 2',
        gameImage: 'portal.jpg',
        genres: [],
        tags: [],
      },
      { user: { id: 99 } },
    );

    await controller.updatePurchaseStatus(
      42,
      {
        purchase: 'owned',
        gameName: 'Portal 2',
        gameImage: 'portal.jpg',
        genres: [],
        tags: [],
      },
      { user: { id: 99 } },
    );

    expect(
      preferencesService.updateGameCompletionStatus,
    ).toHaveBeenCalledWith(99, 42, 'completed', 'Portal 2', 'portal.jpg', [], []);
    expect(preferencesService.updatePurchaseStatus).toHaveBeenCalledWith(
      99,
      42,
      'owned',
      'Portal 2',
      'portal.jpg',
      [],
      [],
    );
  });
});
