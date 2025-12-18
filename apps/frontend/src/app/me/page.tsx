// app/profile/page.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useMediaActions } from "@/hooks/useMediaActions";
import { useUserDataStore } from "@/stores/userDataStore";
import { useMediaCacheStore } from "@/stores/mediaCacheStore";
import { BackupManager } from "@/services/backupManager";
import { TMDBMediaItem } from "@/types/tmdb";
import { MediaType } from "@/types/storage";
import {
  getMediaTitle,
  getMediaImage,
  formatDate,
} from "@/services/mediaUtils";
import Image from "next/image";
import Link from "next/link";
import styles from "./Profile.module.css";

type TabType =
  | "favorites"
  | "watched"
  | "watchlist"
  | "ratings"
  | "notes"
  | "all";

type MediaWithActions = {
  id: number;
  type: MediaType;
  media: TMDBMediaItem | null;
  isFavorite: boolean;
  isWatched: boolean;
  isInWatchlist: boolean;
  userRating: number | null;
  userNote: string | null;
  updatedAt?: string;
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<MediaType | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "rating" | "title">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    getAllRatings,
    getAllNotes,
    getAllFavorites,
    getAllWatched,
    getAllWatchlist,
    getCachedMedia,
    ensureMediaCached,
    userDataStore,
    mediaCacheStore,
  } = useMediaActions();

  const stats = useMediaActions().getStats();

  // Функция для получения всех медиа с действиями
  const getAllMediaWithActions = useCallback((): MediaWithActions[] => {
    console.log("🔄 Получение всех медиа с действиями...");

    const allMedia: MediaWithActions[] = [];

    // 1. Собираем из всех источников
    const favorites = getAllFavorites();
    const watched = getAllWatched();
    const watchlist = getAllWatchlist();
    const ratings = getAllRatings();
    const notes = getAllNotes();

    console.log("📊 Данные:");
    console.log("⭐ Избранное:", favorites.length);
    console.log("👁️ Просмотрено:", watched.length);
    console.log("📌 Watchlist:", watchlist.length);
    console.log("⭐ Оценки:", ratings.length);
    console.log("📝 Заметки:", notes.length);

    // Создаем Map для уникальности
    const mediaMap = new Map<string, MediaWithActions>();

    // Добавляем избранное
    favorites.forEach((item) => {
      const key = `${item.type}_${item.id}`;
      const media = getCachedMedia(item.id, item.type);
      mediaMap.set(key, {
        id: item.id,
        type: item.type,
        media,
        isFavorite: true,
        isWatched: userDataStore.isWatched(item.id, item.type),
        isInWatchlist: userDataStore.isInWatchlist(item.id, item.type),
        userRating: userDataStore.getRating(item.id, item.type),
        userNote: userDataStore.getNote(item.id, item.type),
        updatedAt: item.addedAt,
      });
    });

    // Добавляем просмотренные
    watched.forEach((item) => {
      const key = `${item.type}_${item.id}`;
      const existing = mediaMap.get(key);
      const media = getCachedMedia(item.id, item.type);

      if (existing) {
        existing.isWatched = true;
        existing.updatedAt = existing.updatedAt || item.lastWatchedAt;
      } else {
        mediaMap.set(key, {
          id: item.id,
          type: item.type,
          media,
          isFavorite: userDataStore.isFavorite(item.id, item.type),
          isWatched: true,
          isInWatchlist: userDataStore.isInWatchlist(item.id, item.type),
          userRating: userDataStore.getRating(item.id, item.type),
          userNote: userDataStore.getNote(item.id, item.type),
          updatedAt: item.lastWatchedAt,
        });
      }
    });

    // Добавляем watchlist
    watchlist.forEach((item) => {
      const key = `${item.type}_${item.id}`;
      const existing = mediaMap.get(key);
      const media = getCachedMedia(item.id, item.type);

      if (existing) {
        existing.isInWatchlist = true;
        existing.updatedAt = existing.updatedAt || item.addedAt;
      } else {
        mediaMap.set(key, {
          id: item.id,
          type: item.type,
          media,
          isFavorite: userDataStore.isFavorite(item.id, item.type),
          isWatched: userDataStore.isWatched(item.id, item.type),
          isInWatchlist: true,
          userRating: userDataStore.getRating(item.id, item.type),
          userNote: userDataStore.getNote(item.id, item.type),
          updatedAt: item.addedAt,
        });
      }
    });

    // Добавляем оценки
    ratings.forEach((item) => {
      const key = `${item.type}_${item.id}`;
      const existing = mediaMap.get(key);
      const media = getCachedMedia(item.id, item.type);

      if (existing) {
        existing.userRating = item.rating;
        existing.updatedAt = existing.updatedAt || item.updatedAt;
      } else {
        mediaMap.set(key, {
          id: item.id,
          type: item.type,
          media,
          isFavorite: userDataStore.isFavorite(item.id, item.type),
          isWatched: userDataStore.isWatched(item.id, item.type),
          isInWatchlist: userDataStore.isInWatchlist(item.id, item.type),
          userRating: item.rating,
          userNote: userDataStore.getNote(item.id, item.type),
          updatedAt: item.updatedAt,
        });
      }
    });

    // Добавляем заметки
    notes.forEach((item) => {
      const key = `${item.type}_${item.id}`;
      const existing = mediaMap.get(key);
      const media = getCachedMedia(item.id, item.type);

      if (existing) {
        existing.userNote = item.content;
        existing.updatedAt = existing.updatedAt || item.updatedAt;
      } else {
        mediaMap.set(key, {
          id: item.id,
          type: item.type,
          media,
          isFavorite: userDataStore.isFavorite(item.id, item.type),
          isWatched: userDataStore.isWatched(item.id, item.type),
          isInWatchlist: userDataStore.isInWatchlist(item.id, item.type),
          userRating: userDataStore.getRating(item.id, item.type),
          userNote: item.content,
          updatedAt: item.updatedAt,
        });
      }
    });

    const result = Array.from(mediaMap.values());
    console.log("✅ Всего уникальных медиа:", result.length);

    return result;
  }, [
    getAllFavorites,
    getAllWatched,
    getAllWatchlist,
    getAllRatings,
    getAllNotes,
    getCachedMedia,
    userDataStore,
  ]);

  // Получаем все медиа с действиями
  const allMedia = useMemo(
    () => getAllMediaWithActions(),
    [getAllMediaWithActions]
  );

  // Фильтрация и сортировка медиа
  const filteredMedia = useMemo(() => {
    // Фильтр по активной вкладке
    let filtered = allMedia;
    switch (activeTab) {
      case "favorites":
        filtered = filtered.filter((item) => item.isFavorite);
        break;
      case "watched":
        filtered = filtered.filter((item) => item.isWatched);
        break;
      case "watchlist":
        filtered = filtered.filter((item) => item.isInWatchlist);
        break;
      case "ratings":
        filtered = filtered.filter((item) => item.userRating !== null);
        break;
      case "notes":
        filtered = filtered.filter(
          (item) => item.userNote && item.userNote.trim() !== ""
        );
        break;
      // 'all' - все медиа
    }

    // Фильтр по типу
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        if (!item.media) return false;
        const title = getMediaTitle(item.media).toLowerCase();
        const overview = item.media.overview?.toLowerCase() || "";
        return title.includes(query) || overview.includes(query);
      });
    }

    // Сортировка
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = 0;
      let bValue: any = 0;

      switch (sortBy) {
        case "rating":
          aValue = a.userRating || 0;
          bValue = b.userRating || 0;
          break;
        case "title":
          aValue = a.media ? getMediaTitle(a.media).toLowerCase() : "";
          bValue = b.media ? getMediaTitle(b.media).toLowerCase() : "";
          break;
        case "date":
        default:
          // Сортируем по дате обновления (новые сверху)
          aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log(
      `🔍 Фильтрация: из ${allMedia.length} => ${filtered.length} => ${sorted.length}`
    );
    return sorted;
  }, [allMedia, activeTab, filterType, searchQuery, sortBy, sortOrder]);

  // Загружаем данные
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("📥 Загрузка данных профиля...");
        console.log("📊 Загружено медиа:", allMedia.length);
        setLoading(false);
      } catch (error) {
        console.error("❌ Ошибка загрузки данных:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [allMedia]);

  // Обработчики для экспорта/импорта
  const handleExport = () => {
    BackupManager.downloadBackup();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage("");

    try {
      const success = await BackupManager.importBackup(file);
      if (success) {
        setImportMessage("✅ Данные успешно импортированы!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setImportMessage("❌ Ошибка импорта. Проверьте формат файла.");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportMessage("❌ Произошла ошибка при импорте.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите удалить ВСЕ данные? Это действие нельзя отменить."
      )
    ) {
      userDataStore.clearData();
      mediaCacheStore.clearCache();
      window.location.reload();
    }
  };

  const handleClearCache = () => {
    if (
      window.confirm(
        "Очистить кэш медиа-данных? Это не удалит ваши оценки и заметки."
      )
    ) {
      mediaCacheStore.clearCache();
      window.location.reload();
    }
  };

  // Получение типа на русском
  const getTypeLabel = (type: MediaType) => {
    switch (type) {
      case "movie":
        return "Фильм";
      case "tv":
        return "Сериал";
      case "person":
        return "Персона";
      default:
        return type;
    }
  };

  // Получение ссылки на медиа
  const getMediaLink = (id: number, type: MediaType) => {
    switch (type) {
      case "movie":
        return `/explore/movie/${id}`;
      case "tv":
        return `/explore/tv/${id}`;
      case "person":
        return `/explore/person/${id}`;
      default:
        return "/";
    }
  };

  // Обработчик кликов по кнопкам действий (чтобы не срабатывала ссылка карточки)
  const handleActionClick = (
    e: React.MouseEvent,
    callback: () => void
  ) => {
    e.stopPropagation();
    e.preventDefault();
    callback();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1>Мой профиль</h1>
        <div className={styles.loading}>Загрузка данных профиля...</div>
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      {/* Заголовок и статистика */}
      <header className={styles.header}>
        <h1 className={styles.title}>Мой профиль</h1>
        <p className={styles.subtitle}>
          Управление вашей коллекцией фильмов и сериалов
        </p>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalFavorites}</div>
            <div className={styles.statLabel}>Избранное</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalWatched}</div>
            <div className={styles.statLabel}>Просмотрено</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalWatchlist}</div>
            <div className={styles.statLabel}>Хочу посмотреть</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalRatings}</div>
            <div className={styles.statLabel}>Оценок</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalNotes}</div>
            <div className={styles.statLabel}>Заметок</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {stats.averageRating ? stats.averageRating.toFixed(1) : "—"}
            </div>
            <div className={styles.statLabel}>Средняя оценка</div>
          </div>
        </div>
      </header>

      {/* Фильтры и сортировка */}
      <div className={styles.filterSection}>
        <div className={styles.searchBox}>
          <Image src="/icons/search.svg" alt="Search" width={20} height={20} />
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label>Тип:</label>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as MediaType | "all")
              }
              className={styles.select}
            >
              <option value="all">Все типы</option>
              <option value="movie">Фильмы</option>
              <option value="tv">Сериалы</option>
              <option value="person">Персоны</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Сортировка:</label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "date" | "rating" | "title")
              }
              className={styles.select}
            >
              <option value="date">По дате</option>
              <option value="rating">По оценке</option>
              <option value="title">По названию</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Порядок:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className={styles.select}
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        {(
          [
            "all",
            "favorites",
            "watched",
            "watchlist",
            "ratings",
            "notes",
          ] as TabType[]
        ).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${
              activeTab === tab ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" && "Все медиа"}
            {tab === "favorites" && "Избранное"}
            {tab === "watched" && "Просмотрено"}
            {tab === "watchlist" && "Хочу посмотреть"}
            {tab === "ratings" && "С оценками"}
            {tab === "notes" && "С заметками"}
            {tab !== "all" && (
              <span className={styles.tabCount}>
                {tab === "favorites" && stats.totalFavorites}
                {tab === "watched" && stats.totalWatched}
                {tab === "watchlist" && stats.totalWatchlist}
                {tab === "ratings" && stats.totalRatings}
                {tab === "notes" && stats.totalNotes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Список медиа */}
      <div className={styles.mediaGrid}>
        {filteredMedia.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить фильтры или добавить медиа в коллекцию</p>
          </div>
        ) : (
          filteredMedia.map((item) => {
            const mediaLink = getMediaLink(item.id, item.type);
            
            return (
              <Link
                key={`${item.type}_${item.id}`}
                href={mediaLink}
                className={styles.mediaCardLink}
              >
                <div className={styles.mediaCard}>
                  {/* Постер */}
                  <div className={styles.mediaPoster}>
                    {item.media && getMediaImage(item.media) ? (
                      <img
                        src={getMediaImage(item.media)!}
                        alt={getMediaTitle(item.media)}
                        className={styles.posterImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement)
                            .parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="${styles.posterPlaceholder}">
                                <span>${getTypeLabel(item.type).charAt(0)}</span>
                                <small>${item.id}</small>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className={styles.posterPlaceholder}>
                        <span>{getTypeLabel(item.type).charAt(0)}</span>
                        <small>#{item.id}</small>
                      </div>
                    )}

                    {/* Бейдж типа */}
                    <span className={`${styles.typeBadge} ${styles[item.type]}`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>

                  {/* Информация */}
                  <div className={styles.mediaInfo}>
                    <h3 className={styles.mediaTitle}>
                      {item.media ? getMediaTitle(item.media) : `#${item.id}`}
                      {item.media?.vote_average && (
                        <span className={styles.ratingBadge}>
                          {item.media.vote_average.toFixed(1)}
                        </span>
                      )}
                    </h3>

                    <div className={styles.mediaTypeInfo}>
                      {item.updatedAt && (
                        <span className={styles.updateDate}>
                          {formatDate(item.updatedAt)}
                        </span>
                      )}
                    </div>

                    {item.media?.overview && (
                      <p className={styles.mediaOverview}>
                        {item.media.overview.substring(0, 100)}...
                      </p>
                    )}

                    {/* Действия пользователя */}
                    <div className={styles.userActions}>
                      <div className={styles.actionIcons}>
               

      
                        {item.userRating && (
                          <span
                            className={styles.actionIcon}
                            title={`Оценка: ${item.userRating}`}
                          >
                            <Image
                              src="/icons/star.svg"
                              alt="Rating"
                              width={16}
                              height={16}
                            />
                            <span className={styles.ratingValue}>
                              {item.userRating}
                            </span>
                          </span>
                        )}
                      </div>

                      {item.userNote && (
                        <div className={styles.notePreview}>
                          <strong>Заметка:</strong> {item.userNote.substring(0, 50)}
                          ...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Быстрые действия */}
                  <div 
                    className={styles.quickActions}
                    onClick={(e) => e.preventDefault()}
                  >
                    <button
                      className={`${styles.quickAction} ${
                        item.isFavorite ? styles.active : ""
                      }`}
                      onClick={(e) => handleActionClick(
                        e,
                        () => userDataStore.toggleFavorite(item.id, item.type)
                      )}
                      title={
                        item.isFavorite ? "Убрать из избранного" : "В избранное"
                      }
                    >
                      <Image
                        src={
                          item.isFavorite
                            ? "/icons/heart.svg"
                            : "/icons/heart-empty.svg"
                        }
                        alt="Favorite"
                        width={20}
                        height={20}
                      />
                    </button>
                    <button
                      className={`${styles.quickAction} ${
                        item.isWatched ? styles.active : ""
                      }`}
                      onClick={(e) => handleActionClick(
                        e,
                        () => userDataStore.toggleWatched(item.id, item.type)
                      )}
                      title={
                        item.isWatched ? "Не просмотрено" : "Отметить просмотренным"
                      }
                    >
                      <Image
                        src={
                          item.isWatched
                            ? "/icons/eye.svg"
                            : "/icons/eye-closed.svg"
                        }
                        alt="Watched"
                        width={20}
                        height={20}
                      />
                    </button>
                    <button
                      className={`${styles.quickAction} ${
                        item.isInWatchlist ? styles.active : ""
                      }`}
                      onClick={(e) => handleActionClick(
                        e,
                        () => userDataStore.toggleWatchlist(item.id, item.type)
                      )}
                      title={
                        item.isInWatchlist ? "Убрать из списка" : "Хочу посмотреть"
                      }
                    >
                      <Image
                        src={
                          item.isInWatchlist
                            ? "/icons/bookmark.svg"
                            : "/icons/bookmark-empty.svg"
                        }
                        alt="Watchlist"
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      
      {/* Пагинация */}
      {filteredMedia.length > 0 && (
        <div className={styles.footer}>
          <p className={styles.resultCount}>
            Показано {filteredMedia.length} из {allMedia.length}
          </p>
        </div>
      )}
      
      {/* Панель управления */}
      <div className={styles.controlPanel}>
        <div className={styles.backupSection}>
          <div className={styles.importExportBlock}>
            <h3>Резервное копирование</h3>
            <div className={styles.backupButtons}>
              <button
                onClick={handleExport}
                className={`${styles.button} ${styles.exportButton}`}
              >
                <Image
                  src="/icons/export.svg"
                  alt="Export"
                  width={16}
                  height={16}
                />
                Экспорт данных
              </button>
              <button
                onClick={handleImportClick}
                className={`${styles.button} ${styles.importButton}`}
                disabled={isImporting}
              >
                <Image
                  src="/icons/import.svg"
                  alt="Import"
                  width={16}
                  height={16}
                />
                {isImporting ? "Импорт..." : "Импорт данных"}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                style={{ display: "none" }}
              />
            </div>
            {importMessage && (
              <div className={styles.importMessage}>{importMessage}</div>
            )}
          </div>

          <div className={styles.dangerZone}>
            <h3>Опасная зона</h3>
            <div className={styles.dangerButtons}>
              <button
                onClick={handleClearCache}
                className={`${styles.button} ${styles.warningButton}`}
              >
                Очистить кэш медиа
              </button>
              <button
                onClick={handleClearAllData}
                className={`${styles.button} ${styles.dangerButton}`}
              >
                Удалить все данные
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}