export interface UserGenrePreference {
  id: number;
  user_id: number;
  genre_id: number;
  genre_name: string;
  weight: number;
  interaction_count: number;
  like_count: number;
  dislike_count: number;
  last_interaction: string;
}