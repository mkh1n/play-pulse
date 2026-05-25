import { Test, TestingModule } from '@nestjs/testing';

import { SwipesController } from './swipes.controller';
import { SwipesService } from './swipes.service';
import { PreferencesService } from '../preferences/preferences.service';

describe('SwipesController', () => {
  let controller: SwipesController;

  const swipesService = {
    getRandomGamesForSwipes: jest.fn(),
  };

  const preferencesService = {
    processGameAction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [SwipesController],
        providers: [
          {
            provide: SwipesService,
            useValue: swipesService,
          },
          {
            provide: PreferencesService,
            useValue: preferencesService,
          },
        ],
      }).compile();

    controller = module.get<SwipesController>(SwipesController);
  });

  it('returns swipe games and parses excluded game ids', async () => {
    swipesService.getRandomGamesForSwipes.mockResolvedValue([
      { id: 10 },
      { id: 11 },
    ]);

    await expect(
      controller.getSwipeGames(
        { user: { id: 99 } },
        '2',
        '1, 2, nope, 3',
      ),
    ).resolves.toEqual({
      success: true,
      games: [{ id: 10 }, { id: 11 }],
      hasMore: true,
    });

    expect(swipesService.getRandomGamesForSwipes).toHaveBeenCalledWith(
      99,
      2,
      [1, 2, 3],
    );
  });

  it('rejects an empty batch payload without touching preferences', async () => {
    await expect(
      controller.processBatchSwipeActions(
        { user: { id: 99 } },
        { actions: [] },
      ),
    ).resolves.toEqual({
      success: false,
      error: 'Invalid payload: expected array of actions',
    });

    expect(preferencesService.processGameAction).not.toHaveBeenCalled();
  });

  it('processes batch swipe actions and reports per-item failures', async () => {
    preferencesService.processGameAction
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('database error'));

    const result = await controller.processBatchSwipeActions(
      { user: { id: 99 } },
      {
        actions: [
          {
            gameId: 10,
            gameName: 'Liked',
            gameImage: 'liked.jpg',
            genres: [],
            tags: [],
            action: 'like',
          },
          {
            gameId: 11,
            gameName: 'Disliked',
            gameImage: 'disliked.jpg',
            genres: [],
            tags: [],
            action: 'dislike',
          },
          {
            gameId: 0,
            gameName: 'Invalid',
            action: 'like',
          },
        ],
      },
    );

    expect(result).toMatchObject({
      success: true,
      processed: 3,
      successCount: 1,
      failCount: 2,
    });
    expect(result.results).toEqual([
      {
        gameId: 10,
        action: 'like',
        success: true,
      },
      {
        gameId: 11,
        action: 'dislike',
        success: false,
        error: 'database error',
      },
      {
        gameId: 0,
        success: false,
        error: 'Invalid action data',
      },
    ]);
    expect(preferencesService.processGameAction).toHaveBeenCalledTimes(2);
  });
});
