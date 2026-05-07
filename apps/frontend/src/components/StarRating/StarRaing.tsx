"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./StarRating.module.css";
import Image from "next/image";
import AuthPopup from "@/components/AuthPopup/AuthPopup";

interface StarRatingProps {
  gameId: number;
  gameName?: string;
  token: string;
  className?: string;
  onRatingSubmit?: (rating: number) => void;
  showLabel?: boolean;
  initialRating?: number | null;
  compact?: boolean;
}

export default function StarRating({
  gameId,
  gameName,
  token,
  className = "",
  onRatingSubmit,
  showLabel = true,
  initialRating = null,
  compact = false,
}: StarRatingProps) {
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showStars, setShowStars] = useState<boolean>(false);
  const [isRated, setIsRated] = useState<boolean>(!!initialRating);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 🔥 popup auth
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const starsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialRating !== null) {
      setRating(initialRating);
      setIsRated(true);
    } else {
      loadUserRating();
    }
  }, [gameId, initialRating]);

  const loadUserRating = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/games/${gameId}/user-actions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userRating = data.data?.rating;

        if (userRating) {
          setRating(userRating);
          setIsRated(true);
        } else {
          setRating(0);
          setIsRated(false);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке оценки:", error);
    }
  };

  const updateRating = async (newRating: number) => {
    if (isLoading) return;

    // 🔥 auth check
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/games/${gameId}/rate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: newRating }),
      });

      if (response.ok) {
        setRating(newRating);
        setIsRated(newRating > 0);

        setShowStars(false);
        setHoverRating(0);

        onRatingSubmit?.(newRating);
      } else {
        const errorData = await response.text();
        console.error(
          `❌ Ошибка при сохранении оценки ${response.status}:`,
          errorData
        );
      }
    } catch (error) {
      console.error("Ошибка при сохранении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeRating = async () => {
    if (isLoading) return;

    // 🔥 auth check
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/games/${gameId}/rate`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setRating(0);
        setIsRated(false);

        setShowStars(false);
        setHoverRating(0);

        onRatingSubmit?.(0);
      } else {
        const errorData = await response.text();
        console.error(
          `❌ Ошибка при удалении оценки ${response.status}:`,
          errorData
        );
      }
    } catch (error) {
      console.error("Ошибка при удалении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRating = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await removeRating();
  };

  const handleStarClick = async (
    starIndex: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // 🔥 auth check
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    if (starIndex === rating) {
      await removeRating();
    } else {
      await updateRating(starIndex);
    }
  };

  const handleMouseEnter = (index: number) => {
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const toggleStars = () => {
    if (isLoading) return;

    // 🔥 auth popup
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    setShowStars((prev) => !prev);
  };

  const isStarActive = (starIndex: number): boolean => {
    const currentRating = hoverRating || rating;
    return starIndex <= currentRating;
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setShowStars(false);
    setHoverRating(0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        starsRef.current &&
        buttonRef.current &&
        !starsRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowStars(false);
        setHoverRating(0);
      }
    };

    if (showStars) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStars]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showStars) {
        setShowStars(false);
        setHoverRating(0);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showStars]);

  return (
    <>
      <div className={`${styles.ratingBlock} ${className}`}>
        <button
          ref={buttonRef}
          className={`${styles.ratingBtn} ${
            isRated ? styles.rated : ""
          } ${isLoading ? styles.loading : ""}`}
          onClick={toggleStars}
          disabled={isLoading}
          aria-label={
            isRated ? `Ваша оценка: ${rating}` : `Оценить игру`
          }
        >
          {isLoading ? (
            <span className={styles.loadingText}>...</span>
          ) : isRated ? (
            <span className={styles.ratedContent}>
              <Image
                src="/icons/star.svg"
                alt="star"
                width={20}
                height={20}
                className={styles.ratingFillIcon}
                priority
              />

              {showLabel && (
                <>
                  <span className={styles.ratingLabel}>
                    Вы поставили:
                  </span>

                  <span className={styles.ratingValue}>
                    {rating}
                  </span>
                </>
              )}
            </span>
          ) : (
            <span className={styles.unratedContent}>
              <Image
                src="/icons/star-empty.svg"
                alt="star"
                width={20}
                height={20}
                className={styles.ratingEmptyIcon}
                priority
              />

              {showLabel && (
                <span className={styles.ratingLabel}>
                  Оценить игру
                </span>
              )}
            </span>
          )}
        </button>

        {showStars && (
          <div ref={starsRef} className={styles.ratingHolder}>
            <div className={styles.ratingHeader}>
              <h4 className={styles.ratingTitle}>
                {gameName
                  ? `Оценить "${gameName}"`
                  : "Ваша оценка"}
              </h4>

              <button
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className={styles.starsRow}>
              {[...Array(10)].map((_, index) => {
                const starIndex = index + 1;

                return (
                  <div
                    key={starIndex}
                    className={styles.starWrapper}
                    onMouseEnter={() =>
                      handleMouseEnter(starIndex)
                    }
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      className={styles.starButton}
                      onClick={(e) =>
                        handleStarClick(starIndex, e)
                      }
                      disabled={isLoading}
                    >
                      <Image
                        src="/icons/star.svg"
                        alt={`Оценка ${starIndex}`}
                        width={32}
                        height={32}
                        className={`${styles.ratingStar} ${
                          isStarActive(starIndex)
                            ? styles.active
                            : ""
                        }`}
                        priority
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className={styles.ratingFooter}>
              <div className={styles.hint}>
                {hoverRating > 0 ? (
                  <span className={styles.hoverHint}>
                    Оценить на {hoverRating}
                  </span>
                ) : isRated ? (
                  <span className={styles.currentHint}>
                    Текущая оценка: {rating}
                  </span>
                ) : (
                  <span>
                    Наведите на звезду для предпросмотра
                  </span>
                )}
              </div>

              {isRated && (
                <button
                  type="button"
                  className={styles.removeRatingBtn}
                  onClick={handleRemoveRating}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Удаление..."
                    : "Удалить оценку"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 AUTH POPUP */}
      {showAuthPopup && (
        <AuthPopup
          onClose={() => setShowAuthPopup(false)}
        />
      )}
    </>
  );
}