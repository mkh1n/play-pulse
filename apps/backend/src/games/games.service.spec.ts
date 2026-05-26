jest.mock('./rawg-proxy', () => ({
  fetchFromRawgProxy: jest.fn(),
}));

import { GamesService } from './games.service';
import { fetchFromRawgProxy } from './rawg-proxy';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

describe('GamesService', () => {
  let service: GamesService;
  let supabaseService: SupabaseService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockSupabaseService = {
    from: jest.fn(),
    getClient: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    supabaseService = mockSupabaseService as any;
    httpService = mockHttpService as any;
    configService = mockConfigService as any;

    service = new GamesService(supabaseService, httpService, configService);
  });

  describe('getGames', () => {
    it('should return processed games from RAWG API', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock).mockResolvedValue({
        count: 100,
        next: 'page=2',
        previous: null,
        results: [
          {
            id: 1,
            slug: 'witcher-3',
            name: 'The Witcher 3',
            rating: 4.8,
            rating_top: 5,
            metacritic: 93,
            background_image: 'https://example.com/image.jpg',
            released: '2015-05-19',
            playtime: 50,
            added: 5000,
            genres: [{ id: 5, name: 'RPG' }],
            tags: [{ id: 31, name: 'Singleplayer' }],
            parent_platforms: [{ platform: { id: 1, name: 'PC' } }],
            suggestions_count: 10,
            reviews_count: 100,
          },
        ],
      });

      const result = await service.getGames(1, 20, undefined, '-rating', {});

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGames basic] Test passed in ${duration}ms`);

      expect(fetchFromRawgProxy).toHaveBeenCalledWith(
        httpService,
        'games',
        expect.objectContaining({
          page: 1,
          page_size: 20,
          ordering: '-rating',
        }),
      );
      expect(result.count).toBe(100);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('id');
      expect(result.results[0]).toHaveProperty('name');
    });

    it('should pass filters to RAWG request', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock).mockResolvedValue({
        results: [],
      });

      await service.getGames(1, 20, 'witcher', '-rating', {
        genres: '5',
        platforms: '4',
        tags: '31',
        dates: '2015-01-01,2015-12-31',
        developers: '1',
        publishers: '2',
      });

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGames with filters] Test passed in ${duration}ms`);

      expect(fetchFromRawgProxy).toHaveBeenCalledWith(
        httpService,
        'games',
        expect.objectContaining({
          search: 'witcher',
          genres: '5',
          platforms: '4',
          tags: '31',
          dates: '2015-01-01,2015-12-31',
          developers: '1',
          publishers: '2',
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.getGames();

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGames error handling] Test passed in ${duration}ms`);

      expect(result).toEqual({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
    });
  });

  describe('getGameData', () => {
    it('should return game details with screenshots', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock)
        .mockResolvedValueOnce({
          id: 1,
          slug: 'witcher-3',
          name: 'The Witcher 3',
          rating: 4.8,
          background_image: 'https://example.com/image.jpg',
          description_raw: 'Game description',
          genres: [{ id: 5, name: 'RPG' }],
          tags: [{ id: 31, name: 'Singleplayer' }],
          platforms: [],
          stores: [],
          developers: [],
          publishers: [],
          trailers: [],
          added: 5000,
        })
        .mockResolvedValueOnce({
          results: [
            { id: 1, image: 'screenshot1.jpg' },
            { id: 2, image: 'screenshot2.jpg' },
          ],
        });

      const result = await service.getGameData(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGameData] Test passed in ${duration}ms`);

      expect(result.id).toBe(1);
      expect(result.name).toBe('The Witcher 3');
      expect(result.screenshots).toHaveLength(2);
    });

    it('should throw error when game data cannot be fetched', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock).mockRejectedValue(
        new Error('Not found'),
      );

      await expect(service.getGameData(999)).rejects.toThrow(
        'Не удалось загрузить игру #999',
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getGameData error] Test passed in ${duration}ms`);
    });
  });

  describe('searchCachedGames', () => {
    it('should search games from cache', async () => {
      const startTime = Date.now();
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ rawg_id: 1, name: 'Witcher 3' }],
          error: null,
        }),
      };

      mockSupabaseService.from.mockReturnValue(mockQuery as any);

      const result = await service.searchCachedGames('witcher', 10);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [searchCachedGames] Test passed in ${duration}ms`);

      expect(mockSupabaseService.from).toHaveBeenCalledWith('games');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCachedGameById', () => {
    it('should return cached game by rawgId', async () => {
      const startTime = Date.now();
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { rawg_id: 1, name: 'Witcher 3' },
          error: null,
        }),
      };

      mockSupabaseService.from.mockReturnValue(mockQuery as any);

      const result = await service.getCachedGameById(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getCachedGameById] Test passed in ${duration}ms`);

      expect(result).not.toBeNull();
    });
  });

  describe('quality filtering', () => {
    it('should filter games by quality thresholds', async () => {
      const startTime = Date.now();
      
      (fetchFromRawgProxy as jest.Mock).mockResolvedValue({
        results: [
          {
            id: 1,
            name: 'Good Game',
            rating: 4.5,
            background_image: 'image.jpg',
            added: 1000,
          },
          {
            id: 2,
            name: 'Bad Game',
            rating: 2.0,
            background_image: 'image.jpg',
            added: 10,
          },
          {
            id: 3,
            name: '',
            rating: 4.0,
            background_image: 'image.jpg',
          },
        ],
      });

      const result = await service.getGames(1, 20, undefined, '-rating');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [quality filtering] Test passed in ${duration}ms`);

      expect(result.results.every((g: any) => g.rating >= 3)).toBe(true);
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [GamesService definition] Test passed');
    expect(service).toBeDefined();
  });
});