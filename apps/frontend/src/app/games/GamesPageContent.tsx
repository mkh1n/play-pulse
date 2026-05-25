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
import { SkeletonBlock } from "@/components/Skeleton/Skeleton";

import styles from "./GamesPage.module.css";

const PAGE_SIZE = 12;

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

function loadState(): SavedState | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        SEARCH_STORAGE_KEY,
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function saveState(
  state: SavedState,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.setItem(
    SEARCH_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export default function GamePageContent() {
  // =====================================================
  // REFS
  // =====================================================

  const sentinelRef =
    useRef<HTMLDivElement>(
      null,
    );

  const observerRef =
    useRef<IntersectionObserver | null>(
      null,
    );

  const filtersRef =
    useRef<HTMLDivElement>(
      null,
    );

  const toggleButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const isFetchingRef =
    useRef(false);

  const pageRef =
    useRef(1);

  // =====================================================
  // SAVED STATE
  // =====================================================

  const saved =
    typeof window !==
    "undefined"
      ? loadState()
      : null;

  // =====================================================
  // FILTERS
  // =====================================================

  const [rawQuery, setRawQuery] =
    useState(
      saved?.query || "",
    );

  const [debouncedQuery] =
    useDebounce(
      rawQuery,
      500,
    );

  const [
    selectedGenres,
    setSelectedGenres,
  ] = useState<number[]>(
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
      saved?.sortBy ||
        DEFAULT_SORT,
    );

  // =====================================================
  // UI
  // =====================================================

  const [
    isFiltersOpen,
    setIsFiltersOpen,
  ] = useState(false);

  // =====================================================
  // DATA
  // =====================================================

  const [games, setGames] =
    useState<Game[]>([]);

  const [genres, setGenres] =
    useState<Genre[]>([]);

  const [
    platforms,
    setPlatforms,
  ] = useState<Platform[]>(
    [],
  );

  // =====================================================
  // PAGINATION
  // =====================================================

  const [page, setPage] =
    useState(1);

  const [hasMore, setHasMore] =
    useState(true);

  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  // =====================================================
  // QUERY
  // =====================================================

  const query =
    debouncedQuery.trim();

  const filters: GameFilters =
    useMemo(
      () => ({
        search:
          query ||
          undefined,

        genres:
          selectedGenres.length
            ? selectedGenres.join(
                ",",
              )
            : undefined,

        platforms:
          selectedPlatforms.length
            ? selectedPlatforms.join(
                ",",
              )
            : undefined,
      }),
      [
        query,
        selectedGenres,
        selectedPlatforms,
      ],
    );

  // =====================================================
  // SAVE STATE
  // =====================================================

  useEffect(() => {
    saveState({
      query: rawQuery,
      genres:
        selectedGenres,
      platforms:
        selectedPlatforms,
      sortBy,
    });
  }, [
    rawQuery,
    selectedGenres,
    selectedPlatforms,
    sortBy,
  ]);

  // =====================================================
  // UPDATE URL
  // =====================================================

  useEffect(() => {
    const params =
      new URLSearchParams();

    if (query) {
      params.set(
        "search",
        query,
      );
    }

    if (
      selectedGenres.length
    ) {
      params.set(
        "genres",
        selectedGenres.join(
          ",",
        ),
      );
    }

    if (
      selectedPlatforms.length
    ) {
      params.set(
        "platforms",
        selectedPlatforms.join(
          ",",
        ),
      );
    }

    if (
      sortBy !==
      DEFAULT_SORT
    ) {
      params.set(
        "sort",
        sortBy,
      );
    }

    const url =
      params.toString()
        ? `/games?${params.toString()}`
        : "/games";

    window.history.replaceState(
      {},
      "",
      url,
    );
  }, [
    query,
    selectedGenres,
    selectedPlatforms,
    sortBy,
  ]);

  // =====================================================
  // LOAD METADATA
  // =====================================================

  useEffect(() => {
    const load =
      async () => {
        try {
          const [
            genresData,
            platformsData,
          ] =
            await Promise.all([
              fetch(
                "/api/games/genres",
                {
                  cache:
                    "force-cache",
                },
              ).then((r) =>
                r.json(),
              ),

              fetch(
                "/api/games/platforms",
                {
                  cache:
                    "force-cache",
                },
              ).then((r) =>
                r.json(),
              ),
            ]);

          setGenres(
            genresData || [],
          );

          setPlatforms(
            platformsData || [],
          );
        } catch (
          error
        ) {
          console.error(
            error,
          );
        }
      };

    load();
  }, []);

  // =====================================================
  // FETCH GAMES
  // =====================================================

  const fetchGames =
    useCallback(
      async ({
        pageToLoad,
        append = false,
      }: {
        pageToLoad: number;
        append?: boolean;
      }) => {
        try {
          if (append) {
            setLoadingMore(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          const response =
            await gameService(
              filters,
              pageToLoad,
              PAGE_SIZE,
              sortBy,
            );

          const nextGames =
            response.results ||
            [];

          setGames(
            (prev) => {
              if (
                !append
              ) {
                return nextGames;
              }

              const ids =
                new Set(
                  prev.map(
                    (
                      game,
                    ) =>
                      game.id,
                  ),
                );

              const unique =
                nextGames.filter(
                  (
                    game,
                  ) =>
                    !ids.has(
                      game.id,
                    ),
                );

              return [
                ...prev,
                ...unique,
              ];
            },
          );

          setHasMore(
            Boolean(
              response.next,
            ),
          );

          setPage(
            pageToLoad,
          );

          pageRef.current =
            pageToLoad;
        } catch (
          error
        ) {
          console.error(
            error,
          );
        } finally {
          setLoading(
            false,
          );

          setLoadingMore(
            false,
          );
        }
      },
      [filters, sortBy],
    );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    setGames([]);
    setPage(1);
    setHasMore(true);

    pageRef.current = 1;

    fetchGames({
      pageToLoad: 1,
    });
  }, [
    filters,
    sortBy,
    fetchGames,
  ]);

  // =====================================================
  // INFINITE SCROLL
  // =====================================================

  useEffect(() => {
    const sentinel =
      sentinelRef.current;

    if (!sentinel) {
      return;
    }

    observerRef.current =
      new IntersectionObserver(
        async ([entry]) => {
          if (
            !entry.isIntersecting
          ) {
            return;
          }

          if (
            isFetchingRef.current
          ) {
            return;
          }

          if (
            loading ||
            loadingMore
          ) {
            return;
          }

          if (!hasMore) {
            return;
          }

          isFetchingRef.current =
            true;

          try {
            await fetchGames({
              pageToLoad:
                pageRef.current +
                1,

              append: true,
            });
          } finally {
            isFetchingRef.current =
              false;
          }
        },
        {
          rootMargin:
            "400px",
        },
      );

    observerRef.current.observe(
      sentinel,
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [
    fetchGames,
    hasMore,
    loading,
    loadingMore,
  ]);

  // =====================================================
  // CLOSE FILTERS
  // =====================================================

  useEffect(() => {
    const handler = (
      event: MouseEvent,
    ) => {
      if (!isFiltersOpen) {
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
        setIsFiltersOpen(
          false,
        );
      }
    };

    document.addEventListener(
      "mousedown",
      handler,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handler,
      );
    };
  }, [isFiltersOpen]);

  // =====================================================
  // HELPERS
  // =====================================================

  const toggleGenre = (
    id: number,
  ) => {
    setSelectedGenres(
      (prev) =>
        prev.includes(id)
          ? prev.filter(
              (g) =>
                g !== id,
            )
          : [...prev, id],
    );
  };

  const togglePlatform = (
    id: number,
  ) => {
    setSelectedPlatforms(
      (prev) =>
        prev.includes(id)
          ? prev.filter(
              (p) =>
                p !== id,
            )
          : [...prev, id],
    );
  };

  const clearFilters =
    () => {
      setRawQuery("");
      setSelectedGenres([]);
      setSelectedPlatforms(
        [],
      );
      setSortBy(
        DEFAULT_SORT,
      );
    };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className={
        styles.container
      }
    >
      <div
        className={
          styles.exploreContainer
        }
      >
        <div
          className={
            styles.header
          }
        >
          <SearchInput
            onInput={
              setRawQuery
            }
            initialValue={
              rawQuery
            }
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
                value={
                  sortBy
                }
                onChange={(
                  e,
                ) =>
                  setSortBy(
                    e.target
                      .value as GameSortOption,
                  )
                }
                className={
                  styles.sortSelect
                }
              >
                <option value="-added">
                  По популярности
                </option>

                <option value="-rating">
                  По рейтингу
                </option>

                <option value="-released">
                  По дате выхода
                </option>
              </select>

              <button
                ref={
                  toggleButtonRef
                }
                onClick={() =>
                  setIsFiltersOpen(
                    (
                      prev,
                    ) =>
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

            <button
              onClick={
                clearFilters
              }
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
                (
                  platform,
                ) => (
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
                    {
                      platform.name
                    }
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div
          className={
            styles.gamesGridContainer
          }
        >
          {loading &&
          !games.length ? (
            <GamesGridSkeleton count={PAGE_SIZE} />
          ) : (
            <GamesGrid
              games={games}
            />
          )}
        </div>

        {loading &&
          !games.length && null}

        {loadingMore && (
          <GamesGridSkeleton count={4} compact />
        )}

        {!loading &&
          !games.length && (
            <div
              className={
                styles.endMessage
              }
            >
              Ничего не найдено
            </div>
          )}

        {!hasMore &&
          games.length >
            0 && (
            <div
              className={
                styles.endMessage
              }
            >
              Показаны все игры (
              {
                games.length
              }
              )
            </div>
          )}

        <div
          ref={
            sentinelRef
          }
          className={
            styles.sentinel
          }
        />
      </div>
    </div>
  );
}

function GamesGridSkeleton({
  count,
  compact = false,
}: {
  count: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.moreSkeletonGrid : styles.gamesSkeletonGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.gameSkeletonCard}>
          <SkeletonBlock className={styles.gameSkeletonImage} />
          <div className={styles.gameSkeletonContent}>
            <SkeletonBlock className={styles.gameSkeletonTitle} />
            <SkeletonBlock className={styles.gameSkeletonMeta} />
          </div>
        </div>
      ))}
    </div>
  );
}
