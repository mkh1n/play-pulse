import { Test, TestingModule } from '@nestjs/testing';
import { SwipesController } from './swipes.controller';
import { SwipesService } from './swipes.service';
import { PreferencesService } from '../preferences/preferences.service';

describe('SwipesController', () => {
  let controller: SwipesController;
  let swipesService: SwipesService;
  let preferencesService: PreferencesService;

  const mockSwipesService = {
    getRandomGamesForSwipes: jest.fn(),
  };

  const mockPreferencesService = {
    processGameAction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SwipesController],
      providers: [
        {
          provide: SwipesService,
          useValue: mockSwipesService,
        },
        {
          provide: PreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    controller = module.get<SwipesController>(SwipesController);
    swipesService = module.get<SwipesService>(SwipesService);
    preferencesService = module.get<PreferencesService>(PreferencesService);
  });

  describe('getSwipeGames', () => {
    it('should return swipe games with parsed exclude IDs', async () => {
      const startTime = Date.now();
      
      mockSwipesService.getRandomGamesForSwipes.mockResolvedValue([
        { id: 10, name: 'Game 1' },
        { id: 11, name: 'Game 2' },
      ]);

      const result = await controller.getSwipeGames(
        { user: { id: 99 } },
        '2',
        '1, 2, nope, 3',
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getSwipeGames] Test passed in ${duration}ms`);

      expect(swipesService.getRandomGamesForSwipes).toHaveBeenCalledWith(
        99,
        2,
        [1, 2, 3],
      );
      expect(result.success).toBe(true);
      expect(result.games).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should handle empty exclude parameter', async () => {
      const startTime = Date.now();
      
      mockSwipesService.getRandomGamesForSwipes.mockResolvedValue([
        { id: 10 },
      ]);

      const result = await controller.getSwipeGames(
        { user: { id: 99 } },
        '1',
        undefined,
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getSwipeGames no exclude] Test passed in ${duration}ms`);

      expect(swipesService.getRandomGamesForSwipes).toHaveBeenCalledWith(
        99,
        1,
        [],
      );
    });
  });

  describe('processBatchSwipeActions', () => {
    it('should reject empty batch payload', async () => {
      const startTime = Date.now();
      
      const result = await controller.processBatchSwipeActions(
        { user: { id: 99 } },
        { actions: [] },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [batch empty payload] Test passed in ${duration}ms`);

      expect(result).toEqual({
        success: false,
        error: 'Invalid payload: expected array of actions',
      });
      expect(preferencesService.processGameAction).not.toHaveBeenCalled();
    });

    it('should process batch swipe actions successfully', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.processGameAction
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const result = await controller.processBatchSwipeActions(
        { user: { id: 99 } },
        {
          actions: [
            {
              gameId: 10,
              gameName: 'Liked Game',
              gameImage: 'liked.jpg',
              genres: [],
              tags: [],
              action: 'like',
            },
            {
              gameId: 11,
              gameName: 'Disliked Game',
              gameImage: 'disliked.jpg',
              genres: [],
              tags: [],
              action: 'dislike',
            },
          ],
        },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [batch success] Test passed in ${duration}ms`);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failCount).toBe(0);
      expect(preferencesService.processGameAction).toHaveBeenCalledTimes(2);
    });

    it('should report per-item failures in batch', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.processGameAction
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('database error'));

      const result = await controller.processBatchSwipeActions(
        { user: { id: 99 } },
        {
          actions: [
            {
              gameId: 10,
              gameName: 'Success',
              action: 'like',
            },
            {
              gameId: 11,
              gameName: 'Failed',
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

      const duration = Date.now() - startTime;
      console.log(`\n✅ [batch with failures] Test passed in ${duration}ms`);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(2);
      expect(result.results).toEqual([
        { gameId: 10, action: 'like', success: true },
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
    });

    it('should handle invalid action data', async () => {
      const startTime = Date.now();
      
      const result = await controller.processBatchSwipeActions(
        { user: { id: 99 } },
        {
          actions: [
            {
              gameId: 0,
              gameName: 'Missing action',
            } as any,
          ],
        },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [invalid action data] Test passed in ${duration}ms`);

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Invalid action data');
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [SwipesController definition] Test passed');
    expect(controller).toBeDefined();
  });
});