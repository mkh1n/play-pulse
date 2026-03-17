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
  
  // Refs для обработки кликов вне области
  const filtersRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const urlQuery = searchParams.get("search") || "";
  const urlPage = Number(searchParams.get("page") || "1");
  const urlGenres = searchParams.get("genres") || "";
  const urlPlatforms = searchParams.get("platforms") || "";
  const urlSort =
    (searchParams.get("sort") as GameSortOption) || "-rating";

  const saved = loadState();

  const [rawQuery, setRawQuery] = useState(
    urlQuery || saved?.query || ""
  );

  const [debouncedQuery] = useDebounce(rawQuery, 400);

  const [currentPage, setCurrentPage] = useState(
    urlPage > 1 ? urlPage : saved?.page || 1
  );

  const [selectedGenres, setSelectedGenres] = useState<number[]>(
    urlGenres
      ? urlGenres.split(",").map(Number)
      : saved?.genres || []
  );

  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(() => {
    const fromUrl = urlPlatforms ? urlPlatforms.split(",").map(Number) : [];
    const fromStorage = saved?.platforms || [];
    const validParentIds = [1, 2, 3, 4, 5, 7];
    const validFromStorage = fromStorage.filter((id: number) => validParentIds.includes(id));

    return fromUrl.length > 0 ? fromUrl : validFromStorage;
  });

  const [sortBy, setSortBy] = useState<GameSortOption>(
    urlSort !== "-rating" ? urlSort : saved?.sortBy || "-rating"
  );

  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);

  const [allGames, setAllGames] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Состояние для видимости фильтров
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const query = debouncedQuery.trim();

  useEffect(() => {
    saveState({
      query: rawQuery,
      genres: selectedGenres,
      platforms: selectedPlatforms,
      sortBy,
      page: currentPage,
    });
  }, [rawQuery, selectedGenres, selectedPlatforms, sortBy, currentPage]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [genresRes, platformsRes] = await Promise.all([
          fetch("/api/games/genres").then((r) => r.json()),
          fetch("/api/games/platforms").then((r) => r.json()),
        ]);

        setGenres(genresRes || []);
        setPlatforms(platformsRes || []);
      } catch (e) {
        console.error("Metadata error:", e);
      } finally {
        setGenresLoading(false);
      }
    };

    loadMetadata();
  }, []);

  const fetchGames = useCallback(async (page: number, append = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const specificPlatformIds = selectedPlatforms.flatMap(
        (parentId) => PARENT_TO_SPECIFIC_PLATFORMS[parentId] || []
      );

      const filters: GameFilters = {
        search: query || undefined,
        genres: selectedGenres.length ? selectedGenres.join(',') : undefined,
        platforms: specificPlatformIds.length
          ? specificPlatformIds.join(',')
          : undefined,
      };

      const res = await gameService(filters, page, PAGE_SIZE, sortBy);

      if (page === 1) {
        setAllGames(res.results || []);
        setTotalCount(res.count || 0);
      } else if (append) {
        setAllGames(prev => [...prev, ...(res.results || [])]);
      }

      const loadedCount = page * PAGE_SIZE;
      setHasMore(loadedCount < (res.count || 0));

    } catch (err) {
      console.error("Fetch error:", err);
      if (page === 1) {
        setAllGames([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, selectedGenres, selectedPlatforms, sortBy]);

  useEffect(() => {

    setAllGames([]);
    setTotalCount(0);
    setHasMore(true);
    setCurrentPage(1);

    fetchGames(1, false);

    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortBy !== "-rating") params.set("sort", sortBy);
    if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
    if (selectedPlatforms.length) params.set("platforms", selectedPlatforms.join(","));

    const newUrl = params.toString() ? `/games?${params}` : "/games";
    router.replace(newUrl, { scroll: false });

  }, [query, selectedGenres, selectedPlatforms, sortBy]);

  useEffect(() => {
    if (currentPage > 1 && hasMore) {
      fetchGames(currentPage, true);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setCurrentPage(prev => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, loadingMore, loading]);

  // Логика закрытия при клике вне области
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFiltersOpen]);

  // Логика закрытия при скролле
  useEffect(() => {
    const handleScroll = () => {
      if (isFiltersOpen) {
        setIsFiltersOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isFiltersOpen]);

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : [...prev, id]
    );
  };

  const togglePlatform = (id: number) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleFilters = () => {
    setIsFiltersOpen((prev) => !prev);
  };

  const clearFilters = () => {
    setRawQuery("");
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSortBy("-rating");
  };

  const sortOptions = [
    { value: "-rating", label: "По рейтингу ⬇" },
    { value: "rating", label: "По рейтингу ⬆" },
    { value: "-released", label: "По дате выхода ⬇" },
    { value: "released", label: "По дате выхода ⬆" },
    { value: "-added", label: "По популярности ⬇" },
    { value: "added", label: "По популярности ⬆" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.exploreContainer}>
        <div className={styles.header}>
          <SearchInput
            onInput={setRawQuery}
            initialValue={rawQuery}
          />

          <div className={styles.controlsRow}>
            <div className={styles.leftControls}>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as GameSortOption)
                }
                className={styles.sortSelect}
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                ref={toggleButtonRef}
                onClick={toggleFilters}
                className={styles.filterButton}
              >
                <Image
                  src="/icons/filters.svg"
                  alt="clear"
                  width={20}
                  height={20}
                />
              </button>
            </div>

            <div 
              ref={filtersRef}
              className={`${styles.filters} ${isFiltersOpen ? styles.visible : ''}`}
            >
              <div className={styles.genresContainer}>
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`${styles.genreTag} ${selectedGenres.includes(g.id)
                      ? styles.genreTagActive
                      : ""
                      }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <div className={styles.platformsContainer}>
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`${styles.platformTag} ${selectedPlatforms.includes(p.id)
                      ? styles.platformTagActive
                      : ""
                      }`}
                  >
                    {p.name}
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


        <div className={styles.gamesGridContainer}>
          <GamesGrid games={allGames} />

        </div>

        {loading && allGames.length === 0 && (
          <div className={styles.loading}>Загрузка...</div>
        )}

        {loadingMore && (
          <div className={styles.loadingMore}>Загружаем ещё...</div>
        )}

        {!hasMore && allGames.length > 0 && (
          <div className={styles.endMessage}>
            Показано все игры ({totalCount})
          </div>
        )}

        <div ref={sentinelRef} className={styles.sentinel} />
      </div>
    </div>
  );
}