
jest.mock('./rawg-proxy', () => ({
  fetchFromRawgProxy: jest.fn(),
}));

import { GamesService } from './games.service';
import { fetchFromRawgProxy } from './rawg-proxy';

describe('GamesService', () => {
  let service: GamesService;

  const supabaseService = {};
  const httpService = {};
  const configService = {};

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GamesService(
      supabaseService as any,
      httpService as any,
      configService as any,
    );
  });

  describe('getGames', () => {
    it('should return processed games', async () => {
      (fetchFromRawgProxy as jest.Mock).mockResolvedValue({
        count: 1,
        results: [
          {
            id: 1,
            slug: 'witcher-3',
            name: 'Witcher 3',
            rating: 4.8,
            background_image: 'image.jpg',
            ratings_count: 1000,
            added: 500,
          },
        ],
      });

      jest
        .spyOn(service as any, 'processGamesForQuality')
        .mockReturnValue([
          {
            id: 1,
            slug: 'witcher-3',
            name: 'Witcher 3',
            rating: 4.8,
            background_image: 'image.jpg',
          },
        ]);

      const result = await service.getGames();

      expect(fetchFromRawgProxy).toHaveBeenCalled();
      expect(result.results.length).toBe(1);
    });

    it('should pass filters to RAWG request', async () => {
      (fetchFromRawgProxy as jest.Mock).mockResolvedValue({
        results: [],
      });

      jest
        .spyOn(service as any, 'processGamesForQuality')
        .mockReturnValue([]);

      await service.getGames(1, 20, 'witcher', '-rating', {
        genres: 'action',
      });

      expect(fetchFromRawgProxy).toHaveBeenCalledWith(
        httpService,
        'games',
        expect.objectContaining({
          search: 'witcher',
          genres: 'action',
        }),
      );
    });
  });
});
