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
  is_cached: boolean;
  created_at: string;
  updated_at: string;
}