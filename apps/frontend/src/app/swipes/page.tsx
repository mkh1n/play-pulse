// app/swipes/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SwipeCard from "@/components/SwipeCard/SwipeCard";
import SwipeControls from "@/components/SwipeControls/SwipeControls";
import styles from "./SwipesPage.module.css";

interface Game {
  id: number;
  name: string;
  background_image: string;
  rating: number;
  genres: { id: number; name: string }[];
  released: string;
  description?: string;
  description_raw?: string;
  metacritic?: number;
  platforms?: { platform: { name: string } }[];
  developers?: { name: string }[];
  publishers?: { name: string }[];
  added?: number;
}

const BATCH_SIZE = 50;
const PREFETCH_THRESHOLD = 10;

export default function SwipesPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ likes: 0, dislikes: 0, skips: 0 });
  const [swipedIds, setSwipedIds] = useState<Set<number>>(new Set());
  const [triggerSwipe, setTriggerSwipe] = useState<"left" | "right" | "up" | null>(null);

  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Загрузка первой пачки
  useEffect(() => {
    loadGamesBatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGamesBatch = async (offset: number) => {
    if (isFetchingRef.current || !hasMoreRef.current) return;

    isFetchingRef.current = true;

    try {
      const excludeParam = Array.from(swipedIds).join(",");
      const endpoint = `/api/recommendations/swipes?limit=${BATCH_SIZE}&offset=${offset}&exclude=${excludeParam}`;

      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json();

      if (data.success && data.games?.length > 0) {
        setGames((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const uniqueNewGames = data.games.filter((g: Game) => !existingIds.has(g.id));
          return [...prev, ...uniqueNewGames];
        });
        setHasMore(data.hasMore);
        hasMoreRef.current = data.hasMore;
      } else if (data.success && data.games?.length === 0) {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch (error) {
      console.error("[Swipes] Error loading games:", error);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsPrefetching(false);
    }
  };

  // Предзагрузка
  useEffect(() => {
    const remainingGames = games.length - currentIndex;

    if (
      remainingGames <= PREFETCH_THRESHOLD &&
      !isPrefetching &&
      !isFetchingRef.current &&
      hasMoreRef.current
    ) {
      setIsPrefetching(true);
      loadGamesBatch(games.length);
    }
  }, [currentIndex, games.length, isPrefetching]);

  // 🔥 Обработка свайпа — с анимацией
  const handleSwipe = useCallback(
    async (direction: "left" | "right" | "up") => {
      const currentGame = games[currentIndex];
      if (!currentGame) return;

      // 🔥 Запускаем анимацию
      setTriggerSwipe(direction);

      // 🔥 Обновляем статистику сразу
      setStats((prev) => ({
        ...prev,
        likes: prev.likes + (direction === "right" ? 1 : 0),
        dislikes: prev.dislikes + (direction === "left" ? 1 : 0),
        skips: prev.skips + (direction === "up" ? 1 : 0),
      }));

      // 🔥 Отправляем запрос в фоне (fire-and-forget)
      if (isAuthenticated && token && direction !== "up") {
        fetch("/api/recommendations/swipe-action", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameId: currentGame.id,
            gameName: currentGame.name,
            action: direction === "right" ? "like" : "dislike",
          }),
        }).catch((err) => console.error("[Swipe Action] Error:", err));
      }

      console.log(`[Swipes] ${direction} on game ${currentGame.name}`);
    },
    [games, currentIndex, isAuthenticated, token]
  );

  // 🔥 Завершение анимации свайпа
  const handleSwipeComplete = useCallback(() => {
    setSwipedIds((prev) => new Set(prev).add(games[currentIndex]?.id));
    setCurrentIndex((prev) => prev + 1);
    setTriggerSwipe(null);
  }, [games, currentIndex]);

  // Управление клавиатурой
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex >= games.length || isLoading) return;

      switch (e.key) {
        case "ArrowLeft":
          handleSwipe("left");
          break;
        case "ArrowRight":
          handleSwipe("right");
          break;
        case "ArrowUp":
          handleSwipe("up");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, games.length, isLoading, handleSwipe]);

  const handleCardWishlist = useCallback(
    async (gameId: number) => {
      if (!isAuthenticated || !token) return;

      try {
        await fetch(`/api/games/${gameId}/wishlist`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Error adding to wishlist:", error);
      }
    },
    [isAuthenticated, token]
  );

  const handleRestart = () => {
    setGames([]);
    setCurrentIndex(0);
    setStats({ likes: 0, dislikes: 0, skips: 0 });
    setSwipedIds(new Set());
    setHasMore(true);
    hasMoreRef.current = true;
    setIsLoading(true);
    loadGamesBatch(0);
  };

  // Если игры закончились
  if (currentIndex >= games.length && !isLoading && games.length > 0 && !hasMoreRef.current) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h1 className={styles.title}>🎮 Игры закончились!</h1>
          <p className={styles.subtitle}>Вы просмотрели все доступные игры</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.likes}</span>
              <span className={styles.statLabel}>👍 Лайков</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.dislikes}</span>
              <span className={styles.statLabel}>👎 Дизлайков</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.skips}</span>
              <span className={styles.statLabel}>⏭️ Пропущено</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={handleRestart}>
              Начать заново
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => router.push("/games")}
            >
              Перейти к каталогу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <title>PlayPulse | Свайпы</title>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <p className={styles.pageSubtitle}>Когда не знаешь во что поиграть</p>
        </div>
        <div className={styles.mobileHint}>
          <p>👆 Свайпни вправо для лайка, влево для дизлайка, вверх чтобы пропустить</p>
        </div>

        <div className={styles.statsBar}>
          <span className={styles.statItem}>👍 {stats.likes}</span>
          <span className={styles.statItem}>👎 {stats.dislikes}</span>
          <span className={styles.statItem}>⏭️ {stats.skips}</span>
        </div>
      </header>

      <div className={styles.cardsContainer}>
        {/* 🔥 Показываем 3 карточки: текущая, следующая, и ещё одна */}
        {games.slice(currentIndex, currentIndex + 3).map((game, index) => (
          <SwipeCard
            key={game.id}
            game={game}
            isActive={index === 0}
            isNext={index === 1}
            onSwipe={handleSwipe}
            onWishlist={() => handleCardWishlist(game.id)}
            triggerSwipe={index === 0 ? triggerSwipe : null}
            onSwipeComplete={index === 0 ? handleSwipeComplete : undefined}
          />
        ))}
      </div>

      {(isLoading || isPrefetching) && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner} />
          <span>{isLoading ? "Загрузка..." : "Загружаем ещё игры..."}</span>
        </div>
      )}

      <SwipeControls
        onSwipe={handleSwipe}
        disabled={currentIndex >= games.length || isLoading}
        triggerSwipe={triggerSwipe}
        onSwipeComplete={handleSwipeComplete}
      />


    </div>
  );
}