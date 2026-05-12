"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDebounce } from "use-debounce";

import Image from "next/image";

import gameService, {
  Game,
  GameFilters,
  GameSortOption,
} from "@/services/gameService";

import GamesGrid from "@/components/GamesGrid/GamesGrid";
import SearchInput from "@/components/SearchInput/SearchInput";

import styles from "./GamesPage.module.css";

const PAGE_SIZE = 20;

const SEARCH_STORAGE_KEY =
  "explore_search_state_v2";

interface Genre {
  id: number;
  name: string;
}

interface Platform {
  id: number;
  name: string;
}

interface SavedState {
  query: string;
  genres: number[];
  platforms: number[];
  sortBy: GameSortOption;
}

const DEFAULT_SORT: GameSortOption =
  "-rating";

const loadState = (): SavedState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(
      SEARCH_STORAGE_KEY,
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveState = (
  state: SavedState,
) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    SEARCH_STORAGE_KEY,
    JSON.stringify(state),
  );
};

export default function GamePageContent() {
  // ============================================================================
  // REFS
  // ============================================================================

  const observerRef =
    useRef<IntersectionObserver | null>(
      null,
    );

  const sentinelRef =
    useRef<HTMLDivElement>(null);

  const filtersRef =
    useRef<HTMLDivElement>(null);

  const toggleButtonRef =
    useRef<HTMLButtonElement>(null);

  const isFetchingRef = useRef(false);

  const initializedRef = useRef(false);

  // ============================================================================
  // INITIAL STATE
  // ============================================================================

  const saved =
    typeof window !== "undefined"
      ? loadState()
      : null;

  const [rawQuery, setRawQuery] =
    useState(saved?.query || "");

  const [debouncedQuery] =
    useDebounce(rawQuery, 500);

  const [selectedGenres, setSelectedGenres] =
    useState<number[]>(
      saved?.genres || [],
    );

  const [
    selectedPlatforms,
    setSelectedPlatforms,
  ] = useState<number[]>(
    saved?.platforms || [],
  );

  const [sortBy, setSortBy] =
    useState<GameSortOption>(
      saved?.sortBy || DEFAULT_SORT,
    );

  const [genres, setGenres] = useState<
    Genre[]
  >([]);

  const [platforms, setPlatforms] =
    useState<Platform[]>([]);

  const [games, setGames] = useState<
    Game[]
  >([]);

  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [isFiltersOpen, setIsFiltersOpen] =
    useState(false);

  const query = debouncedQuery.trim();

  // ============================================================================
  // MEMOIZED FILTERS
  // ============================================================================

  const filters: GameFilters = useMemo(
    () => ({
      search: query || undefined,

      genres:
        selectedGenres.length > 0
          ? selectedGenres.join(",")
          : undefined,

      platforms:
        selectedPlatforms.length > 0
          ? selectedPlatforms.join(",")
          : undefined,
    }),
    [
      query,
      selectedGenres,
      selectedPlatforms,
    ],
  );

  // ============================================================================
  // SAVE STATE
  // ============================================================================

  useEffect(() => {
    saveState({
      query: rawQuery,
      genres: selectedGenres,
      platforms: selectedPlatforms,
      sortBy,
    });
  }, [
    rawQuery,
    selectedGenres,
    selectedPlatforms,
    sortBy,
  ]);

  // ============================================================================
  // UPDATE URL WITHOUT RERENDER
  // ============================================================================

  const updateUrl = useCallback(() => {
    const params =
      new URLSearchParams();

    if (query) {
      params.set("search", query);
    }

    if (selectedGenres.length) {
      params.set(
        "genres",
        selectedGenres.join(","),
      );
    }

    if (selectedPlatforms.length) {
      params.set(
        "platforms",
        selectedPlatforms.join(","),
      );
    }

    if (sortBy !== DEFAULT_SORT) {
      params.set("sort", sortBy);
    }

    const nextUrl = params.toString()
      ? `/games?${params.toString()}`
      : "/games";

    window.history.replaceState(
      {},
      "",
      nextUrl,
    );
  }, [
    query,
    selectedGenres,
    selectedPlatforms,
    sortBy,
  ]);

  // ============================================================================
  // LOAD METADATA
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    const loadMetadata = async () => {
      try {
        const [genresRes, platformsRes] =
          await Promise.all([
            fetch("/api/games/genres", {
              cache: "force-cache",
            }).then((r) => r.json()),

            fetch(
              "/api/games/platforms",
              {
                cache: "force-cache",
              },
            ).then((r) => r.json()),
          ]);

        if (!mounted) {
          return;
        }

        setGenres(genresRes || []);
        setPlatforms(platformsRes || []);
      } catch (error) {
        console.error(
          "Metadata error:",
          error,
        );
      }
    };

    loadMetadata();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================================
  // FETCH GAMES
  // ============================================================================

const fetchGames = useCallback(
  async (
    targetPage: number,
    append = false,
  ) => {
    try {
      if (targetPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response =
        await gameService(
          filters,
          targetPage,
          PAGE_SIZE,
          sortBy,
        );

      const nextGames =
        response.results || [];

      setGames((prev) => {
        if (!append) {
          return nextGames;
        }

        const existingIds =
          new Set(
            prev.map((g) => g.id),
          );

        const unique =
          nextGames.filter(
            (g) =>
              !existingIds.has(g.id),
          );

        return [...prev, ...unique];
      });

      setHasMore(
        Boolean(response.next),
      );

      setPage(targetPage);
    } catch (error) {
      console.error(
        "Failed to fetch games:",
        error,
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  },
  [filters, sortBy],
);



  // ============================================================================
  // INITIAL + FILTER FETCH
  // ============================================================================

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    setGames([]);
    setPage(1);
    setHasMore(true);

    updateUrl();

    fetchGames(1, false);
  }, [
    filters,
    sortBy,
    fetchGames,
    updateUrl,
  ]);

  // ============================================================================
  // INFINITE SCROLL
  // ============================================================================
const pageRef = useRef(page);
const hasMoreRef = useRef(hasMore);
const loadingRef = useRef(loading);
const loadingMoreRef = useRef(loadingMore);

useEffect(() => {
  pageRef.current = page;
}, [page]);

useEffect(() => {
  hasMoreRef.current = hasMore;
}, [hasMore]);

useEffect(() => {
  loadingRef.current = loading;
}, [loading]);

useEffect(() => {
  loadingMoreRef.current = loadingMore;
}, [loadingMore]);

useEffect(() => {
  const sentinel = sentinelRef.current;

  if (!sentinel) {
    return;
  }

  const observer = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) {
        return;
      }

      if (loadingRef.current) {
        return;
      }

      if (loadingMoreRef.current) {
        return;
      }

      if (!hasMoreRef.current) {
        return;
      }

      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      try {
        const nextPage =
          pageRef.current + 1;

        await fetchGames(
          nextPage,
          true,
        );

        setPage(nextPage);
      } finally {
        isFetchingRef.current = false;
      }
    },
    {
      root: null,
      rootMargin: "300px",
      threshold: 0,
    },
  );

  observer.observe(sentinel);

  return () => {
    observer.disconnect();
  };
}, []);



  // ============================================================================
  // CLOSE FILTERS
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        !isFiltersOpen
      ) {
        return;
      }

      if (
        filtersRef.current &&
        !filtersRef.current.contains(
          event.target as Node,
        ) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, [isFiltersOpen]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const toggleGenre = (
    id: number,
  ) => {
    setSelectedGenres((prev) =>
      prev.includes(id)
        ? prev.filter(
            (g) => g !== id,
          )
        : [...prev, id],
    );
  };

  const togglePlatform = (
    id: number,
  ) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id)
        ? prev.filter(
            (p) => p !== id,
          )
        : [...prev, id],
    );
  };

  const clearFilters = () => {
    setRawQuery("");
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSortBy(DEFAULT_SORT);
  };

  // ============================================================================
  // SORT OPTIONS
  // ============================================================================

  const sortOptions = [
    {
      value: "-added",
      label: "По популярности",
    },

    {
      value: "-rating",
      label: "По рейтингу",
    },

    {
      value: "-released",
      label: "По дате выхода",
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.container}>
      <div
        className={
          styles.exploreContainer
        }
      >
        <div className={styles.header}>
          <SearchInput
            onInput={setRawQuery}
            initialValue={rawQuery}
          />

          <div
            className={
              styles.controlsRow
            }
          >
            <div
              className={
                styles.leftControls
              }
            >
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target
                      .value as GameSortOption,
                  )
                }
                className={
                  styles.sortSelect
                }
              >
                {sortOptions.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>

              <button
                ref={
                  toggleButtonRef
                }
                onClick={() =>
                  setIsFiltersOpen(
                    (prev) =>
                      !prev,
                  )
                }
                className={
                  styles.filterButton
                }
              >
                <Image
                  src="/icons/filters.svg"
                  alt="filters"
                  width={20}
                  height={20}
                />
              </button>
            </div>

            <div
              ref={filtersRef}
              className={`${styles.filters} ${
                isFiltersOpen
                  ? styles.visible
                  : ""
              }`}
            >
              <div
                className={
                  styles.genresContainer
                }
              >
                {genres.map(
                  (genre) => (
                    <button
                      key={genre.id}
                      onClick={() =>
                        toggleGenre(
                          genre.id,
                        )
                      }
                      className={`${
                        styles.genreTag
                      } ${
                        selectedGenres.includes(
                          genre.id,
                        )
                          ? styles.genreTagActive
                          : ""
                      }`}
                    >
                      {genre.name}
                    </button>
                  ),
                )}
              </div>

              <div
                className={
                  styles.platformsContainer
                }
              >
                {platforms.map(
                  (platform) => (
                    <button
                      key={
                        platform.id
                      }
                      onClick={() =>
                        togglePlatform(
                          platform.id,
                        )
                      }
                      className={`${
                        styles.platformTag
                      } ${
                        selectedPlatforms.includes(
                          platform.id,
                        )
                          ? styles.platformTagActive
                          : ""
                      }`}
                    >
                      {platform.name}
                    </button>
                  ),
                )}
              </div>
            </div>

            <button
              onClick={clearFilters}
              className={
                styles.clearButton
              }
            >
              <Image
                src="/icons/clear.svg"
                alt="clear"
                width={20}
                height={20}
              />
            </button>
          </div>
        </div>

        <div
          className={
            styles.gamesGridContainer
          }
        >
          <GamesGrid
            games={games}
          />
        </div>

        {loading &&
          games.length === 0 && (
            <div
              className={
                styles.loading
              }
            >
              Загрузка игр...
            </div>
          )}

        {loadingMore && (
          <div
            className={
              styles.loadingMore
            }
          >
            Загружаем ещё...
          </div>
        )}

        {!loading &&
          games.length === 0 && (
            <div
              className={
                styles.endMessage
              }
            >
              Ничего не найдено
            </div>
          )}

        {!hasMore &&
          games.length > 0 && (
            <div
              className={
                styles.endMessage
              }
            >
              Показаны все игры (
              {games.length})
            </div>
          )}

        <div
          ref={sentinelRef}
          className={
            styles.sentinel
          }
        />
      </div>
    </div>
  );
}