// components/WatchlistButton/WatchlistButton.tsx
'use client';

import { useState, useEffect } from "react";
import styles from "./WatchlistButton.module.css";
import Image from "next/image";
import { useMediaActions } from "@/hooks/useMediaActions";
import { TMDBMediaItem } from "@/types/tmdb";
import { MediaType } from "@/types/storage";

interface WishlistButtonProps {
  mediaId: number;
  mediaType: MediaType;
  mediaData?: TMDBMediaItem;
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  onToggle?: (isInWatchlist: boolean) => void;
}

export default function WishlistButton({
  mediaId,
  mediaType,
  mediaData,
  className = "",
  showLabel = true,
  size = 'medium',
  onToggle,
}: WishlistButtonProps) {
  const [isInWatchlist, setisInWatchlist] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  const { toggleWatchlist, isInWatchlist: checkWatchlist, ensureMediaCached } = useMediaActions();

  // Кэшируем медиа при монтировании
  useEffect(() => {
    if (mediaData) {
      ensureMediaCached(mediaData, mediaType);
    }
  }, [mediaData, mediaType, mediaId, ensureMediaCached]);

  // Проверяем состояние при монтировании
  useEffect(() => {
    const checkStatus = () => {
      try {
        const watchlistStatus = checkWatchlist(mediaId, mediaType);
        setisInWatchlist(watchlistStatus);
      } catch (error) {
        console.error("Ошибка при проверке статуса просмотра:", error);
      }
    };

    checkStatus();
  }, [mediaId, mediaType, checkWatchlist]);

  const handleToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Если добавляем в просмотренные, показываем подтверждение
      if (!isInWatchlist) {
        setShowConfirmation(true);
        // Автоматически скрываем через 2 секунды
        setTimeout(() => setShowConfirmation(false), 2000);
      }
      
      // Переключаем состояние
      toggleWatchlist(mediaId, mediaType, mediaData);
      const newStatus = !isInWatchlist;
      setisInWatchlist(newStatus);
      
      // Вызываем колбэк, если есть
      if (onToggle) {
        onToggle(newStatus);
      }
      
      console.log(`👁️ ${newStatus ? 'Добавлено' : 'Удалено'} из Смотреть позже: ${mediaType}_${mediaId}`);
    } catch (error) {
      console.error("Ошибка при переключении статуса просмотра:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем текст кнопки в зависимости от состояния
  const getButtonText = () => {
    if (isInWatchlist) {
      return showLabel ? "Есть в мотреть позже" : "";
    } else {
      return showLabel ? "В Смореть позже" : "";
    }
  };

  // Получаем размеры иконки
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      case 'medium':
      default: return 20;
    }
  };

  // Получаем классы в зависимости от размера
  const getSizeClass = () => {
    switch (size) {
      case 'small': return styles.small;
      case 'large': return styles.large;
      case 'medium':
      default: return styles.medium;
    }
  };

  return (
    <div className={`${styles.watchlistButtonContainer} ${className}`}>
      <button
        className={`${styles.watchlistButton} ${getSizeClass()} ${isInWatchlist ? styles.watchlist : ""} ${isLoading ? styles.loading : ""}`}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isInWatchlist ? "Убрать из Смотреть позже" : "В Смотреть позже"}
        title={isInWatchlist ? "Убрать из Смотреть позже" : "В Смотреть позже"}
      >
        {isLoading ? (
          <span className={styles.loadingSpinner} />
        ) : (
          <>
            <Image
              src={isInWatchlist ? "/icons/bookmark.svg" : "/icons/bookmark-empty.svg"}
              alt={isInWatchlist ? "Уже есть в Смотреть позже" : "Нет в Смотреть позже"}
              width={getIconSize()}
              height={getIconSize()}
              className={styles.watchlistIcon}
              priority
            />
            {showLabel && (
              <span className={styles.watchlistLabel}>
                {getButtonText()}
              </span>
            )}
          </>
        )}
      </button>
      
      {showConfirmation && !isLoading && (
        <div className={styles.confirmationMessage}>
          <Image
            src="/icons/check.svg"
            alt="✓"
            width={16}
            height={16}
            className={styles.confirmationIcon}
          />
          <span>Добавлено в Смотреть позже</span>
        </div>
      )}
    </div>
  );
}