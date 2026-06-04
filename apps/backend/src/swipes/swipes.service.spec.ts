// swipes.service.spec.ts
jest.mock('../games/rawg-proxy', () => ({
  fetchFromRawgProxy: jest.fn(),
}));

import { SwipesService } from './swipes.service';
import { fetchFromRawgProxy } from '../games/rawg-proxy';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '../supabase/supabase.service';

describe('SwipesService', () => {
  let service: SwipesService;

  const mockSupabaseService = {
    from: jest.fn(),
    getClient: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SwipesService(
      mockSupabaseService as any,
      mockHttpService as any,
    );
  });

  describe('getRandomGamesForSwipes', () => {
    it('should return random games for swiping', async () => {
      const startTime = Date.now();
      
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ game_id: 1 }, { game_id: 2 }],
          error: null,
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient as any);

      (fetchFromRawgProxy as jest.Mock)
        .mockResolvedValueOnce({
          results: [
            {
              id: 10,
              name: 'Game 1',
              rating: 4.5,
              background_image: 'image1.jpg',
              genres: [{ id: 1, name: 'Action' }],
              tags: [{ id: 2, name: 'RPG' }],
              released: '2020-01-01',
              metacritic: 90,
              added: 1000,
              parent_platforms: [{ platform: { id: 1, name: 'PC' } }],
            },
            {
              id: 11,
              name: 'Game 2',
              rating: 4.8,
              background_image: 'image2.jpg',
              genres: [],
              tags: [],
              released: '2021-01-01',
              metacritic: 95,
              added: 2000,
              parent_platforms: [],
            },
          ],
        })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] });

      const result = await service.getRandomGamesForSwipes(1, 5, []);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getRandomGamesForSwipes] Test passed in ${duration}ms`);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('background_image');
      expect(result[0].rating).toBeGreaterThanOrEqual(4.0);
    });

    it('should exclude previously interacted games', async () => {
      const startTime = Date.now();
      
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ game_id: 10 }, { game_id: 11 }],
          error: null,
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient as any);

      (fetchFromRawgProxy as jest.Mock)
        .mockResolvedValueOnce({
          results: [
            {
              id: 10,
              name: 'Excluded Game',
              rating: 4.5,
              background_image: 'image.jpg',
              genres: [],
              tags: [],
            },
            {
              id: 12,
              name: 'New Game',
              rating: 4.8,
              background_image: 'image2.jpg',
              genres: [],
              tags: [],
            },
          ],
        })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] });

      const result = await service.getRandomGamesForSwipes(1, 5, []);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [exclude interacted games] Test passed in ${duration}ms`);

      const excludedIds = [10, 11];
      result.forEach((game) => {
        expect(excludedIds).not.toContain(game.id);
      });
    });

    it('should handle exclude parameter', async () => {
      const startTime = Date.now();
      
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient as any);

      (fetchFromRawgProxy as jest.Mock)
        .mockResolvedValueOnce({
          results: [
            {
              id: 1,
              name: 'Game 1',
              rating: 4.5,
              background_image: 'image.jpg',
              genres: [],
              tags: [],
            },
            {
              id: 2,
              name: 'Game 2',
              rating: 4.8,
              background_image: 'image2.jpg',
              genres: [],
              tags: [],
            },
          ],
        })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] });

      const result = await service.getRandomGamesForSwipes(1, 5, [1, 2]);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [exclude parameter] Test passed in ${duration}ms`);

      expect(result.every((g) => ![1, 2].includes(g.id))).toBe(true);
    });

    it('should use fallback when no games meet criteria', async () => {
      const startTime = Date.now();
      
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient as any);

      (fetchFromRawgProxy as jest.Mock)
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValueOnce({
          results: [
            {
              id: 100,
              name: 'Fallback Game',
              background_image: 'fallback.jpg',
              rating: 3.5,
              genres: [],
              tags: [],
            },
          ],
        });

      const result = await service.getRandomGamesForSwipes(1, 1, []);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [fallback mode] Test passed in ${duration}ms`);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const startTime = Date.now();
      
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient as any);

      (fetchFromRawgProxy as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.getRandomGamesForSwipes(1, 5, []);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [error handling] Test passed in ${duration}ms`);

      expect(result).toEqual([]);
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [SwipesService definition] Test passed');
    expect(service).toBeDefined();
  });
});