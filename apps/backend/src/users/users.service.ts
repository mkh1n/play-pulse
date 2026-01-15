import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from './user.entity';
import { UserProfile } from './user-profile.entity';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(id: number): Promise<User> {
    const { data, error } = await this.supabaseService
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return data;
  }

  async findByLogin(login: string): Promise<User | null> {
    const { data, error } = await this.supabaseService
      .from('users')
      .select('*')
      .eq('login', login)
      .single();

    if (error || !data) return null;
    return data;
  }

  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    const userWithTimestamps = {
      ...userData,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabaseService
      .from('users')
      .insert([userWithTimestamps])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getProfile(userId: number): Promise<UserProfile | null> {
    const { data, error } = await this.supabaseService
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  }

  async createProfile(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const now = new Date().toISOString();
    const profileWithTimestamps = {
      ...profileData,
      total_likes: profileData.total_likes || 0,
      total_dislikes: profileData.total_dislikes || 0,
      total_games_added: profileData.total_games_added || 0,
      preferred_language: profileData.preferred_language || 'ru',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabaseService
      .from('user_profiles')
      .insert([profileWithTimestamps])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data;
  }

  async updateProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(userId);
    
    if (!existing) {
      return this.createProfile({
        user_id: userId,
        preferred_language: 'ru',
        total_likes: 0,
        total_dislikes: 0,
        total_games_added: 0,
        ...profileData,
      });
    }

    const { data, error } = await this.supabaseService
      .from('user_profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  }

  async updateProfileStats(userId: number, updates: {
    total_likes?: number;
    total_dislikes?: number;
    total_games_added?: number;
    favorite_genres?: any[];
    favorite_tags?: any[];
  }): Promise<void> {
    const existing = await this.getProfile(userId);
    
    if (!existing) {
      await this.createProfile({
        user_id: userId,
        preferred_language: 'ru',
        total_likes: updates.total_likes || 0,
        total_dislikes: updates.total_dislikes || 0,
        total_games_added: updates.total_games_added || 0,
        favorite_genres: updates.favorite_genres,
        favorite_tags: updates.favorite_tags,
      });
      return;
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.total_likes !== undefined) {
      updateData.total_likes = (existing.total_likes || 0) + updates.total_likes;
    }
    
    if (updates.total_dislikes !== undefined) {
      updateData.total_dislikes = (existing.total_dislikes || 0) + updates.total_dislikes;
    }
    
    if (updates.total_games_added !== undefined) {
      updateData.total_games_added = (existing.total_games_added || 0) + updates.total_games_added;
    }
    
    if (updates.favorite_genres !== undefined) {
      updateData.favorite_genres = updates.favorite_genres;
    }
    
    if (updates.favorite_tags !== undefined) {
      updateData.favorite_tags = updates.favorite_tags;
    }

    await this.supabaseService
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const { data, error } = await this.supabaseService
      .from('users')
      .select('*')
      .or(`login.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data || [];
  }

  // Добавляем недостающие методы
  async getUserWithProfile(userId: number): Promise<{ user: User; profile: UserProfile | null }> {
    const user = await this.findById(userId);
    const profile = await this.getProfile(userId);
    
    return { user, profile };
  }

  async getUsersStats(): Promise<{ totalUsers: number }> {
    const { count, error } = await this.supabaseService
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { totalUsers: 0 };
    }

    return { totalUsers: count || 0 };
  }
}