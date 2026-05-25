// services/gameService.ts

export type GameFilters = {
  genres?: string;
  platforms?: string;
  tags?: number[];
  dates?: string;
  developers?: number[];
  publishers?: number[];
  search?: string;
};

export interface Deal {
  id?: string;
  name: string;
  seller_name: string;
  seller_rating: number;
  price_rur: number;
  url: string;
  image: string;
}

export interface DealsWithAverage {
  items: Deal[];
  averagePrice: number | null;
}

export type GameSortOption =
  | "name"
  | "released"
  | "added"
  | "created"
  | "updated"
  | "rating"
  | "metacritic"
  | "-name"
  | "-released"
  | "-added"
  | "-created"
  | "-updated"
  | "-rating"
  | "-metacritic"
  | "for-me";

export interface Game {
  id: number;
  slug?: string;

  name: string;

  released: string;

  background_image: string;

  rating: number;

  rating_top: number;

  metacritic: number;

  playtime: number;

  added?: number;

  hybridScore?: number;

  is_cached?: boolean;

  swipesReason?: string;

  platforms: Array<{
    platform: {
      id: number;
      name: string;
    };
  }>;

  genres: Array<{
    id: number;
    name: string;
  }>;

  tags: Array<{
    id: number;
    name: string;
  }>;
}

export interface GamesResponse {
  count: number;

  next: string | null;

  previous: string | null;

  results: Game[];

  error?: string;
}

export interface Screenshot {
  id: number;

  image: string;

  width: number;

  height: number;

  is_deleted: boolean;
}

export interface ScreenshotGalleryProps {
  screenshots?: Array<Screenshot> | null;
}

export interface GameDetails extends Game {
  description: string;

  description_raw: string;

  website: string;

  reddit_url: string;

  metacritic_url: string;

  screenshots: Array<Screenshot>;

  trailers: Array<{
    data: {
      max: string;
    };
  }>;

  esrb_rating: {
    name: string;
  };

  developers: Array<{
    id: number;
    name: string;
  }>;

  publishers: Array<{
    id: number;
    name: string;
  }>;

  stores?: any[];

  parent_platforms?: any[];

  alternative_names?: string[];
}

const API_BASE = "/api";

const RAWG_IMAGE_PROXY =
  "https://playpulse-rawg-proxy.vercel.app/api/image?url=";

// ============================================================================
// HELPERS
// ============================================================================

const buildQueryParams = (
  filters: GameFilters,
  page: number,
  pageSize: number,
  sortBy: GameSortOption,
): string => {
  const params = new URLSearchParams();

  params.set("page", String(page));

  params.set("pageSize", String(pageSize));

  params.set("ordering", sortBy);

  if (filters.search?.trim()) {
    params.set(
      "search",
      filters.search.trim(),
    );
  }

  if (filters.genres?.trim()) {
    params.set(
      "genres",
      filters.genres,
    );
  }

  if (filters.platforms?.trim()) {
    params.set(
      "platforms",
      filters.platforms,
    );
  }

  if (
    filters.tags &&
    filters.tags.length > 0
  ) {
    params.set(
      "tags",
      filters.tags.join(","),
    );
  }

  if (filters.dates) {
    params.set(
      "dates",
      filters.dates,
    );
  }

  if (
    filters.developers &&
    filters.developers.length > 0
  ) {
    params.set(
      "developers",
      filters.developers.join(","),
    );
  }

  if (
    filters.publishers &&
    filters.publishers.length > 0
  ) {
    params.set(
      "publishers",
      filters.publishers.join(","),
    );
  }

  return params.toString();
};

const normalizeGame = (
  game: any,
): Game => {
  return {
    ...game,

    background_image: proxifyImage(
      game.background_image,
    ),

    genres: Array.isArray(game.genres)
      ? game.genres
      : [],

    tags: Array.isArray(game.tags)
      ? game.tags
      : [],

    platforms: Array.isArray(
      game.platforms,
    )
      ? game.platforms
      : [],
  };
};

const normalizeGamesResponse = (
  data: any,
): GamesResponse => {
  return {
    count:
      typeof data?.count === "number"
        ? data.count
        : 0,

    next: data?.next || null,

    previous:
      data?.previous || null,

    results: Array.isArray(
      data?.results,
    )
      ? data.results.map(normalizeGame)
      : [],

    error: data?.error,
  };
};

// ============================================================================
// MAIN GAME SERVICE
// ============================================================================

const gameService = async (
  filters: GameFilters = {},
  page: number = 1,
  pageSize: number = 20,
  sortBy: GameSortOption = "-rating",
): Promise<GamesResponse> => {
  try {
    const query = buildQueryParams(
      filters,
      page,
      pageSize,
      sortBy,
    );

    const url = `${API_BASE}/games?${query}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type":
          "application/json",
      },
    });

    if (!response.ok) {
      const text =
        await response.text();
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const data = await response.json();

    return normalizeGamesResponse(
      data,
    );
  } catch (error) {
    console.error(
      "[gameService] Fetch error:",
      error,
    );
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
      error: "Failed to fetch games",
    };
  }
};

// ============================================================================
// GAME DETAILS
// ============================================================================

export const getGameById = async (
  id: number,
): Promise<GameDetails> => {
  try {
    const response = await fetch(
      `${API_BASE}/games/${id}`,
      {
      },
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const data =
      await response.json();

    return {
      ...data,

      background_image:
        proxifyImage(
          data.background_image,
        ),

      screenshots: Array.isArray(
        data.screenshots,
      )
        ? data.screenshots.map(
            (s: any) => ({
              ...s,

              image: proxifyImage(
                s.image,
              ),
            }),
          )
        : [],
    };
  } catch (error) {
    console.error(
      `[getGameById] Error for ${id}:`,
      error,
    );

    throw error;
  }
};

// ============================================================================
// GENRES
// ============================================================================

export const getGenres = async (): Promise<
  Array<{
    id: number;
    name: string;
  }>
> => {
  try {
    const response = await fetch(
      `${API_BASE}/games/genres`,
      {
        cache: "force-cache",
      },
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`,
      );
    }

    const data =
      await response.json();

    return Array.isArray(data)
      ? data
      : [];
  } catch (error) {
    console.error(
      "[getGenres] Error:",
      error,
    );

    return [];
  }
};

// ============================================================================
// PLATFORMS
// ============================================================================

export const getPlatforms =
  async (): Promise<
    Array<{
      id: number;
      name: string;
    }>
  > => {
    try {
      const response = await fetch(
        `${API_BASE}/games/platforms`,
        {
          cache: "force-cache",
        },
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const data =
        await response.json();

      return Array.isArray(data)
        ? data
        : [];
    } catch (error) {
      console.error(
        "[getPlatforms] Error:",
        error,
      );

      return [];
    }
  };

// ============================================================================
// DEALS
// ============================================================================

export const getDealsWithAverage =
  async (
    name: string,
  ): Promise<DealsWithAverage> => {
    try {
      const response = await fetch(
        `/api/deals?q=${encodeURIComponent(
          name,
        )}`,
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const data =
        await response.json();

      const items: Deal[] =
        Array.isArray(data)
          ? data
          : data.items || [];

      const validPrices = items
        .map((d) => d.price_rur)
        .filter(
          (price) =>
            typeof price ===
              "number" &&
            price > 0,
        );

      const averagePrice =
        validPrices.length > 0
          ? Number(
              (
                validPrices.reduce(
                  (a, b) => a + b,
                  0,
                ) /
                validPrices.length
              ).toFixed(2),
            )
          : null;

      return {
        items,
        averagePrice,
      };
    } catch (error) {
      console.error(
        "[getDealsWithAverage] Error:",
        error,
      );

      return {
        items: [],
        averagePrice: null,
      };
    }
  };

// ============================================================================
// SEARCH
// ============================================================================

export const searchGames =
  async (
    query: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<GamesResponse> => {
    return gameService(
      {
        search: query,
      },
      page,
      pageSize,
    );
  };

// ============================================================================
// POPULAR
// ============================================================================

export const getPopularGames =
  async (
    page: number = 1,
    pageSize: number = 20,
  ): Promise<GamesResponse> => {
    return gameService(
      {},
      page,
      pageSize,
      "-rating",
    );
  };

// ============================================================================
// NEW GAMES
// ============================================================================

export const getNewGames =
  async (
    page: number = 1,
    pageSize: number = 20,
  ): Promise<GamesResponse> => {
    const currentYear =
      new Date().getFullYear();

    return gameService(
      {
        dates: `${currentYear}-01-01,${currentYear}-12-31`,
      },
      page,
      pageSize,
      "-released",
    );
  };

// ============================================================================
// IMAGE PROXY
// ============================================================================

export const proxifyImage = (
  imageUrl?: string | null,
): string => {
  if (
    !imageUrl ||
    imageUrl.trim() === ""
  ) {
    return "/placeholder-game.jpg";
  }

  if (
    imageUrl.includes(
      "/api/image?url=",
    )
  ) {
    return imageUrl;
  }

  return (
    RAWG_IMAGE_PROXY +
    encodeURIComponent(imageUrl)
  );
};
export function renderGameDescription(
  html?: string,
) {
  if (!html) {
    return "";
  }

  return html
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/\n/g, "<br />");
}
export default gameService;