export interface UserGameAction {
  id: number;
  user_id: number;
  game_id: number;
  game_name: string;
  action_type: 'like' | 'dislike' | 'add_to_favorites' | 'add_to_wishlist' | 'mark_completed' | 'rate';
  rating?: number;
  genres?: any[];
  tags?: any[];
  platforms?: any[];
  game_rating?: number;
  metacritic_score?: number;
  comment?: string;
  created_at: string;
}