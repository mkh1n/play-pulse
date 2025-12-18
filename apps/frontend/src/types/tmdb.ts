// Базовые типы для TMDB API
export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
  video?: boolean;
  genre_ids?: number[]; // <-- Добавьте это поле
  original_language?: string;
  media_type?: "movie" | "tv" | "person";
  known_for_department?: string;
  gender?: number;
  known_for?: Array<{
    title?: string;
    name?: string;
  }>;
}
export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  video: boolean;
  genre_ids: number[];
  original_language: string;
  media_type?: "movie";
}

export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  type: string;
  media_type?: "tv";
}

export interface Person {
  id: number;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  adult: boolean;
  known_for_department: string;
  gender: number;
  media_type?: "person";
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieDetails extends Movie {
  budget: number;
  revenue: number;
  runtime: number;
  status: string;
  tagline: string;
  genres: Genre[];
  homepage: string;
  imdb_id: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  spoken_languages: SpokenLanguage[];
}

export interface TVShowDetails extends TVShow {
  episode_run_time: number[];
  genres: Genre[];
  homepage: string;
  in_production: boolean;
  languages: string[];
  networks: Network[];
  origin_country: string[];
  production_companies: ProductionCompany[];
  seasons: Season[];
  type: string;
}

export interface Credits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Videos {
  id: number;
  results: Video[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  air_date: string;
  episode_count: number;
}

export interface GenreList {
  genres: Genre[];
}