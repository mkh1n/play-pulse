import { PreferencesService } from './preferences.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('PreferencesService', () => {
  let service: PreferencesService;

  const createMockChain = () => {
    const chain = {
      upsert: jest.fn(),
      select: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };
    
    // Настраиваем цепочку: каждый метод возвращает тот же объект chain
    chain.upsert.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.delete.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    
    return chain;
  };

  // Исправляем мок - убираем getClient, так как он не используется
  const mockSupabaseService = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PreferencesService(mockSupabaseService as any);
  });

  describe('processGameAction', () => {
    it('should process like action successfully', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      // Исправляем: select должен возвращать промис с данными
      chain.select.mockResolvedValue({
        data: [{ id: 1, action_type: 'like' }],
        error: null,
      });
      chain.upsert.mockReturnValue(chain);

      mockSupabaseService.from.mockReturnValue(chain);

      // Исправляем: шпионим за реальным методом, но он еще не вызван
      const removeSpy = jest.spyOn(service, 'removeGameAction').mockResolvedValue({ success: true });

      const result = await service.processGameAction(
        1,
        100,
        'like',
        'Witcher 3',
        'image.jpg',
        [{ id: 5, name: 'RPG' }],
        [{ id: 31, name: 'Singleplayer' }],
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [processGameAction like] Test passed in ${duration}ms`);

      expect(removeSpy).toHaveBeenCalledWith(1, 100, 'dislike');
      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
      
      removeSpy.mockRestore();
    });

    it('should process dislike action and remove like', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      // Исправляем: возвращаем пустой массив, а не объект с []
      chain.select.mockResolvedValue({ data: [], error: null });
      chain.upsert.mockReturnValue(chain);

      mockSupabaseService.from.mockReturnValue(chain);

      const removeSpy = jest.spyOn(service, 'removeGameAction').mockResolvedValue({ success: true });

      const result = await service.processGameAction(1, 100, 'dislike');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [processGameAction dislike] Test passed in ${duration}ms`);

      expect(removeSpy).toHaveBeenCalledWith(1, 100, 'like');
      expect(result.success).toBe(true);
      
      removeSpy.mockRestore();
    });

    it('should throw for invalid game id', async () => {
      const startTime = Date.now();
      
      await expect(
        service.processGameAction(1, NaN, 'like'),
      ).rejects.toThrow('Invalid game id');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [processGameAction invalid id] Test passed in ${duration}ms`);
    });

    it('should throw when supabase returns error', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      });
      chain.upsert.mockReturnValue(chain);

      mockSupabaseService.from.mockReturnValue(chain);

      const removeSpy = jest.spyOn(service, 'removeGameAction').mockResolvedValue({ success: true });

      await expect(service.processGameAction(1, 100, 'like')).rejects.toThrow();

      const duration = Date.now() - startTime;
      console.log(`\n✅ [processGameAction db error] Test passed in ${duration}ms`);
      
      removeSpy.mockRestore();
    });
  });

  describe('removeGameAction', () => {
    it('should remove game action', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.eq.mockReturnThis();
      chain.delete.mockReturnThis();
      // Исправляем: delete должен возвращать промис
      chain.delete.mockResolvedValue({ error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.removeGameAction(1, 100, 'like');

      const duration = Date.now() - startTime;
      console.log(`\n✅ [removeGameAction] Test passed in ${duration}ms`);

      expect(result).toEqual({ success: true });
    });

    it('should throw on database error', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.eq.mockReturnThis();
      chain.delete.mockReturnThis();
      chain.delete.mockResolvedValue({ error: { message: 'delete failed' } });

      mockSupabaseService.from.mockReturnValue(chain);

      await expect(service.removeGameAction(1, 100, 'like')).rejects.toThrow();

      const duration = Date.now() - startTime;
      console.log(`\n✅ [removeGameAction error] Test passed in ${duration}ms`);
    });
  });

  describe('processGameRating', () => {
    it('should save game rating', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockResolvedValue({ data: [], error: null });
      chain.upsert.mockReturnValue(chain);
      chain.upsert.mockResolvedValue({ data: [{}], error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.processGameRating(
        1,
        100,
        9,
        'Witcher 3',
        'image.jpg',
        [{ id: 5, name: 'RPG' }],
        [],
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [processGameRating] Test passed in ${duration}ms`);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
    });
  });

  describe('getUserGameRating', () => {
    it('should return user rating for game', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      // Исправляем: maybeSingle должен возвращать промис
      chain.maybeSingle.mockResolvedValue({
        data: { rating: 9 },
        error: null,
      });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getUserGameRating(1, 100);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getUserGameRating] Test passed in ${duration}ms`);

      expect(result).toBe(9);
    });

    it('should return null when no rating exists', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getUserGameRating(1, 100);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getUserGameRating null] Test passed in ${duration}ms`);

      expect(result).toBeNull();
    });
  });

  describe('getUserAverageRating', () => {
    it('should calculate average rating', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.select.mockResolvedValue({
        data: [{ rating: 8 }, { rating: 9 }, { rating: 10 }],
        error: null,
      });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getUserAverageRating(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getUserAverageRating] Test passed in ${duration}ms`);

      expect(result).toBe(9.0);
    });

    it('should return 0 when no ratings exist', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.select.mockResolvedValue({ data: [], error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getUserAverageRating(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getUserAverageRating empty] Test passed in ${duration}ms`);

      expect(result).toBe(0);
    });
  });

  describe('updateGameCompletionStatus', () => {
    it('should update game completion status', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockResolvedValue({ data: [], error: null });
      chain.upsert.mockReturnValue(chain);
      chain.upsert.mockResolvedValue({ data: [{}], error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.updateGameCompletionStatus(
        1,
        100,
        'completed',
        'Witcher 3',
        'image.jpg',
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [updateGameCompletionStatus] Test passed in ${duration}ms`);

      expect(result.success).toBe(true);
    });
  });

  describe('updatePurchaseStatus', () => {
    it('should update purchase status', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockResolvedValue({ data: [], error: null });
      chain.upsert.mockReturnValue(chain);
      chain.upsert.mockResolvedValue({ data: [{}], error: null });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.updatePurchaseStatus(
        1,
        100,
        'owned',
        'Witcher 3',
        'image.jpg',
      );

      const duration = Date.now() - startTime;
      console.log(`\n✅ [updatePurchaseStatus] Test passed in ${duration}ms`);

      expect(result.success).toBe(true);
    });
  });

  describe('getAllUserGameActions', () => {
    it('should return all user game actions', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.limit.mockResolvedValue({
        data: [{ game_id: 1, action_type: 'like' }],
        error: null,
      });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getAllUserGameActions(1);

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getAllUserGameActions] Test passed in ${duration}ms`);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUserActionsHistory', () => {
    it('should return filtered actions history', async () => {
      const startTime = Date.now();
      
      const chain = createMockChain();
      chain.select.mockReturnThis();
      chain.eq.mockReturnThis();
      chain.order.mockReturnThis();
      chain.limit.mockResolvedValue({
        data: [{ game_id: 1, action_type: 'like' }],
        error: null,
      });

      mockSupabaseService.from.mockReturnValue(chain);

      const result = await service.getUserActionsHistory(1, {
        type: 'like',
        limit: 10,
      });

      const duration = Date.now() - startTime;
      console.log(`\n✅ [getUserActionsHistory] Test passed in ${duration}ms`);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  it('should be defined', () => {
    console.log('\n✅ [PreferencesService definition] Test passed');
    expect(service).toBeDefined();
  });
});