import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { SupabaseService } from '../supabase/supabase.service';

import { User } from './user.entity';

import { UserProfile } from './user-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async findById(
    id: number,
  ): Promise<User> {
    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
      throw new NotFoundException(
        `User with ID ${id} not found`,
      );
    }

    return data;
  }

  async findByLogin(
    login: string,
  ): Promise<User | null> {
    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('users')
        .select('*')
        .eq('login', login)
        .single();

    if (error || !data)
      return null;

    return data;
  }

  async create(
    userData: Omit<
      User,
      'id' |
      'created_at' |
      'updated_at'
    >,
  ): Promise<User> {
    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('users')
        .insert({
          ...userData,

          created_at:
            now,

          updated_at:
            now,
        })
        .select()
        .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return data;
  }

  async updateUser(
    userId: number,
    updates: {
      login?: string;

      password?: string;
    },
  ) {
    const updateData: any = {
      updated_at:
        new Date().toISOString(),
    };

    if (updates.login) {
      updateData.login =
        updates.login;
    }

    if (updates.password) {
      updateData.password_hash =
        await bcrypt.hash(
          updates.password,
          10,
        );
    }

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select(`
          id,
          login,
          created_at,
          updated_at
        `)
        .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return data;
  }

  async getProfile(
    userId: number,
  ): Promise<UserProfile | null> {
    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error)
      return null;

    return data;
  }

  async createProfile(
    profileData: Omit<
      UserProfile,
      'created_at' |
      'updated_at'
    >,
  ): Promise<UserProfile> {
    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('user_profiles')
        .insert({
          ...profileData,

          created_at:
            now,

          updated_at:
            now,
        })
        .select()
        .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return data;
  }

  async updateProfile(
    userId: number,
    profileData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const existing =
      await this.getProfile(
        userId,
      );

    if (!existing) {
      return this.createProfile({
        user_id: userId,

        name: 'Player',

        preferred_language:
          'ru',

        total_likes: 0,

        total_dislikes: 0,

        total_games_added: 0,

        ...profileData,
      });
    }

    const {
      data,
      error,
    } =
      await this.supabaseService
        .from('user_profiles')
        .update({
          ...profileData,

          updated_at:
            new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return data;
  }

  async getUsersStats(): Promise<{
    totalUsers: number;
  }> {
    const {
      count,
      error,
    } =
      await this.supabaseService
        .from('users')
        .select('*', {
          count: 'exact',
          head: true,
        });

    if (error) {
      return {
        totalUsers: 0,
      };
    }

    return {
      totalUsers:
        count || 0,
    };
  }
}