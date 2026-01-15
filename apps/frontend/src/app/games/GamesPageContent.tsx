"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import gameService, { GameFilters, GameSortOption } from "@/services/gameService";
import GamesGrid from "@/components/GamesGrid/GamesGrid";
import SearchInput from "@/components/SearchInput/SearchInput";
import ReactPaginate from "react-paginate";
import Image from "next/image";

import styles from "./GamesPage.module.css";

// Ключ для localStorage
const SEARCH_STORAGE_KEY = "explore_search_state";

// Тип для жанра игры
interface Genre {
  id: number;
  name: string;
}

// Функции для работы с localStorage
const saveSearchState = (state: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
  }
};

const loadSearchState = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(SEARCH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }
  return null;
};

export default function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("search") || "";
  const urlPage = Number(searchParams.get("page") || "1");
  const urlGenres = searchParams.get("genres") || "";
  const urlPlatforms = searchParams.get("platforms") || "";
  const urlSort = (searchParams.get("sort") as GameSortOption) || "-rating";

  // Загружаем сохраненное состояние при инициализации
  const [rawQuery, setRawQuery] = useState(() => {
    const saved = loadSearchState();
    return urlQuery || saved?.query || "";
  });

  const [debouncedQuery] = useDebounce(rawQuery, 400);

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = loadSearchState();
    return urlPage > 1 ? urlPage : saved?.page || 1;
  });

  const [filters, setFilters] = useState<GameFilters>(() => {
    const saved = loadSearchState();
    const initialFilters: GameFilters = {};
    
    if (urlGenres) {
      initialFilters.genres = urlGenres
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
    } else if (saved?.genres) {
      initialFilters.genres = saved.genres;
    }

    if (urlPlatforms) {
      initialFilters.platforms = urlPlatforms
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
    } else if (saved?.platforms) {
      initialFilters.platforms = saved.platforms;
    }

    if (debouncedQuery) {
      initialFilters.search = debouncedQuery;
    }

    return initialFilters;
  });

  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => {
    const saved = loadSearchState();
    if (urlGenres) {
      return urlGenres
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
    }
    return saved?.genres || [];
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>(() => {
    const saved = loadSearchState();
    if (urlPlatforms) {
      return urlPlatforms
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
    }
    return saved?.platforms || [];
  });

  const [sortBy, setSortBy] = useState<GameSortOption>(() => {
    const saved = loadSearchState();
    return urlSort !== "-rating" ? urlSort : saved?.sortBy || "-rating";
  });

  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const query = debouncedQuery.trim();

  // Сохраняем полное состояние при каждом изменении
  useEffect(() => {
    saveSearchState({
      query: rawQuery,
      filters,
      sortBy,
      page: currentPage,
      genres: selectedGenres,
      platforms: selectedPlatforms,
    });
  }, [rawQuery, filters, sortBy, currentPage, selectedGenres, selectedPlatforms]);

  // Загружаем жанры и платформы
 useEffect(() => {
  const loadMetadata = async () => {
    try {
      // Вызываем ваши API-маршруты Next.js
      const [genresResponse, platformsResponse] = await Promise.all([
        fetch('/api/games/genres').then(async (res) => {
          if (!res.ok) {
            throw new Error(`Ошибка загрузки жанров: ${res.status}`);
          }
          return res.json();
        }),
        fetch('/api/games/platforms').then(async (res) => {
          if (!res.ok) {
            throw new Error(`Ошибка загрузки платформ: ${res.status}`);
          }
          return res.json();
        })
      ]);
      
      setGenres(genresResponse || []);
      setPlatforms(platformsResponse || []);
      
      console.log('Загружено жанров:', genresResponse.length);
      console.log('Загружено платформ:', platformsResponse.length);
    } catch (err) {
      console.error('Error loading metadata:', err);
      setGenres([]);
      setPlatforms([]);
    } finally {
      setGenresLoading(false);
    }
  };
  
  loadMetadata();
}, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const updatedFilters: GameFilters = {
        ...filters,
        search: query || undefined,
        genres: selectedGenres.length > 0 ? selectedGenres : undefined,
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      };

      const res = await gameService(
        updatedFilters,
        currentPage,
        20, // pageSize
        sortBy
      );
      setData(res);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query, currentPage, filters, sortBy, selectedGenres, selectedPlatforms]);

  useEffect(() => {
    fetchData();

    // Обновляем URL с параметрами
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (currentPage > 1) params.set("page", currentPage.toString());
    
    if (sortBy !== "-rating") params.set("sort", sortBy);

    if (selectedGenres.length > 0) {
      params.set("genres", selectedGenres.join(","));
    }

    if (selectedPlatforms.length > 0) {
      params.set("platforms", selectedPlatforms.join(","));
    }

    const newUrl = params.toString()
      ? `/games?${params.toString()}`
      : "/games";
    router.replace(newUrl, { scroll: false });
  }, [query, currentPage, filters, sortBy, selectedGenres, selectedPlatforms, fetchData, router]);

  const handleSearch = (value: string) => {
    setRawQuery(value);
    if (value.trim() !== query) {
      setCurrentPage(1);
    }
  };

  const handleGenreToggle = (genreId: number) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      } else {
        const newGenres = [...prev, genreId];
        // Лимит на выбор жанров (например, 3)
        return newGenres.slice(-3);
      }
    });
    setCurrentPage(1);
  };

  const handlePlatformToggle = (platformId: number) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((id) => id !== platformId);
      } else {
        const newPlatforms = [...prev, platformId];
        // Лимит на выбор платформ (например, 3)
        return newPlatforms.slice(-3);
      }
    });
    setCurrentPage(1);
  };

  const handleSortChange = (value: GameSortOption) => {
    setSortBy(value);
  };

  const handlePageChange = ({ selected }: { selected: number }) => {
    const newPage = Math.min(selected + 1, 500);
    setCurrentPage(newPage);
  };

  const handleClearFilters = () => {
    setRawQuery("");
    setCurrentPage(1);
    setFilters({});
    setSelectedGenres([]);
    setSelectedPlatforms([]);
    setSortBy("-rating");
  };

  const handleClearGenres = () => {
    setSelectedGenres([]);
    setCurrentPage(1);
  };

  const handleClearPlatforms = () => {
    setSelectedPlatforms([]);
    setCurrentPage(1);
  };

  const toggleShowAllGenres = () => {
    setShowAllGenres(!showAllGenres);
  };

  const hasGenresSelected = selectedGenres.length > 0;
  const hasPlatformsSelected = selectedPlatforms.length > 0;

  // Жанры для отображения
  const displayedGenres = showAllGenres
    ? genres
    : genres.slice(0, 8); // Первая строка - 8 жанров

  const sortOptions = [
    { value: "-rating", label: "По рейтингу ⬇" },
    { value: "rating", label: "По рейтингу ⬆" },
    { value: "-released", label: "По дате выхода ⬇" },
    { value: "released", label: "По дате выхода ⬆" },
    { value: "-metacritic", label: "По Metacritic ⬇" },
    { value: "metacritic", label: "По Metacritic ⬆" },
    { value: "-added", label: "По популярности ⬇" },
    { value: "added", label: "По популярности ⬆" },
    { value: "name", label: "По названию (A-Z)" },
    { value: "-name", label: "По названию (Z-A)" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.exploreContainer}>
        <div className={styles.header}>
          <SearchInput onInput={handleSearch} initialValue={rawQuery} />
          <div className={styles.controlsRow}>
            <div className={styles.searchSettings}>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as GameSortOption)}
                className={styles.sortSelect}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleClearFilters}
                className={styles.clearButton}
                title="Очистить все фильтры"
              >
                <Image
                  src="/icons/clear.svg"
                  alt="Очистить"
                  height={24}
                  width={24}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Секция выбора жанров */}
        <div className={styles.genresSection}>
          <div className={styles.genresHeader}>
            <h3 className={styles.genresTitle}>Жанры</h3>
            {hasGenresSelected && (
              <button
                onClick={handleClearGenres}
                className={styles.clearGenresButton}
              >
                Очистить жанры
              </button>
            )}
          </div>
          {genresLoading ? (
            <div className={styles.genresLoading}>Загрузка жанров...</div>
          ) : (
            <>
              <div
                className={`${styles.genresContainer} ${
                  showAllGenres ? styles.genresExpanded : ""
                }`}
              >
                {displayedGenres.map((genre) => (
                  <button
                    key={genre.id}
                    className={`${styles.genreTag} ${
                      selectedGenres.includes(genre.id)
                        ? styles.genreTagActive
                        : ""
                    }`}
                    onClick={() => handleGenreToggle(genre.id)}
                  >
                    {genre.name}
                    {selectedGenres.includes(genre.id) && (
                      <span className={styles.genreRemove}>×</span>
                    )}
                  </button>
                ))}
              </div>

              {genres.length > 8 && (
                <button
                  className={styles.showMoreButton}
                  onClick={toggleShowAllGenres}
                >
                  {showAllGenres
                    ? "Скрыть"
                    : `Показать все (${genres.length})`}
                </button>
              )}
            </>
          )}

          {hasGenresSelected && (
            <div className={styles.selectedGenres}>
              <span className={styles.selectedGenresLabel}>Выбрано:</span>
              {selectedGenres.map((genreId) => {
                const genre = genres.find((g) => g.id === genreId);
                return genre ? (
                  <span key={genreId} className={styles.selectedGenreBadge}>
                    {genre.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Секция выбора платформ */}
        <div className={styles.platformsSection}>
          <div className={styles.platformsHeader}>
            <h3 className={styles.platformsTitle}>Платформы</h3>
            {hasPlatformsSelected && (
              <button
                onClick={handleClearPlatforms}
                className={styles.clearPlatformsButton}
              >
                Очистить платформы
              </button>
            )}
          </div>
          {genresLoading ? (
            <div className={styles.platformsLoading}>Загрузка платформ...</div>
          ) : (
            <div className={styles.platformsContainer}>
              {platforms.slice(0, 12).map((platform) => (
                <button
                  key={platform.id}
                  className={`${styles.platformTag} ${
                    selectedPlatforms.includes(platform.id)
                      ? styles.platformTagActive
                      : ""
                  }`}
                  onClick={() => handlePlatformToggle(platform.id)}
                >
                  {platform.name}
                  {selectedPlatforms.includes(platform.id) && (
                    <span className={styles.platformRemove}>×</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {hasPlatformsSelected && (
            <div className={styles.selectedPlatforms}>
              <span className={styles.selectedPlatformsLabel}>Платформы:</span>
              {selectedPlatforms.map((platformId) => {
                const platform = platforms.find((p) => p.id === platformId);
                return platform ? (
                  <span key={platformId} className={styles.selectedPlatformBadge}>
                    {platform.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {loading && <div className={styles.loading}>Загрузка игр...</div>}

        {!loading && data && (
          <>
            <div className={styles.infoSection}>
              <div className={styles.infoRow}>
                <p className={styles.infoItem}>
                  <strong>Найдено игр:</strong>{" "}
                  {data.count?.toLocaleString() || 0}
                </p>
                <p className={styles.infoItem}>
                  <strong>Страница:</strong> {currentPage} из{" "}
                  {Math.min(Math.ceil((data.count || 1) / 20), 500)}
                </p>
                {hasGenresSelected && (
                  <p className={styles.infoItem}>
                    <strong>Жанры:</strong>{" "}
                    {selectedGenres
                      .map((genreId) => {
                        const genre = genres.find((g) => g.id === genreId);
                        return genre ? genre.name : "";
                      })
                      .join(", ")}
                  </p>
                )}
                {hasPlatformsSelected && (
                  <p className={styles.infoItem}>
                    <strong>Платформы:</strong>{" "}
                    {selectedPlatforms
                      .map((platformId) => {
                        const platform = platforms.find((p) => p.id === platformId);
                        return platform ? platform.name : "";
                      })
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Замените MoviesGrid на GamesGrid */}
            <GamesGrid games={data.results || []} />

            {data.count > 20 && (
              <ReactPaginate
                previousLabel="‹"
                nextLabel="›"
                pageCount={Math.min(Math.ceil(data.count / 20), 500)}
                forcePage={Math.min(currentPage - 1, 499)}
                onPageChange={handlePageChange}
                containerClassName={styles.pagination}
                activeClassName={styles.active}
                pageRangeDisplayed={5}
                marginPagesDisplayed={2}
              />
            )}
          </>
        )}

        {!loading && !data && (
          <div className={styles.noResults}>
            {query ? "Игр не найдено" : "Не удалось загрузить данные"}
          </div>
        )}
      </div>
    </div>
  );
}