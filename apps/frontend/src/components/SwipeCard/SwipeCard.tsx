"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import styles from "./SwipeCard.module.css";

import { proxifyImage } from '@/services/gameService'

interface SwipeCardProps {
  game: any;
  isActive: boolean;
  isNext?: boolean;
  triggerSwipe?: "left" | "right" | "up" | null;
  onSwipeComplete?: () => void;
  onSwipe: (
    direction: "left" | "right" | "up",
  ) => void;
  onWishlist: () => Promise<void>;
}

const SWIPE_THRESHOLD = 120;

const renderGameDescription = (
  html?: string,
) => {
  if (!html) {
    return "";
  }

  return html
    .replace(
      /<iframe.*?<\/iframe>/gis,
      "",
    )
    .replace(
      /<script.*?<\/script>/gis,
      "",
    )
    .replace(
      /<style.*?<\/style>/gis,
      "",
    )
    .replace(/\n/g, "<br />");
};

export default function SwipeCard({
  game,
  isActive,
  isNext,
  triggerSwipe,
  onSwipeComplete,
  onSwipe,
  onWishlist,
}: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const [dragOffset, setDragOffset] =
    useState({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState(false);

  const [leaveDirection, setLeaveDirection] =
    useState<
      "left" | "right" | "up" | null
    >(null);

  const [showFullInfo, setShowFullInfo] =
    useState(false);

  const [isLoadingFullInfo, setIsLoadingFullInfo] =
    useState(false);

  const [fullGameData, setFullGameData] =
    useState<any>(null);

  const [wishlistLoading, setWishlistLoading] =
    useState(false);

  const startPosition = useRef({
    x: 0,
    y: 0,
  });

  const gameData = useMemo(
    () => fullGameData || game,
    [fullGameData, game],
  );

  const shortDescription = useMemo(() => {
    const description =
      game.description_raw ||
      game.description ||
      "";

    const trimmed = description.slice(
      0,
      320,
    );

    return renderGameDescription(
      description.length > 320
        ? `${trimmed}...`
        : trimmed,
    );
  }, [game]);

  useEffect(() => {
    if (!triggerSwipe || !isActive) {
      return;
    }

    setLeaveDirection(triggerSwipe);

    const timeout = setTimeout(() => {
      onSwipe(triggerSwipe);

      setDragOffset({
        x: 0,
        y: 0,
      });

      setLeaveDirection(null);

      onSwipeComplete?.();
    }, 200);

    return () => clearTimeout(timeout);
  }, [
    triggerSwipe,
    isActive,
    onSwipe,
    onSwipeComplete,
  ]);

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (!isActive || showFullInfo) {
        return;
      }
      const target = event.target as HTMLElement;

      if (
        target.closest("button") ||
        target.closest("a")
      ) {
        return;
      }
      setIsDragging(true);

      startPosition.current = {
        x: event.clientX,
        y: event.clientY,
      };

      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    },
    [isActive, showFullInfo],
  );

  const handlePointerMove = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        !isDragging ||
        !isActive ||
        showFullInfo
      ) {
        return;
      }

      const deltaX =
        event.clientX -
        startPosition.current.x;

      const deltaY =
        event.clientY -
        startPosition.current.y;

      setDragOffset({
        x: deltaX,
        y: deltaY,
      });
    },
    [
      isDragging,
      isActive,
      showFullInfo,
    ],
  );

  const handleSwipe = useCallback(
    (
      direction: "left" | "right" | "up",
    ) => {
      setLeaveDirection(direction);

      setTimeout(() => {
        onSwipe(direction);

        setDragOffset({
          x: 0,
          y: 0,
        });

        setLeaveDirection(null);
      }, 200);
    },
    [onSwipe],
  );

  const handlePointerUp = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        !isDragging ||
        !isActive ||
        showFullInfo
      ) {
        return;
      }

      setIsDragging(false);

      const absX = Math.abs(
        dragOffset.x,
      );

      const absY = Math.abs(
        dragOffset.y,
      );

      let direction:
        | "left"
        | "right"
        | "up"
        | null = null;

      if (
        absY > absX &&
        dragOffset.y <
        -SWIPE_THRESHOLD
      ) {
        direction = "up";
      } else if (
        dragOffset.x >
        SWIPE_THRESHOLD
      ) {
        direction = "right";
      } else if (
        dragOffset.x <
        -SWIPE_THRESHOLD
      ) {
        direction = "left";
      }

      if (direction) {
        handleSwipe(direction);
      } else {
        setDragOffset({
          x: 0,
          y: 0,
        });
      }

      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    },
    [
      isDragging,
      isActive,
      showFullInfo,
      dragOffset,
      handleSwipe,
    ],
  );

  const handleWishlist = async () => {
    if (wishlistLoading) {
      return;
    }

    try {
      setWishlistLoading(true);

      await onWishlist();
    } catch (error) {
      console.error(error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleOpenFullInfo = async () => {
    setShowFullInfo(true);

    if (fullGameData) {
      return;
    }

    try {
      setIsLoadingFullInfo(true);

      const response = await fetch(
        `/api/games/${game.id}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load game",
        );
      }

      const data = await response.json();

      setFullGameData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingFullInfo(false);
    }
  };

  const transform = useMemo(() => {
    if (leaveDirection === "left") {
      return "translate(-140%, 0) rotate(-20deg)";
    }

    if (leaveDirection === "right") {
      return "translate(140%, 0) rotate(20deg)";
    }

    if (leaveDirection === "up") {
      return "translate(0, -140%) rotate(10deg)";
    }

    if (isActive) {
      return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.04}deg)`;
    }

    if (isNext) {
      return "scale(0.96) translateY(16px)";
    }

    return "scale(0.92) translateY(24px)";
  }, [
    leaveDirection,
    isActive,
    isNext,
    dragOffset,
  ]);

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${isActive
          ? styles.active
          : isNext
            ? styles.next
            : styles.inactive
        }`}
      style={{
        transform,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {dragOffset.x > 50 && (
        <div className={styles.likeStamp}>
          LIKE
        </div>
      )}

      {dragOffset.x < -50 && (
        <div className={styles.nopeStamp}>
          NOPE
        </div>
      )}

      {dragOffset.y < -50 && (
        <div className={styles.skipStamp}>
          SKIP
        </div>
      )}

      <div className={styles.imageContainer}>
        <Image
          src={proxifyImage(
            game.background_image,
          )}
          alt={game.name}
          fill
          className={styles.image}
          priority={isActive}
        />

        <div className={styles.gradient} />
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>
          {game.name}
        </h2>

        <div className={styles.meta}>
          {game.rating > 0 && (
            <div className={styles.rating}>
              ⭐ {game.rating.toFixed(1)}
            </div>
          )}

          {game.metacritic && (
            <div
              className={styles.metacritic}
            >
              {game.metacritic}
            </div>
          )}

          {game.released && (
            <div className={styles.year}>
              {new Date(
                game.released,
              ).getFullYear()}
            </div>
          )}

          {game.added && (
            <div className={styles.added}>
              👥 {game.added}
            </div>
          )}
        </div>

        {game.genres?.length > 0 && (
          <div className={styles.genres}>
            {game.genres
              .slice(0, 4)
              .map((genre: any) => (
                <span
                  key={genre.id}
                  className={styles.genre}
                >
                  {genre.name}
                </span>
              ))}
          </div>
        )}

        {(game.description_raw ||
          game.description) && (
            <div
              className={
                styles.descriptionShort
              }
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: shortDescription,
                }}
              />
            </div>
          )}

        <div className={styles.actions}>
          <button
            className={styles.moreButton}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFullInfo();
            }}
          >
            Подробнее
          </button>

          <Link
            href={`/games/${game.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            className={styles.gameLink}
          >
            Открыть
          </Link>

          <button
            className={styles.wishlistButton}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleWishlist();
            }}
            disabled={wishlistLoading}
          >
            ❤️
          </button>
        </div>
      </div>

      {showFullInfo && (
        <div
          className={styles.fullInfoPopup}
          onClick={() =>
            setShowFullInfo(false)
          }
        >
          <div
            className={
              styles.fullInfoContent
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className={styles.closePopup}
              onClick={() =>
                setShowFullInfo(false)
              }
            >
              ✕
            </button>

            {isLoadingFullInfo ? (
              <div>
                Загрузка...
              </div>
            ) : (
              <>
                <h2
                  className={
                    styles.fullInfoTitle
                  }
                >
                  {gameData.name}
                </h2>

                <div
                  className={
                    styles.fullInfoMeta
                  }
                >
                  <div
                    className={
                      styles.fullInfoStat
                    }
                  >
                    <span
                      className={
                        styles.fullInfoStatLabel
                      }
                    >
                      Рейтинг
                    </span>

                    <span
                      className={
                        styles.fullInfoStatValue
                      }
                    >
                      ⭐ {gameData.rating}
                    </span>
                  </div>

                  <div
                    className={
                      styles.fullInfoStat
                    }
                  >
                    <span
                      className={
                        styles.fullInfoStatLabel
                      }
                    >
                      Metacritic
                    </span>

                    <span
                      className={
                        styles.fullInfoStatValue
                      }
                    >
                      {gameData.metacritic ||
                        "—"}
                    </span>
                  </div>
                </div>

                {(gameData.description ||
                  gameData.description_raw) && (
                    <div
                      className={
                        styles.fullInfoSection
                      }
                    >
                      <h3>Описание</h3>

                      <div
                        className={
                          styles.fullInfoDescription
                        }
                        dangerouslySetInnerHTML={{
                          __html:
                            renderGameDescription(
                              gameData.description ||
                              gameData.description_raw,
                            ),
                        }}
                      />
                    </div>
                  )}

                {gameData.genres?.length >
                  0 && (
                    <div
                      className={
                        styles.fullInfoSection
                      }
                    >
                      <h3>Жанры</h3>

                      <div
                        className={
                          styles.fullInfoTags
                        }
                      >
                        {gameData.genres.map(
                          (genre: any) => (
                            <span
                              key={genre.id}
                              className={
                                styles.fullInfoTag
                              }
                            >
                              {genre.name}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

