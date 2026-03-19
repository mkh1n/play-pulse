export interface Game {
  id: number;
  rawg_id: number;
  name: string;
  slug?: string;
  released?: string;
  description?: string;
  description_raw?: string;
  background_image?: string;
  website?: string;
  rating?: number;
  rating_top?: number;
  metacritic?: number;
  playtime?: number;
  genres?: any[];
  tags?: any[];
  platforms?: any[];
  developers?: any[];
  publishers?: any[];
  trailers?: any[];
  screenshots?: any[];
  reddit_url?: String,
  metacritic_url: String,
  tba: String,
  is_cached: boolean;
  created_at: string;
  updated_at: string;
}