// app/swipes/page.tsx
"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";

import SwipeCard from "@/components/SwipeCard/SwipeCard";

import SwipeControls from "@/components/SwipeControls/SwipeControls";

import AuthPopup from "@/components/AuthPopup/AuthPopup";

import styles from "./SwipesPage.module.css";

interface Game {
  id: number;

  name: string;

  background_image: string;

  rating: number;

  genres: {
    id: number;
    name: string;
  }[];

  released: string;

  description?: string;

  description_raw?: string;

  metacritic?: number;

  platforms?: {
    platform: {
      name: string;
    };
  }[];

  developers?: {
    name: string;
  }[];

  publishers?: {
    name: string;
  }[];

  added?: number;
}

interface PendingSwipeAction {
  gameId: number;
  gameName: string;
  action: 'like' | 'dislike';
  timestamp: number;
}

const BATCH_SIZE = 50;

const PREFETCH_THRESHOLD = 10;

// Настройки батчинга
const BATCH_FLUSH_INTERVAL = 5000; // Синхронизация каждые 5 секунд
const MAX_BATCH_SIZE = 10; // Максимальный размер пачки перед отправкой

export default function SwipesPage() {
  const router =
    useRouter();

  const {
    isAuthenticated,
    token,
  } = useAuth();

  const [
    games,
    setGames,
  ] = useState<Game[]>([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isPrefetching,
    setIsPrefetching,
  ] = useState(false);

  const [
    hasMore,
    setHasMore,
  ] = useState(true);

  const [
    triggerSwipe,
    setTriggerSwipe,
  ] = useState<
    | "left"
    | "right"
    | "up"
    | null
  >(null);

  const [
    showAuthPopup,
    setShowAuthPopup,
  ] = useState(false);

  const [
    stats,
    setStats,
  ] = useState({
    likes: 0,
    dislikes: 0,
    skips: 0,
  });

  const [
    swipedIds,
    setSwipedIds,
  ] = useState<
    Set<number>
  >(new Set());

  // =====================================================
  // BATCHING STATE
  // =====================================================

  const [
    pendingActions,
    setPendingActions,
  ] = useState<PendingSwipeAction[]>([]);

  const [
    lastSyncTime,
    setLastSyncTime,
  ] = useState<number>(Date.now());

  const isFetchingRef =
    useRef(false);

  const hasMoreRef =
    useRef(true);

  const swipeLockRef =
    useRef(false);

  const pageVisibleRef =
    useRef(true);

  // =====================================================
  // LOAD GAMES
  // =====================================================

  const loadGamesBatch =
    useCallback(
      async () => {
        if (
          isFetchingRef.current ||
          !hasMoreRef.current
        ) {
          return;
        }

        if (
          !token ||
          !isAuthenticated
        ) {
          return;
        }

        isFetchingRef.current =
          true;

        try {
          const excludeParam =
            Array.from(
              swipedIds,
            ).join(",");

          const response =
            await fetch(
              `/api/recommendations/swipes?limit=${BATCH_SIZE}&exclude=${excludeParam}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },

                cache:
                  "no-store",
              },
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Failed to load games",
            );
          }

          const data =
            await response.json();

          if (
            data.success &&
            Array.isArray(
              data.games,
            )
          ) {
            if (
              data.games
                .length ===
              0
            ) {
              setHasMore(
                false,
              );

              hasMoreRef.current =
                false;

              return;
            }

            setGames(
              (prev) => {
                const existingIds =
                  new Set(
                    prev.map(
                      (
                        game,
                      ) =>
                        game.id,
                    ),
                  );

                const uniqueGames =
                  data.games.filter(
                    (
                      game: Game,
                    ) =>
                      !existingIds.has(
                        game.id,
                      ),
                  );

                return [
                  ...prev,
                  ...uniqueGames,
                ];
              },
            );

            setHasMore(
              true,
            );

            hasMoreRef.current =
              true;
          }
        } catch (error) {
          console.error(
            "[SWIPES LOAD ERROR]",
            error,
          );
        } finally {
          isFetchingRef.current =
            false;

          setIsLoading(
            false,
          );

          setIsPrefetching(
            false,
          );
        }
      },
      [
        token,
        isAuthenticated,
        swipedIds,
      ],
    );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (
      !isAuthenticated
    ) {
      setShowAuthPopup(
        true,
      );

      return;
    }

    setShowAuthPopup(
      false,
    );

    loadGamesBatch();
  }, [
    isAuthenticated,
    loadGamesBatch,
  ]);

  // =====================================================
  // PREFETCH
  // =====================================================

  useEffect(() => {
    const remaining =
      games.length -
      currentIndex;

    if (
      remaining <=
        PREFETCH_THRESHOLD &&
      !isPrefetching &&
      !isFetchingRef.current &&
      hasMoreRef.current
    ) {
      setIsPrefetching(
        true,
      );

      loadGamesBatch();
    }
  }, [
    currentIndex,
    games.length,
    isPrefetching,
    loadGamesBatch,
  ]);

  // =====================================================
  // BATCH FLUSH - ОТПРАВКА ПАЧКИ ДЕЙСТВИЙ
  // =====================================================

  const flushPendingActions = useCallback(
    async (actionsToFlush: PendingSwipeAction[]) => {
      if (!actionsToFlush.length || !token || !isAuthenticated) {
        return;
      }

      try {
        const response = await fetch('/api/recommendations/swipe-action/batch', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actions: actionsToFlush.map(a => ({
              gameId: a.gameId,
              gameName: a.gameName,
              action: a.action,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to flush batch');
        }

        setLastSyncTime(Date.now());
        console.log(`[BATCH] Flushed ${actionsToFlush.length} actions`);
      } catch (error) {
        console.error('[BATCH FLUSH ERROR]', error);
      }
    },
    [token, isAuthenticated],
  );

  // =====================================================
  // CHECK IF SHOULD FLUSH
  // =====================================================

  const shouldFlush = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    
    // Flush если прошло достаточно времени ИЛИ набралось много действий
    return (
      timeSinceLastSync >= BATCH_FLUSH_INTERVAL ||
      pendingActions.length >= MAX_BATCH_SIZE
    );
  }, [lastSyncTime, pendingActions.length]);

  // =====================================================
  // PERIODIC SYNC
  // =====================================================

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    const interval = setInterval(() => {
      if (pageVisibleRef.current && pendingActions.length > 0 && shouldFlush()) {
        const actionsToSend = [...pendingActions];
        setPendingActions([]);
        flushPendingActions(actionsToSend);
      }
    }, BATCH_FLUSH_INTERVAL / 2);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, pendingActions, shouldFlush, flushPendingActions]);

  // =====================================================
  // PAGE VISIBILITY - ОТПРАВКА ПРИ УХОДЕ СО СТРАНИЦЫ
  // =====================================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      pageVisibleRef.current = document.visibilityState === 'visible';
      
      // Если пользователь уходит со страницы - отправляем всё сразу
      if (document.visibilityState === 'hidden' && pendingActions.length > 0) {
        const actionsToSend = [...pendingActions];
        setPendingActions([]);
        flushPendingActions(actionsToSend);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingActions, flushPendingActions]);

  // =====================================================
  // BEFOREUNLOAD - ОТПРАВКА ПРИ ЗАКРЫТИИ ВКЛАДКИ
  // =====================================================

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingActions.length > 0 && token && isAuthenticated) {
        // Используем sendBeacon для надежной отправки при закрытии
        const actionsData = JSON.stringify({
          actions: pendingActions.map(a => ({
            gameId: a.gameId,
            gameName: a.gameName,
            action: a.action,
          })),
        });

        navigator.sendBeacon(
          '/api/recommendations/swipe-action/batch',
          new Blob([actionsData], { type: 'application/json' })
        );

        console.log(`[BEFOREUNLOAD] Sent ${pendingActions.length} actions via sendBeacon`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingActions, token, isAuthenticated]);

  // =====================================================
  // SWIPE
  // =====================================================

  const handleSwipe =
    useCallback(
      async (
        direction:
          | "left"
          | "right"
          | "up",
      ) => {
        // ============================
        // PROTECTION
        // ============================

        if (
          swipeLockRef.current
        ) {
          return;
        }

        if (
          triggerSwipe
        ) {
          return;
        }

        const currentGame =
          games[
            currentIndex
          ];

        if (
          !currentGame
        ) {
          return;
        }

        swipeLockRef.current =
          true;

        try {
          // ============================
          // START ANIMATION
          // ============================

          setTriggerSwipe(
            direction,
          );

          // ============================
          // ADD TO PENDING BATCH (вместо немедленной отправки)
          // ============================

          if (
            direction !==
              "up" &&
            isAuthenticated &&
            token
          ) {
            const action: PendingSwipeAction = {
              gameId: currentGame.id,
              gameName: currentGame.name,
              action: direction === "right" ? 'like' : 'dislike',
              timestamp: Date.now(),
            };

            setPendingActions(prev => [...prev, action]);
            console.log(`[SWIPE] Added to batch: ${action.action} -> ${currentGame.name}`);
          }

          // ============================
          // UPDATE LOCAL STATE
          // ============================

          setStats(
            (
              prev,
            ) => ({
              likes:
                prev.likes +
                (direction ===
                "right"
                  ? 1
                  : 0),

              dislikes:
                prev.dislikes +
                (direction ===
                "left"
                  ? 1
                  : 0),

              skips:
                prev.skips +
                (direction ===
                "up"
                  ? 1
                  : 0),
            }),
          );

          setSwipedIds(
            (prev) => {
              const next =
                new Set(
                  prev,
                );

              next.add(
                currentGame.id,
              );

              return next;
            },
          );

          console.log(
            `[SWIPE] ${direction} -> ${currentGame.name}`,
          );
        } catch (error) {
          console.error(
            "[SWIPE ERROR]",
            error,
          );

          setTriggerSwipe(
            null,
          );

          swipeLockRef.current =
            false;
        }
      },
      [
        games,
        currentIndex,
        triggerSwipe,
        isAuthenticated,
        token,
      ],
    );

  // =====================================================
  // SWIPE COMPLETE
  // =====================================================

  const handleSwipeComplete =
    useCallback(() => {
      setCurrentIndex(
        (prev) =>
          prev + 1,
      );

      setTriggerSwipe(
        null,
      );

      setTimeout(
        () => {
          swipeLockRef.current =
            false;
        },

        250,
      );
    }, []);

  // =====================================================
  // KEYBOARD
  // =====================================================

  useEffect(() => {
    const onKeyDown = (
      e: KeyboardEvent,
    ) => {
      if (
        currentIndex >=
          games.length ||
        isLoading
      ) {
        return;
      }

      switch (
        e.key
      ) {
        case "ArrowLeft":
          handleSwipe(
            "left",
          );
          break;

        case "ArrowRight":
          handleSwipe(
            "right",
          );
          break;

        case "ArrowUp":
          handleSwipe(
            "up",
          );
          break;
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
  }, [
    currentIndex,
    games.length,
    isLoading,
    handleSwipe,
  ]);

  // =====================================================
  // WISHLIST
  // =====================================================

  const handleWishlist =
    useCallback(
      async (
        gameId: number,
      ) => {
        if (
          !token
        ) {
          return;
        }

        try {
          await fetch(
            `/api/games/${gameId}/wishlist`,
            {
              method:
                "POST",

              headers:
                {
                  Authorization: `Bearer ${token}`,
                },

              cache:
                "no-store",
            },
          );
        } catch (error) {
          console.error(
            error,
          );
        }
      },
      [token],
    );

  // =====================================================
  // RESTART
  // =====================================================

  const handleRestart =
    async () => {
      setGames([]);

      setCurrentIndex(0);

      setStats({
        likes: 0,
        dislikes: 0,
        skips: 0,
      });

      setHasMore(
        true,
      );

      hasMoreRef.current =
        true;

      setIsLoading(
        true,
      );

      await loadGamesBatch();
    };

  // =====================================================
  // EMPTY
  // =====================================================

  if (
    currentIndex >=
      games.length &&
    !isLoading &&
    games.length > 0 &&
    !hasMore
  ) {
    return (
      <div
        className={
          styles.container
        }
      >
        <div
          className={
            styles.emptyState
          }
        >
          <h1
            className={
              styles.title
            }
          >
            🎮 Игры
            закончились
          </h1>

          <p
            className={
              styles.subtitle
            }
          >
            Вы просмотрели
            все доступные
            игры
          </p>

          <div
            className={
              styles.stats
            }
          >
            <div
              className={
                styles.stat
              }
            >
              <span
                className={
                  styles.statValue
                }
              >
                {
                  stats.likes
                }
              </span>

              <span
                className={
                  styles.statLabel
                }
              >
                👍 Лайков
              </span>
            </div>

            <div
              className={
                styles.stat
              }
            >
              <span
                className={
                  styles.statValue
                }
              >
                {
                  stats.dislikes
                }
              </span>

              <span
                className={
                  styles.statLabel
                }
              >
                👎
                Дизлайков
              </span>
            </div>

            <div
              className={
                styles.stat
              }
            >
              <span
                className={
                  styles.statValue
                }
              >
                {
                  stats.skips
                }
              </span>

              <span
                className={
                  styles.statLabel
                }
              >
                ⏭️
                Пропущено
              </span>
            </div>
          </div>

          <div
            className={
              styles.actions
            }
          >
            <button
              className={
                styles.primaryButton
              }
              onClick={
                handleRestart
              }
            >
              Начать
              заново
            </button>

            <button
              className={
                styles.secondaryButton
              }
              onClick={() =>
                router.push(
                  "/games",
                )
              }
            >
              Каталог
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className={
        styles.container
      }
    >
      <title>
        PlayPulse |
        Свайпы
      </title>

      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.headerContent
          }
        >
          <p
            className={
              styles.pageSubtitle
            }
          >
            Когда не
            знаешь во
            что поиграть
          </p>
        </div>

        <div
          className={
            styles.mobileHint
          }
        >
          <p>
            👆 Свайп
            вправо —
            лайк,
            влево —
            дизлайк,
            вверх —
            пропуск
          </p>
        </div>

        <div
          className={
            styles.statsBar
          }
        >
          <span
            className={
              styles.statItem
            }
          >
            👍{" "}
            {
              stats.likes
            }
          </span>

          <span
            className={
              styles.statItem
            }
          >
            👎{" "}
            {
              stats.dislikes
            }
          </span>

          <span
            className={
              styles.statItem
            }
          >
            ⏭️{" "}
            {
              stats.skips
            }
          </span>
        </div>
      </header>

      <div
        className={
          styles.cardsContainer
        }
      >
        {!isAuthenticated ? (
          <AuthPopup
            overlay={
              false
            }
            onClose={() =>
              setShowAuthPopup(
                false,
              )
            }
          />
        ) : (
          <>
            {games
              .slice(
                currentIndex,
                currentIndex +
                  3,
              )
              .map(
                (
                  game,
                  index,
                ) => (
                  <SwipeCard
                    key={
                      game.id
                    }
                    game={
                      game
                    }
                    isActive={
                      index ===
                      0
                    }
                    isNext={
                      index ===
                      1
                    }
                    onSwipe={
                      handleSwipe
                    }
                    onWishlist={() =>
                      handleWishlist(
                        game.id,
                      )
                    }
                    triggerSwipe={
                      index ===
                      0
                        ? triggerSwipe
                        : null
                    }
                    onSwipeComplete={
                      index ===
                      0
                        ? handleSwipeComplete
                        : undefined
                    }
                  />
                ),
              )}
          </>
        )}
      </div>

      {(isLoading ||
        isPrefetching) && (
        <div
          className={
            styles.loadingIndicator
          }
        >
          <div
            className={
              styles.spinner
            }
          />

          <span>
            {isLoading
              ? "Загрузка..."
              : "Загружаем ещё игры..."}
          </span>
        </div>
      )}

      <SwipeControls
        onSwipe={
          handleSwipe
        }
        disabled={
          currentIndex >=
            games.length ||
          isLoading ||
          !!triggerSwipe
        }
        triggerSwipe={
          triggerSwipe
        }
        onSwipeComplete={
          handleSwipeComplete
        }
      />
    </div>
  );
}