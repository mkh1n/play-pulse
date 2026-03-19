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

  // Обычные игры (поиск/фильтры)
  const [allGames, setAllGames] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Персонализированные игры ("Для меня")
  const [personalizedGames, setPersonalizedGames] = useState<any[]>([]);
  const [personalizedOffset, setPersonalizedOffset] = useState(0);
  const [hasMorePersonalized, setHasMorePersonalized] = useState(true);
  const [personalizedLoading, setPersonalizedLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Флаги режимов
  const [isPersonalizedMode, setIsPersonalizedMode] = useState(false);

  // Состояние для видимости фильтров
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const query = debouncedQuery.trim();

  // 🔹 Сохранение состояния в localStorage (только для обычного режима)
  useEffect(() => {
    if (!isPersonalizedMode) {
      saveState({
        query: rawQuery,
        genres: selectedGenres,
        platforms: selectedPlatforms,
        sortBy,
        page: currentPage,
      });
    }
  }, [rawQuery, selectedGenres, selectedPlatforms, sortBy, currentPage, isPersonalizedMode]);

  // 🔹 Загрузка метаданных (жанры, платформы)
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

  // 🔹 Загрузка обычных игр (поиск/фильтры)
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

  // 🔹 Загрузка персонализированных игр ("Для меня") с offset
  const fetchPersonalizedGames = useCallback(async (offset: number, append = false) => {
    setPersonalizedLoading(true);
    if (offset > 0) setLoadingMore(true);
    
    try {
      const res = await fetch(
        `/api/recommendations/personalized?limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: 'include' }
      );
      
      const data = await res.json();
      
      if (data.success) {
        if (append) {
          setPersonalizedGames(prev => {
            // 🔥 Фильтруем дубликаты по ID
            const existingIds = new Set(prev.map(g => g.id));
            const newGames = data.recommendations.filter((g: any) => !existingIds.has(g.id));
            return [...prev, ...newGames];
          });
        } else {
          setPersonalizedGames(data.recommendations);
        }
        // hasMore = true если вернули полный лимит (значит есть ещё)
        setHasMorePersonalized(data.recommendations.length === PAGE_SIZE);
      } else {
        console.warn('Personalized recommendations failed:', data.error);
        // Фолбэк на популярные игры
        const popularRes = await fetch('/api/recommendations/popular?limit=20');
        const popularData = await popularRes.json();
        if (popularData.success) {
          setPersonalizedGames(popularData.games);
          setHasMorePersonalized(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch personalized:', err);
    } finally {
      setLoadingMore(false);
      setPersonalizedLoading(false);
      setLoading(false);
    }
  }, []);

  // 🔹 Переключение режима сортировки
  useEffect(() => {
    if (sortBy === 'for-me') {
      // Включаем режим персонализации
      setIsPersonalizedMode(true);
      setPersonalizedOffset(0);
      setPersonalizedGames([]);
      setHasMorePersonalized(true);
      fetchPersonalizedGames(0, false);
    } else {
      // Обычный режим
      setIsPersonalizedMode(false);
      setAllGames([]);
      setTotalCount(0);
      setHasMore(true);
      setCurrentPage(1);
      fetchGames(1, false);
    }
  }, [sortBy]);

  // 🔹 Обновление обычных игр при изменении фильтров
  useEffect(() => {
    if (isPersonalizedMode) return; // Не делаем ничего в режиме персонализации

    setAllGames([]);
    setTotalCount(0);
    setHasMore(true);
    setCurrentPage(1);

    fetchGames(1, false);

    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortBy !== "-rating" && sortBy !== 'for-me') params.set("sort", sortBy);
    if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
    if (selectedPlatforms.length) params.set("platforms", selectedPlatforms.join(","));

    const newUrl = params.toString() ? `/games?${params}` : "/games";
    router.replace(newUrl, { scroll: false });

  }, [query, selectedGenres, selectedPlatforms, sortBy, isPersonalizedMode]);

  // 🔹 Пагинация для обычных игр
  useEffect(() => {
    if (isPersonalizedMode) return;
    if (currentPage > 1 && hasMore) {
      fetchGames(currentPage, true);
    }
  }, [currentPage, isPersonalizedMode]);

  // 🔹 Бесконечный скролл (универсальный для обоих режимов)
  useEffect(() => {
    const hasMoreItems = isPersonalizedMode ? hasMorePersonalized : hasMore;
    const isLoading = isPersonalizedMode ? personalizedLoading : loadingMore || loading;
    
    if (!hasMoreItems || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (isPersonalizedMode) {
            // Загружаем следующую порцию персонализированных с offset
            const nextOffset = personalizedOffset + PAGE_SIZE;
            setPersonalizedOffset(nextOffset);
            fetchPersonalizedGames(nextOffset, true);
          } else {
            // Обычная пагинация по page
            setCurrentPage(prev => prev + 1);
          }
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
  }, [hasMore, hasMorePersonalized, loadingMore, loading, personalizedLoading, isPersonalizedMode, personalizedOffset]);

  // 🔹 Закрытие фильтров при клике вне области
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

  // 🔹 Закрытие фильтров при скролле
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

  // 🔹 Переключение жанра
  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : [...prev, id]
    );
  };

  // 🔹 Переключение платформы
  const togglePlatform = (id: number) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // 🔹 Показать/скрыть фильтры
  const toggleFilters = () => {
    setIsFiltersOpen((prev) => !prev);
  };

  // 🔹 Сброс всех фильтров
  const clearFilters = () => {
    setRawQuery("");
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSortBy("-rating");
  };

  // 🔹 Опции сортировки
  const sortOptions = [
    { value: "-added", label: "По популярности" },
    { value: "-rating", label: "По рейтингу" },
    { value: "-released", label: "По дате выхода" },
    { value: "for-me", label: "Для меня" },
  ];

  // 🔹 Определяем, какие игры показывать
  const displayedGames = isPersonalizedMode ? personalizedGames : allGames;
  const showLoading = (isPersonalizedMode ? personalizedLoading : loading) && displayedGames.length === 0;
  const showLoadingMore = loadingMore && displayedGames.length > 0;
  const showEndMessage = !isPersonalizedMode 
    ? (!hasMore && allGames.length > 0)
    : (!hasMorePersonalized && personalizedGames.length > 0);
  const endMessageCount = isPersonalizedMode 
    ? personalizedGames.length 
    : totalCount;

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
                disabled={isPersonalizedMode}
                title={isPersonalizedMode ? "Фильтры недоступны в режиме «Для меня»" : "Фильтры"}
              >
                <Image
                  src="/icons/filters.svg"
                  alt="filters"
                  width={20}
                  height={20}
                />
              </button>
            </div>

            {/* Панель фильтров */}
            <div 
              ref={filtersRef}
              className={`${styles.filters} ${isFiltersOpen && !isPersonalizedMode ? styles.visible : ''}`}
              style={{ display: isPersonalizedMode ? 'none' : undefined }}
            >
              <div className={styles.genresContainer}>
                {genresLoading ? (
                  <span className={styles.loadingSmall}>Загрузка жанров...</span>
                ) : (
                  genres.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleGenre(g.id)}
                      className={`${styles.genreTag} ${
                        selectedGenres.includes(g.id)
                          ? styles.genreTagActive
                          : ""
                      }`}
                    >
                      {g.name}
                    </button>
                  ))
                )}
              </div>

              <div className={styles.platformsContainer}>
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`${styles.platformTag} ${
                      selectedPlatforms.includes(p.id)
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
              disabled={isPersonalizedMode}
              title={isPersonalizedMode ? "Недоступно в режиме «Для меня»" : "Сбросить фильтры"}
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

        {/* Заголовок режима "Для меня" */}
        {isPersonalizedMode && (
          <div className={styles.personalizedHeader}>
            <span className={styles.personalizedBadge}>✨ Персональная подборка</span>
            <p className={styles.personalizedHint}>
              Игры подобраны на основе ваших оценок и предпочтений
            </p>
          </div>
        )}

        {/* Сетка игр */}
        <div className={styles.gamesGridContainer}>
          <GamesGrid 
            games={displayedGames} 
            showRecommendationReason={isPersonalizedMode}
          />
        </div>

        {/* Состояния загрузки */}
        {showLoading && (
          <div className={styles.loading}>Загрузка игр...</div>
        )}

        {showLoadingMore && (
          <div className={styles.loadingMore}>Загружаем ещё...</div>
        )}

        {/* Конец списка */}
        {showEndMessage && (
          <div className={styles.endMessage}>
            {isPersonalizedMode 
              ? `Показано ${endMessageCount} персонализированных игр`
              : `Показано все игры (${endMessageCount})`
            }
          </div>
        )}

        {/* Сенсор для бесконечного скролла */}
        <div ref={sentinelRef} className={styles.sentinel} />
      </div>
    </div>
  );
}