"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";

import gameService, {
  GameFilters,
  GameSortOption,
} from "@/services/gameService";

import GamesGrid from "@/components/GamesGrid/GamesGrid";
import SearchInput from "@/components/SearchInput/SearchInput";

import Image from "next/image";

import { PARENT_TO_SPECIFIC_PLATFORMS } from "@/lib/platforms";

import styles from "./GamesPage.module.css";

const SEARCH_STORAGE_KEY = "explore_search_state";
const PAGE_SIZE = 20;

interface Genre {
  id: number;
  name: string;
}

interface Platform {
  id: number;
  name: string;
}

const saveState = (state: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
  }
};

const loadState = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(SEARCH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  return null;
};

export default function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtersRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const isFetchingRef = useRef(false);

  const urlQuery = searchParams.get("search") || "";
  const urlGenres = searchParams.get("genres") || "";
  const urlPlatforms = searchParams.get("platforms") || "";
  const urlSort =
    (searchParams.get("sort") as GameSortOption) || "-rating";

  const saved = loadState();

  const [rawQuery, setRawQuery] = useState(
    urlQuery || saved?.query || ""
  );

  const [debouncedQuery] = useDebounce(rawQuery, 400);

  const [selectedGenres, setSelectedGenres] = useState<number[]>(
    urlGenres
      ? urlGenres.split(",").map(Number)
      : saved?.genres || []
  );

  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(() => {
    const fromUrl = urlPlatforms
      ? urlPlatforms.split(",").map(Number)
      : [];

    const fromStorage = saved?.platforms || [];

    const validParentIds = [1, 2, 3, 4, 5, 7];

    const validStorage = fromStorage.filter((id: number) =>
      validParentIds.includes(id)
    );

    return fromUrl.length ? fromUrl : validStorage;
  });

  const [sortBy, setSortBy] = useState<GameSortOption>(
    urlSort !== "-rating"
      ? urlSort
      : saved?.sortBy || "-rating"
  );

  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const [genresLoading, setGenresLoading] = useState(true);

  const [allGames, setAllGames] = useState<any[]>([]);
  const [personalizedGames, setPersonalizedGames] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [personalizedOffset, setPersonalizedOffset] = useState(0);

  const [totalCount, setTotalCount] = useState(0);

  const [hasMore, setHasMore] = useState(true);
  const [hasMorePersonalized, setHasMorePersonalized] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const isPersonalizedMode = sortBy === "for-me";

  const query = debouncedQuery.trim();

  // ============================================================================
  // SAVE STATE
  // ============================================================================

  useEffect(() => {
    if (isPersonalizedMode) return;

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
    isPersonalizedMode,
  ]);

  // ============================================================================
  // LOAD METADATA
  // ============================================================================

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [genresRes, platformsRes] = await Promise.all([
          fetch("/api/games/genres").then((r) => r.json()),
          fetch("/api/games/platforms").then((r) => r.json()),
        ]);

        setGenres(genresRes || []);
        setPlatforms(platformsRes || []);
      } catch (error) {
        console.error("Metadata error:", error);
      } finally {
        setGenresLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // ============================================================================
  // FETCH NORMAL GAMES
  // ============================================================================

  const fetchGames = useCallback(
    async (targetPage: number, append = false) => {
      try {
        if (targetPage === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const specificPlatformIds = selectedPlatforms.flatMap(
          (parentId) =>
            PARENT_TO_SPECIFIC_PLATFORMS[parentId] || []
        );

        const filters: GameFilters = {
          search: query || undefined,
          genres: selectedGenres.length
            ? selectedGenres.join(",")
            : undefined,
          platforms: specificPlatformIds.length
            ? specificPlatformIds.join(",")
            : undefined,
        };

        const res = await gameService(
          filters,
          targetPage,
          PAGE_SIZE,
          sortBy
        );

        const games = res.results || [];

        if (append) {
          setAllGames((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));

            const uniqueGames = games.filter(
              (g: any) => !existingIds.has(g.id)
            );

            return [...prev, ...uniqueGames];
          });
        } else {
          setAllGames(games);
        }

        setTotalCount(res.count || 0);

        // 🔥 FIX
        setHasMore(games.length === PAGE_SIZE);
      } catch (error) {
        console.error("Fetch games error:", error);

        if (!append) {
          setAllGames([]);
          setTotalCount(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, selectedGenres, selectedPlatforms, sortBy]
  );

  // ============================================================================
  // FETCH PERSONALIZED
  // ============================================================================

  const fetchPersonalizedGames = useCallback(
    async (offset: number, append = false) => {
      try {
        if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const res = await fetch(
          `/api/recommendations/personalized?limit=${PAGE_SIZE}&offset=${offset}`,
          {
            credentials: "include",
          }
        );

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed");
        }

        const recommendations = data.recommendations || [];

        if (append) {
          setPersonalizedGames((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));

            const uniqueGames = recommendations.filter(
              (g: any) => !existingIds.has(g.id)
            );

            return [...prev, ...uniqueGames];
          });
        } else {
          setPersonalizedGames(recommendations);
        }

        setHasMorePersonalized(
          recommendations.length === PAGE_SIZE
        );
      } catch (error) {
        console.error("Personalized fetch error:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // ============================================================================
  // RESET WHEN FILTERS CHANGE
  // ============================================================================

  useEffect(() => {
    setPage(1);
    setPersonalizedOffset(0);

    setHasMore(true);
    setHasMorePersonalized(true);

    if (isPersonalizedMode) {
      setPersonalizedGames([]);
      fetchPersonalizedGames(0, false);
    } else {
      setAllGames([]);
      fetchGames(1, false);
    }

    const params = new URLSearchParams();

    if (query) {
      params.set("search", query);
    }

    if (
      sortBy !== "-rating" &&
      sortBy !== "for-me"
    ) {
      params.set("sort", sortBy);
    }

    if (selectedGenres.length) {
      params.set(
        "genres",
        selectedGenres.join(",")
      );
    }

    if (selectedPlatforms.length) {
      params.set(
        "platforms",
        selectedPlatforms.join(",")
      );
    }

    const url = params.toString()
      ? `/games?${params}`
      : "/games";

    router.replace(url, { scroll: false });
  }, [
    query,
    selectedGenres,
    selectedPlatforms,
    sortBy,
    isPersonalizedMode,
    fetchGames,
    fetchPersonalizedGames,
    router,
  ]);

  // ============================================================================
  // INFINITE SCROLL
  // ============================================================================

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;

        if (isFetchingRef.current) return;

        const canLoadMore = isPersonalizedMode
          ? hasMorePersonalized
          : hasMore;

        if (!canLoadMore) return;

        isFetchingRef.current = true;

        try {
          if (isPersonalizedMode) {
            setPersonalizedOffset((prev) => {
              const nextOffset = prev + PAGE_SIZE;
              fetchPersonalizedGames(nextOffset, true);
              return nextOffset;
            });
          } else {
            setPage((prev) => {
              const nextPage = prev + 1;
              fetchGames(nextPage, true);
              return nextPage;
            });
          }
        } finally {
          isFetchingRef.current = false;
        }
      },
      {
        root: null,
        rootMargin: "400px",
        threshold: 0,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [
    page,
    personalizedOffset,
    hasMore,
    hasMorePersonalized,
    isPersonalizedMode,
    fetchGames,
    fetchPersonalizedGames,
  ]);

  // ============================================================================
  // CLOSE FILTERS
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isFiltersOpen &&
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [isFiltersOpen]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : [...prev, id]
    );
  };

  const togglePlatform = (id: number) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  const clearFilters = () => {
    setRawQuery("");
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSortBy("-rating");
  };

  const displayedGames = isPersonalizedMode
    ? personalizedGames
    : allGames;

  const sortOptions = [
    { value: "-added", label: "По популярности" },
    { value: "-rating", label: "По рейтингу" },
    { value: "-released", label: "По дате выхода" },
    { value: "for-me", label: "Для меня" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.exploreContainer}>
        <div className={styles.header}>
          <SearchInput
            onInput={setRawQuery}
            initialValue={rawQuery}
            disabled={isPersonalizedMode}
          />

          <div className={styles.controlsRow}>
            <div className={styles.leftControls}>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as GameSortOption
                  )
                }
                className={styles.sortSelect}
              >
                {sortOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                ref={toggleButtonRef}
                onClick={() =>
                  setIsFiltersOpen((prev) => !prev)
                }
                className={styles.filterButton}
                disabled={isPersonalizedMode}
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
              className={`${styles.filters} ${isFiltersOpen &&
                !isPersonalizedMode
                ? styles.visible
                : ""
                }`}
            >
              <div className={styles.genresContainer}>
                {genresLoading ? (
                  <span>
                    Загрузка жанров...
                  </span>
                ) : (
                  genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() =>
                        toggleGenre(genre.id)
                      }
                      className={`${styles.genreTag} ${selectedGenres.includes(
                        genre.id
                      )
                        ? styles.genreTagActive
                        : ""
                        }`}
                    >
                      {genre.name}
                    </button>
                  ))
                )}
              </div>

              <div
                className={
                  styles.platformsContainer
                }
              >
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() =>
                      togglePlatform(platform.id)
                    }
                    className={`${styles.platformTag} ${selectedPlatforms.includes(
                      platform.id
                    )
                      ? styles.platformTagActive
                      : ""
                      }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearFilters}
              className={styles.clearButton}
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

        {isPersonalizedMode && (
          <div
            className={
              styles.personalizedHeader
            }
          >
            <span
              className={
                styles.personalizedBadge
              }
            >
              ✨ Персональная подборка
            </span>

            <p
              className={
                styles.personalizedHint
              }
            >
              Игры подобраны на основе ваших
              предпочтений
            </p>
          </div>
        )}

        <div className={styles.gamesGridContainer}>
          <GamesGrid
            games={displayedGames}
            showRecommendationReason={
              isPersonalizedMode
            }
          />
        </div>

        {loading && displayedGames.length === 0 && (
          <div className={styles.loading}>
            Загрузка игр...
          </div>
        )}

        {loadingMore && (
          <div className={styles.loadingMore}>
            Загружаем ещё...
          </div>
        )}

        {!loading &&
          displayedGames.length === 0 && (
            <div className={styles.endMessage}>
              Ничего не найдено
            </div>
          )}

        {!hasMore &&
          !isPersonalizedMode &&
          displayedGames.length > 0 && (
            <div className={styles.endMessage}>
              Показаны все игры (
              {displayedGames.length})
            </div>
          )}

        {!hasMorePersonalized &&
          isPersonalizedMode &&
          displayedGames.length > 0 && (
            <div className={styles.endMessage}>
              Показаны все персональные
              рекомендации
            </div>
          )}

        <div
          ref={sentinelRef}
          className={styles.sentinel}
        />
      </div>
    </div>
  );
}