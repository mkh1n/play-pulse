export interface UserTagPreference {
  id: number;
  user_id: number;
  tag_id: number;
  tag_name: string;
  weight: number;
  interaction_count: number;
  like_count: number;
  dislike_count: number;
  last_interaction: string;
}