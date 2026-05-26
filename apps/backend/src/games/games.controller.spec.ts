import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { PreferencesService } from '../preferences/preferences.service';

describe('GamesController', () => {
  let controller: GamesController;
  let gamesService: GamesService;
  let preferencesService: PreferencesService;

  const mockGamesService = {
    getGames: jest.fn(),
    getGameData: jest.fn(),
    getSimilarGames: jest.fn(),
    getPopularGames: jest.fn(),
    searchCachedGames: jest.fn(),
    getCachedGameById: jest.fn(),
  };

  const mockPreferencesService = {
    processGameAction: jest.fn(),
    removeGameAction: jest.fn(),
    processGameRating: jest.fn(),
    getUserAverageRating: jest.fn(),
    getUserGameRating: jest.fn(),
    updateGameCompletionStatus: jest.fn(),
    updatePurchaseStatus: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [
        {
          provide: GamesService,
          useValue: mockGamesService,
        },
        {
          provide: PreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    gamesService = module.get<GamesService>(GamesService);
    preferencesService = module.get<PreferencesService>(PreferencesService);
  });

  describe('getAllGames', () => {
    it('should return paginated games list', async () => {
      const startTime = Date.now();
      
      mockGamesService.getGames.mockResolvedValue({
        count: 100,
        results: [{ id: 1, name: 'Game 1' }],
      });

      const result = await controller.getAllGames(
        '1',
        '20',
        'search',
        '-rating',
        '5',
        '4',
        '31',
        '2020-01-01,2025-01-01',
        '1',
        '2',
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getAllGames] Test passed in ${duration}ms`);

      expect(gamesService.getGames).toHaveBeenCalledWith(
        1,
        20,
        'search',
        '-rating',
        {
          genres: '5',
          platforms: '4',
          tags: '31',
          dates: '2020-01-01,2025-01-01',
          developers: '1',
          publishers: '2',
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe('getGameById', () => {
    it('should return game details', async () => {
      const startTime = Date.now();
      
      mockGamesService.getGameData.mockResolvedValue({
        id: 1,
        name: 'The Witcher 3',
      });

      const result = await controller.getGameById(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGameById] Test passed in ${duration}ms`);

      expect(gamesService.getGameData).toHaveBeenCalledWith(1);
      expect(result.name).toBe('The Witcher 3');
    });
  });

  describe('getSimilarGames', () => {
    it('should return similar games', async () => {
      const startTime = Date.now();
      
      mockGamesService.getSimilarGames.mockResolvedValue([
        { id: 2, name: 'Similar Game 1' },
        { id: 3, name: 'Similar Game 2' },
      ]);

      const result = await controller.getSimilarGames(1, '5');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getSimilarGames] Test passed in ${duration}ms`);

      expect(gamesService.getSimilarGames).toHaveBeenCalledWith(1, 5);
      expect(result.success).toBe(true);
      expect(result.games).toHaveLength(2);
      expect(result.source).toBe('similar');
    });
  });

  describe('getPopularGames', () => {
    it('should return popular games', async () => {
      const startTime = Date.now();
      
      mockGamesService.getPopularGames.mockResolvedValue([
        { id: 1, name: 'Popular Game 1' },
      ]);

      const result = await controller.getPopularGames('10');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getPopularGames] Test passed in ${duration}ms`);

      expect(gamesService.getPopularGames).toHaveBeenCalledWith(10);
      expect(result.success).toBe(true);
      expect(result.source).toBe('popular');
    });
  });

  describe('likeGame', () => {
    it('should add game to likes', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.processGameAction.mockResolvedValue({ success: true });

      const result = await controller.likeGame(
        42,
        {
          gameName: 'Portal 2',
          gameImage: 'portal.jpg',
          genres: [{ id: 7, name: 'Puzzle' }],
          tags: [{ id: 31, name: 'Singleplayer' }],
        },
        { user: { id: 99 } },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [likeGame] Test passed in ${duration}ms`);

      expect(preferencesService.processGameAction).toHaveBeenCalledWith(
        99,
        42,
        'like',
        'Portal 2',
        'portal.jpg',
        [{ id: 7, name: 'Puzzle' }],
        [{ id: 31, name: 'Singleplayer' }],
      );
      expect(result.success).toBe(true);
      expect(result.data.action).toBe('like');
    });
  });

  describe('unlikeGame', () => {
    it('should remove like', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.removeGameAction.mockResolvedValue({ success: true });

      const result = await controller.unlikeGame(42, { user: { id: 99 } });

      const duration = Date.now() - startTime;
      console.log(`\n✅ [unlikeGame] Test passed in ${duration}ms`);

      expect(preferencesService.removeGameAction).toHaveBeenCalledWith(
        99,
        42,
        'like',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('dislikeGame', () => {
    it('should add game to dislikes', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.processGameAction.mockResolvedValue({ success: true });

      const result = await controller.dislikeGame(
        42,
        {
          gameName: 'Bad Game',
          gameImage: 'bad.jpg',
          genres: [],
          tags: [],
        },
        { user: { id: 99 } },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [dislikeGame] Test passed in ${duration}ms`);

      expect(preferencesService.processGameAction).toHaveBeenCalledWith(
        99,
        42,
        'dislike',
        'Bad Game',
        'bad.jpg',
        [],
        [],
      );
      expect(result.data.action).toBe('dislike');
    });
  });

  describe('rateGame', () => {
    it('should rate a game', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.processGameRating.mockResolvedValue({ updated: false });
      mockPreferencesService.getUserAverageRating.mockResolvedValue(8.5);

      const result = await controller.rateGame(
        42,
        {
          rating: 9,
          gameName: 'Portal 2',
          gameImage: 'portal.jpg',
          genres: [],
          tags: [],
        },
        { user: { id: 99 } },
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [rateGame] Test passed in ${duration}ms`);

      expect(preferencesService.processGameRating).toHaveBeenCalledWith(
        99,
        42,
        9,
        'Portal 2',
        'portal.jpg',
        [],
        [],
      );
      expect(result.data.averageRating).toBe(8.5);
    });
  });

  describe('updateGameStatus', () => {
    it('should update game completion status', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.updateGameCompletionStatus.mockResolvedValue({
        success: true,
      });

      const result = await controller.updateGameStatus(
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

      const duration = Date.now() - startTime;
      console.log(`\n✅ [updateGameStatus] Test passed in ${duration}ms`);

      expect(
        preferencesService.updateGameCompletionStatus,
      ).toHaveBeenCalledWith(
        99,
        42,
        'completed',
        'Portal 2',
        'portal.jpg',
        [],
        [],
      );
      expect(result.data.status).toBe('completed');
    });
  });

  describe('updatePurchaseStatus', () => {
    it('should update purchase status', async () => {
      const startTime = Date.now();
      
      mockPreferencesService.updatePurchaseStatus.mockResolvedValue({
        success: true,
      });

      const result = await controller.updatePurchaseStatus(
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

      const duration = Date.now() - startTime;
      console.log(`\n✅ [updatePurchaseStatus] Test passed in ${duration}ms`);

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

  it('should be defined', () => {
    console.log('\n✅ [GamesController definition] Test passed');
    expect(controller).toBeDefined();
  });
});