export interface UserProfile {
  id?: number;
  user_id: number;
  avatar_url?: string;
  bio?: string;
  preferred_language: string;
  favorite_genres?: any[];
  favorite_tags?: any[];
  total_likes: number;
  total_dislikes: number;
  total_games_added: number;
  created_at: string;
  updated_at: string;
}