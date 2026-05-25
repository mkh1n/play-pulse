
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;

  const chain = {
    upsert: jest.fn().mockReturnThis(),
    select: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };

  const supabaseService = {
    from: jest.fn(() => chain),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PreferencesService(supabaseService as any);
  });

  describe('processGameAction', () => {
    it('should process like action', async () => {
      jest
        .spyOn(service, 'removeGameAction')
        .mockResolvedValue({ success: true });

      chain.select.mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      const result = await service.processGameAction(
        1,
        100,
        'like',
        'Witcher 3',
      );

      expect(service.removeGameAction).toHaveBeenCalledWith(
        1,
        100,
        'dislike',
      );

      expect(chain.upsert).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw for invalid game id', async () => {
      await expect(
        service.processGameAction(1, NaN, 'like'),
      ).rejects.toThrow('Invalid game id');
    });

    it('should throw when supabase returns error', async () => {
      jest
        .spyOn(service, 'removeGameAction')
        .mockResolvedValue({ success: true });

      chain.select.mockResolvedValue({
        data: null,
        error: {
          message: 'db error',
        },
      });

      await expect(
        service.processGameAction(1, 100, 'like'),
      ).rejects.toThrow();
    });
  });

  describe('removeGameAction', () => {
    it('should remove action', async () => {
      chain.eq.mockReturnThis();
      chain.delete.mockReturnThis();
      chain.eq.mockReturnThis();

      const lastEq = jest.fn().mockResolvedValue({ error: null });
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce({
          eq: lastEq,
        });

      const result = await service.removeGameAction(
        1,
        100,
        'like',
      );

      expect(result).toEqual({ success: true });
    });
  });
});
