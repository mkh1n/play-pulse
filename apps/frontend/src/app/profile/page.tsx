"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard/AuthGuard";
import StatsCharts from "@/components/StatsCharts/StatsCharts";
import styles from "./ProfilePage.module.css";
import Image from "next/image";

interface GameAction {
  type: "rate" | "like" | "dislike" | "wishlist" | "status_change";
  rating: number | null;
  completion_status: "not_played" | "playing" | "completed" | "dropped";
  purchase_status: "owned" | "not_owned" | "want_to_buy";
  created_at: string;
}

interface Game {
  id: number;
  name: string;
  actions: GameAction[];
  background_image?: string;
  rating: number;
  metacritic: number | null;
  genres?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
}

interface ApiResponse {
  success: boolean;
  count: number;
  games: Game[];
}

interface Filters {
  actionType: ("like" | "dislike" | "wishlist" | "rate")[];
  completionStatus: ("not_played" | "playing" | "completed" | "dropped")[];
  purchaseStatus: ("owned" | "not_owned" | "want_to_buy")[];
}

interface Stats {
  likes: number;
  dislikes: number;
  wishlist: number;
  rated: number;
  playing: number;
  completed: number;
  dropped: number;
  owned: number;
  want_to_buy: number;
  averageRating: number;
  genresStats: { [key: string]: number };
  tagsStats: { [key: string]: number };
  likedGenresStats: { [key: string]: number }; // Новое
  likedTagsStats: { [key: string]: number }; // Новое
  highRatedGenresStats: { [key: string]: number }; // Новое
  highRatedTagsStats: { [key: string]: number }; // Новое
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    likes: 0,
    dislikes: 0,
    wishlist: 0,
    rated: 0,
    playing: 0,
    completed: 0,
    dropped: 0,
    owned: 0,
    want_to_buy: 0,
    averageRating: 0,
    genresStats: {},
    tagsStats: {},
    likedGenresStats: {},
    likedTagsStats: {},
    highRatedGenresStats: {},
    highRatedTagsStats: {},
  });

  const [filters, setFilters] = useState<Filters>({
    actionType: [],
    completionStatus: [],
    purchaseStatus: [],
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserGames();
    }
  }, [isAuthenticated, user]);

  const loadUserGames = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/me/games", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        console.log("Games loaded:", data);

        if (data.games) {
          setGames(data.games);
          calculateStats(data.games);
        }
      }
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (games: Game[]) => {
    const stats: Stats = {
      likes: 0,
      dislikes: 0,
      wishlist: 0,
      rated: 0,
      playing: 0,
      completed: 0,
      dropped: 0,
      owned: 0,
      want_to_buy: 0,
      averageRating: 0,
      genresStats: {}, // Все жанры
      tagsStats: {}, // Все теги
      likedGenresStats: {}, // Жанры лайкнутых игр
      likedTagsStats: {}, // Теги лайкнутых игр
      highRatedGenresStats: {}, // Жанры игр с оценкой >7
      highRatedTagsStats: {}, // Теги игр с оценкой >7
    };

    let totalRatings = 0;
    let sumRatings = 0;
    const gamesWithGenres = new Set<number>();
    const gamesWithTags = new Set<number>();

    games.forEach((game) => {
      // Берем последнее действие для каждой игры
      const lastAction = game.actions[0];

      // Находим максимальный рейтинг для этой игры
      let maxRating = 0;
      let hasLikeAction = false;

      // Подсчитываем количество действий каждого типа
      game.actions.forEach((action) => {
        if (action.type === "like") {
          stats.likes++;
          hasLikeAction = true;
        }
        if (action.type === "dislike") stats.dislikes++;
        if (action.type === "wishlist") stats.wishlist++;
        if (action.type === "rate" && action.rating !== null) {
          stats.rated++;
          totalRatings++;
          sumRatings += action.rating;
          if (action.rating > maxRating) {
            maxRating = action.rating;
          }
        }
      });

      // Статусы прохождения (берем из последнего действия)
      if (lastAction.completion_status === "playing") stats.playing++;
      if (lastAction.completion_status === "completed") stats.completed++;
      if (lastAction.completion_status === "dropped") stats.dropped++;

      // Статусы покупки (берем из последнего действия)
      if (lastAction.purchase_status === "owned") stats.owned++;
      if (lastAction.purchase_status === "want_to_buy") stats.want_to_buy++;

      // Статистика по жанрам для всех игр
      if (game.genres && Array.isArray(game.genres)) {
        game.genres.forEach((genre) => {
          if (genre && genre.name) {
            // Все жанры
            stats.genresStats[genre.name] =
              (stats.genresStats[genre.name] || 0) + 1;

            // Жанры лайкнутых игр
            if (hasLikeAction) {
              stats.likedGenresStats[genre.name] =
                (stats.likedGenresStats[genre.name] || 0) + 1;
            }

            // Жанры высокооцененных игр (>7)
            if (maxRating > 7) {
              stats.highRatedGenresStats[genre.name] =
                (stats.highRatedGenresStats[genre.name] || 0) + 1;
            }
          }
        });
        gamesWithGenres.add(game.id);
      }

      // Статистика по тегам для всех игр
      if (game.tags && Array.isArray(game.tags)) {
        game.tags.forEach((tag) => {
          if (tag && tag.name) {
            // Все теги
            stats.tagsStats[tag.name] = (stats.tagsStats[tag.name] || 0) + 1;

            // Теги лайкнутых игр
            if (hasLikeAction) {
              stats.likedTagsStats[tag.name] =
                (stats.likedTagsStats[tag.name] || 0) + 1;
            }

            // Теги высокооцененных игр (>7)
            if (maxRating > 7) {
              stats.highRatedTagsStats[tag.name] =
                (stats.highRatedTagsStats[tag.name] || 0) + 1;
            }
          }
        });
        gamesWithTags.add(game.id);
      }
    });

    // Вычисляем средний рейтинг
    if (totalRatings > 0) {
      stats.averageRating = parseFloat((sumRatings / totalRatings).toFixed(1));
    }

    // Логирование для отладки
    console.log("Stats calculated:", {
      totalGames: games.length,
      gamesWithGenres: gamesWithGenres.size,
      gamesWithTags: gamesWithTags.size,
      genresStats: stats.genresStats,
      tagsStats: stats.tagsStats,
      likedGenresStats: stats.likedGenresStats,
      highRatedGenresStats: stats.highRatedGenresStats,
    });

    setStats(stats);
  };

  // Фильтрация игр (фильтруем по последнему действию)
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const lastAction = game.actions[0];

      // Фильтр по action_type
      if (filters.actionType.length > 0) {
        const hasMatchingAction = game.actions.some((action) =>
          filters.actionType.includes(action.type as any)
        );
        if (!hasMatchingAction) return false;
      }

      // Фильтр по completion_status
      if (
        filters.completionStatus.length > 0 &&
        !filters.completionStatus.includes(lastAction.completion_status)
      ) {
        return false;
      }

      // Фильтр по purchase_status
      if (
        filters.purchaseStatus.length > 0 &&
        !filters.purchaseStatus.includes(lastAction.purchase_status)
      ) {
        return false;
      }

      return true;
    });
  }, [games, filters]);

  const toggleFilter = (
    type: keyof Filters,
    value:
      | "like"
      | "dislike"
      | "wishlist"
      | "rate"
      | "not_played"
      | "playing"
      | "completed"
      | "dropped"
      | "owned"
      | "not_owned"
      | "want_to_buy"
  ) => {
    setFilters((prev) => {
      const currentValues = prev[type];
      const index = currentValues.indexOf(value as never);

      const newValues =
        index > -1
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];

      return {
        ...prev,
        [type]: newValues,
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      actionType: [],
      completionStatus: [],
      purchaseStatus: [],
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "like":
        return "👍";
      case "dislike":
        return "👎";
      case "wishlist":
        return "❤️";
      case "rate":
        return "⭐";
      case "status_change":
        return "🔄";
      default:
        return "📝";
    }
  };

  const getLatestRating = (game: Game): number | null => {
    const rateAction = game.actions.find(
      (action) => action.type === "rate" && action.rating
    );
    return rateAction?.rating || null;
  };

  const getLastAction = (game: Game): GameAction => {
    return game.actions[0];
  };

  const getStatusBadge = (game: Game) => {
    const lastAction = getLastAction(game);
    const badges = [];

    if (lastAction.completion_status === "playing") badges.push("🎮 Играю");
    if (lastAction.completion_status === "completed")
      badges.push("✅ Завершено");
    if (lastAction.completion_status === "dropped") badges.push("🚫 Брошено");
    if (lastAction.purchase_status === "owned") badges.push("💰 Куплено");
    if (lastAction.purchase_status === "want_to_buy")
      badges.push("🛒 Хочу купить");

    return badges;
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка профиля...</div>;
  }

  if (!isAuthenticated) {
    return <AuthGuard requireAuth={true} />;
  }

  return (
    <div className={styles.container}>
      {/* Заголовок профиля */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className={styles.userInfo}>
            <h1 className={styles.username}>{user?.username}</h1>
            <p className={styles.login}>@{user?.login}</p>
            <p className={styles.memberSince}>
              Участник с{" "}
              {new Date(user?.created_at || "").toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutButton}>
          Выйти
        </button>
      </div>

      <StatsCharts
        genresStats={stats.genresStats}
        tagsStats={stats.tagsStats}
        likedGenresStats={stats.likedGenresStats}
        likedTagsStats={stats.likedTagsStats}
        highRatedGenresStats={stats.highRatedGenresStats}
        highRatedTagsStats={stats.highRatedTagsStats}
      />

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.likes}</div>
          <div className={styles.statLabel}>👍 Лайков</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.dislikes}</div>
          <div className={styles.statLabel}>👎 Дизлайков</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.wishlist}</div>
          <div className={styles.statLabel}>❤️ Wishlist</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.rated}</div>
          <div className={styles.statLabel}>⭐ Оценок</div>
        </div>
        {stats.rated > 0 && (
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.averageRating}</div>
            <div className={styles.statLabel}>📊 Средний рейтинг</div>
          </div>
        )}
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.playing}</div>
          <div className={styles.statLabel}>🎮 Играю</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.completed}</div>
          <div className={styles.statLabel}>✅ Завершено</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.dropped}</div>
          <div className={styles.statLabel}>🚫 Брошено</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.owned}</div>
          <div className={styles.statLabel}>💰 Куплено</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.want_to_buy}</div>
          <div className={styles.statLabel}>🛒 Хочу купить</div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles.filtersSection}>
        <h3>Фильтры</h3>

        <div className={styles.filterGroup}>
          <h4>Действия:</h4>
          <div className={styles.filterButtons}>
            {[
              { value: "like", label: "👍 Лайки" },
              { value: "dislike", label: "👎 Дизлайки" },
              { value: "wishlist", label: "❤️ Wishlist" },
              { value: "rate", label: "⭐ Оценки" },
            ].map((item) => (
              <button
                key={item.value}
                className={`${styles.filterButton} ${
                  filters.actionType.includes(item.value as any)
                    ? styles.activeFilter
                    : ""
                }`}
                onClick={() => toggleFilter("actionType", item.value as any)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <h4>Статус прохождения:</h4>
          <div className={styles.filterButtons}>
            {[
              { value: "not_played", label: "❓ Не играл" },
              { value: "playing", label: "🎮 Играю" },
              { value: "completed", label: "✅ Завершено" },
              { value: "dropped", label: "🚫 Брошено" },
            ].map((item) => (
              <button
                key={item.value}
                className={`${styles.filterButton} ${
                  filters.completionStatus.includes(item.value as any)
                    ? styles.activeFilter
                    : ""
                }`}
                onClick={() =>
                  toggleFilter("completionStatus", item.value as any)
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <h4>Статус покупки:</h4>
          <div className={styles.filterButtons}>
            {[
              { value: "not_owned", label: "💰 Не куплено" },
              { value: "owned", label: "✅ Куплено" },
              { value: "want_to_buy", label: "🛒 Хочу купить" },
            ].map((item) => (
              <button
                key={item.value}
                className={`${styles.filterButton} ${
                  filters.purchaseStatus.includes(item.value as any)
                    ? styles.activeFilter
                    : ""
                }`}
                onClick={() =>
                  toggleFilter("purchaseStatus", item.value as any)
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={clearFilters} className={styles.clearFiltersButton}>
          Очистить все фильтры
        </button>
      </div>

      {/* Список игр */}
      <div className={styles.gamesSection}>
        <div className={styles.gamesHeader}>
          <h3>Игры ({filteredGames.length})</h3>
          <div className={styles.activeFilters}>
            {filters.actionType.length > 0 && (
              <span>Действия: {filters.actionType.length}</span>
            )}
            {filters.completionStatus.length > 0 && (
              <span>Статусы: {filters.completionStatus.length}</span>
            )}
            {filters.purchaseStatus.length > 0 && (
              <span>Покупки: {filters.purchaseStatus.length}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка игр...</div>
        ) : filteredGames.length > 0 ? (
          <div className={styles.gamesList}>
            {filteredGames.map((game) => {
              const lastAction = getLastAction(game);
              const userRating = getLatestRating(game);

              return (
                <div key={game.id} className={styles.gameCard}>
                  <div className={styles.gameImage}>
                    {game.background_image ? (
                      <Image
                        src={game.background_image}
                        alt={game.name}
                        width={120}
                        height={80}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>🎮</div>
                    )}
                  </div>

                  <div className={styles.gameInfo}>
                    <h4 className={styles.gameName}>{game.name}</h4>

                    <div className={styles.gameMeta}>
                      <span className={styles.actionType}>
                        {getActionIcon(lastAction.type)}
                        {userRating && ` ${userRating}/10`}
                      </span>

                      {getStatusBadge(game).map((badge, index) => (
                        <span key={index} className={styles.statusBadge}>
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className={styles.gameDate}>
                      Последнее действие:{" "}
                      {new Date(lastAction.created_at).toLocaleDateString(
                        "ru-RU"
                      )}
                    </div>

                    <div className={styles.gameActionsCount}>
                      Всего действий: {game.actions.length}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            {games.length === 0 ? (
              <>
                <h3>У вас пока нет игр</h3>
                <p>
                  Начните добавлять игры с помощью лайков, оценок или добавляйте
                  их в wishlist!
                </p>
              </>
            ) : (
              <>
                <h3>Игры не найдены</h3>
                <p>Попробуйте изменить фильтры</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
