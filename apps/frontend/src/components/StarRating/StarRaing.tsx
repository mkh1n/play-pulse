'use client';

import { useState, useRef, useEffect } from "react";
import styles from "./StarRating.module.css";
import Image from "next/image";

interface StarRatingProps {
  gameId: number;
  gameName?: string;
  token: String,
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
  
  const starsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  
  // Загружаем оценку при монтировании
  useEffect(() => {
    if (initialRating !== null) {
      setRating(initialRating);
      setIsRated(true);
    } else {
      loadUserRating();
    }
  }, [gameId, initialRating]);

  const loadUserRating = async () => {
    if (!token) {
      console.log("Токен не найден, пользователь не авторизован");
      return;
    }

    try {
      const response = await fetch(`/api/games/${gameId}/user-actions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const userRating = data.data?.rating;
        
        if (userRating) {
          setRating(userRating);
          setIsRated(true);
          console.log(`⭐ Загружена оценка для игры ${gameId}: ${userRating}`);
        } else {
          setRating(0);
          setIsRated(false);
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке оценки:", error);
    }
  };

  // Обновление или добавление оценки
  const updateRating = async (newRating: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`⭐ Устанавливаем оценку ${newRating} для игры ${gameId}`);
            if (!token) {
        console.error("Токен не найден");
        return;
      }

      // Отправляем оценку на сервер
      const response = await fetch(`/api/games/${gameId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: newRating }),
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setRating(newRating);
        setIsRated(newRating > 0);
        
        // Закрываем панель звезд
        setShowStars(false);
        setHoverRating(0);
        
        // Вызываем колбэк, если есть
        if (onRatingSubmit) {
          onRatingSubmit(newRating);
        }
        
        console.log(`✅ Оценка ${newRating} сохранена для игры ${gameId}`);
      } else {
        const errorData = await response.text();
        console.error(`❌ Ошибка при сохранении оценки ${response.status}:`, errorData);
      }
      
    } catch (error) {
      console.error("Ошибка при сохранении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление оценки (отдельный запрос DELETE)
  const removeRating = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`🗑️ Удаление оценки для игры ${gameId}`);
      
      if (!token) {
        console.error("Токен не найден");
        return;
      }

      // Отправляем DELETE запрос для удаления оценки
      const response = await fetch(`/api/games/${gameId}/rate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setRating(0);
        setIsRated(false);
        
        // Закрываем панель звезд
        setShowStars(false);
        setHoverRating(0);
        
        // Вызываем колбэк, если есть
        if (onRatingSubmit) {
          onRatingSubmit(0);
        }
        
        console.log(`✅ Оценка удалена для игры ${gameId}`);
      } else {
        const errorData = await response.text();
        console.error(`❌ Ошибка при удалении оценки ${response.status}:`, errorData);
      }
      
    } catch (error) {
      console.error("Ошибка при удалении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление оценки (обработчик клика)
  const handleRemoveRating = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await removeRating();
  };

  // Клик по звезде
  const handleStarClick = async (starIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (starIndex === rating) {
      // Если кликнули на звезду с текущей оценкой - удаляем оценку
      await removeRating();
    } else {
      // Иначе устанавливаем новую оценку
      await updateRating(starIndex);
    }
  };

  // ... остальные функции без изменений (handleMouseEnter, handleMouseLeave, toggleStars, etc.)

  const handleMouseEnter = (index: number) => {
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const toggleStars = () => {
    if (isLoading) return;
    
    if (!token) {
      console.log("Пользователь не авторизован, оценка недоступна");
      // Можно показать попап авторизации
      return;
    }
    
    setShowStars((prev) => !prev);
  };

  // Определяем, активна ли звезда
  const isStarActive = (starIndex: number): boolean => {
    const currentRating = hoverRating || rating;
    return starIndex <= currentRating;
  };

  // Закрытие панели
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowStars(false);
    setHoverRating(0);
  };

  // Закрытие при клике вне компонента
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

  // Закрытие при нажатии Escape
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

  // Полная версия
  return (
    <div className={`${styles.ratingBlock} ${className}`}>
      <button
        ref={buttonRef}
        className={`${styles.ratingBtn} ${isRated ? styles.rated : ""} ${isLoading ? styles.loading : ""}`}
        onClick={toggleStars}
        disabled={isLoading}
        aria-label={isRated ? `Ваша оценка: ${rating}` : `Оценить игру`}
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
                <span className={styles.ratingLabel}>Вы поставили:</span>
                <span className={styles.ratingValue}>{rating}</span>
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
            {showLabel && <span className={styles.ratingLabel}>Оценить игру</span>}
          </span>
        )}
      </button>
      
      {showStars && (
        <div ref={starsRef} className={styles.ratingHolder}>
          <div className={styles.ratingHeader}>
            <h4 className={styles.ratingTitle}>
              {gameName ? `Оценить "${gameName}"` : "Ваша оценка"}
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
                  onMouseEnter={() => handleMouseEnter(starIndex)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={styles.starButton}
                    onClick={(e) => handleStarClick(starIndex, e)}
                    aria-label={starIndex === rating ? `Удалить оценку ${starIndex}` : `Оценить на ${starIndex}`}
                    disabled={isLoading}
                  >
                    <Image
                      src="/icons/star.svg"
                      alt={`Оценка ${starIndex}`}
                      width={32}
                      height={32}
                      className={`${styles.ratingStar} ${
                        isStarActive(starIndex) ? styles.active : ""
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
                <span className={styles.hoverHint}>Оценить на {hoverRating}</span>
              ) : isRated ? (
                <span className={styles.currentHint}>Текущая оценка: {rating}</span>
              ) : (
                <span>Наведите на звезду для предпросмотра</span>
              )}
            </div>
            
            {isRated && (
              <button
                type="button"
                className={styles.removeRatingBtn}
                onClick={handleRemoveRating}
                aria-label="Удалить оценку"
                disabled={isLoading}
              >
                {isLoading ? "Удаление..." : "Удалить оценку"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}