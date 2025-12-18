// components/StarRating/StarRating.tsx
'use client';

import { useState, useRef, useEffect } from "react";
import styles from "./StarRating.module.css";
import Image from "next/image";
import { useMediaActions } from "@/hooks/useMediaActions";
import { TMDBMediaItem } from "@/types/tmdb";
import { MediaType } from "@/types/storage";

interface StarRatingProps {
  mediaId: number;
  mediaType: MediaType;
  mediaData?: TMDBMediaItem;
  className?: string;
  onRatingSubmit?: (rating: number) => void;
  showLabel?: boolean;
}

export default function StarRating({
  mediaId,
  mediaType,
  mediaData,
  className = "",
  onRatingSubmit,
  showLabel = true,
}: StarRatingProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showStars, setShowStars] = useState<boolean>(false);
  const [isRated, setIsRated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const starsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { 
    setRating: saveRatingToStore, 
    getRating: getRatingFromStore, 
    ensureMediaCached,
    userDataStore // Добавляем доступ к userDataStore
  } = useMediaActions();

  // Определяем тип медиа для текста
  const getMediaTypeLabel = (): string => {
    switch (mediaType) {
      case 'movie': return 'фильм';
      case 'tv': return 'сериал';
      case 'person': return 'персону';
      default: return 'медиа';
    }
  };

  // Кэшируем медиа при монтировании
  useEffect(() => {
    if (mediaData) {
      ensureMediaCached(mediaData, mediaType);
      console.log(`💾 StarRating: Медиа ${mediaType}_${mediaId} кэшировано`);
    }
  }, [mediaData, mediaType, mediaId, ensureMediaCached]);

  // Загружаем оценку из хранилища при монтировании
  useEffect(() => {
    const loadRating = () => {
      try {
        const savedRating = getRatingFromStore(mediaId, mediaType);
        
        if (savedRating !== null && savedRating > 0) {
          setRating(savedRating);
          setIsRated(true);
          console.log(`⭐ Загружена оценка для ${mediaType}_${mediaId}: ${savedRating}`);
        } else {
          setRating(0);
          setIsRated(false);
        }
      } catch (error) {
        console.error("Ошибка при загрузке оценки:", error);
        setRating(0);
        setIsRated(false);
      }
    };

    loadRating();
  }, [mediaId, mediaType, getRatingFromStore]);

  // Обновление оценки
  const updateRating = async (newRating: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`⭐ Устанавливаем оценку ${newRating} для ${mediaType}_${mediaId}`);
      
      // Сохраняем в хранилище
      saveRatingToStore(mediaId, mediaType, newRating);
      
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
      
    } catch (error) {
      console.error("Ошибка при сохранении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление оценки (полное удаление записи)
  const handleRemoveRating = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log(`🗑️ Полное удаление оценки для ${mediaType}_${mediaId}`);
      
      // Используем метод removeRating из userDataStore
      userDataStore.removeRating(mediaId, mediaType);
      
      // Обновляем локальное состояние
      setRating(0);
      setIsRated(false);
      
      // Закрываем панель
      setShowStars(false);
      setHoverRating(0);
      
      // Вызываем колбэк, если есть
      if (onRatingSubmit) {
        onRatingSubmit(0);
      }
      
    } catch (error) {
      console.error("Ошибка при удалении оценки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Клик по звезде: если кликаем на текущую оценку - удаляем, иначе устанавливаем новую
  const handleStarClick = (starIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (starIndex === rating) {
      // Если кликнули на звезду с текущей оценкой - удаляем оценку
      handleRemoveRating(e);
    } else {
      // Иначе устанавливаем новую оценку
      updateRating(starIndex);
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
    setShowStars((prev) => !prev);
  };

  // Определяем, активна ли звезда - все звезды от 1 до текущей (или hover) должны быть активны
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

  return (
    <div className={`${styles.ratingBlock} ${className}`}>
      <button
        ref={buttonRef}
        className={`${styles.ratingBtn} ${isRated ? styles.rated : ""} ${isLoading ? styles.loading : ""}`}
        onClick={toggleStars}
        disabled={isLoading}
        aria-label={isRated ? `Ваша оценка: ${rating}` : `Оценить ${getMediaTypeLabel()}`}
      >
        {isLoading ? (
          <span className={styles.loadingText}>Загрузка...</span>
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
                <span className={styles.ratingLabel}>Ваша оценка:</span>
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
            {showLabel && <span className={styles.ratingLabel}>Оценить {getMediaTypeLabel()}</span>}
          </span>
        )}
      </button>
      
      {showStars && (
        <div ref={starsRef} className={styles.ratingHolder}>
          <div className={styles.ratingHeader}>
            <h4 className={styles.ratingTitle}>Ваша оценка</h4>
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