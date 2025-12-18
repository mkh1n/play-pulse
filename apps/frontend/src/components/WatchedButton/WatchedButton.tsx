// components/WatchedButton/WatchedButton.tsx
'use client';

import { useState, useEffect } from "react";
import styles from "./WatchedButton.module.css";
import Image from "next/image";
import { useMediaActions } from "@/hooks/useMediaActions";
import { TMDBMediaItem } from "@/types/tmdb";
import { MediaType } from "@/types/storage";

interface WatchedButtonProps {
  mediaId: number;
  mediaType: MediaType;
  mediaData?: TMDBMediaItem;
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  onToggle?: (isWatched: boolean) => void;
}

export default function WatchedButton({
  mediaId,
  mediaType,
  mediaData,
  className = "",
  showLabel = true,
  size = 'medium',
  onToggle,
}: WatchedButtonProps) {
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  const { toggleWatched, isWatched: checkWatched, ensureMediaCached } = useMediaActions();

  // Кэшируем медиа при монтировании
  useEffect(() => {
    if (mediaData) {
      ensureMediaCached(mediaData, mediaType);
      console.log(`👁️ WatchedButton: Медиа ${mediaType}_${mediaId} кэшировано`);
    }
  }, [mediaData, mediaType, mediaId, ensureMediaCached]);

  // Проверяем состояние при монтировании
  useEffect(() => {
    const checkStatus = () => {
      try {
        const watchedStatus = checkWatched(mediaId, mediaType);
        setIsWatched(watchedStatus);
      } catch (error) {
        console.error("Ошибка при проверке статуса просмотра:", error);
      }
    };

    checkStatus();
  }, [mediaId, mediaType, checkWatched]);

  const handleToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Если добавляем в просмотренные, показываем подтверждение
      if (!isWatched) {
        setShowConfirmation(true);
        // Автоматически скрываем через 2 секунды
        setTimeout(() => setShowConfirmation(false), 2000);
      }
      
      // Переключаем состояние
      toggleWatched(mediaId, mediaType, mediaData);
      const newStatus = !isWatched;
      setIsWatched(newStatus);
      
      // Вызываем колбэк, если есть
      if (onToggle) {
        onToggle(newStatus);
      }
      
      console.log(`👁️ ${newStatus ? 'Добавлено' : 'Удалено'} из просмотренных: ${mediaType}_${mediaId}`);
    } catch (error) {
      console.error("Ошибка при переключении статуса просмотра:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем текст кнопки в зависимости от состояния
  const getButtonText = () => {
    if (isWatched) {
      return showLabel ? "Просмотрено" : "";
    } else {
      return showLabel ? "В просмотренное" : "";
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
    <div className={`${styles.watchedButtonContainer} ${className}`}>
      <button
        className={`${styles.watchedButton} ${getSizeClass()} ${isWatched ? styles.watched : ""} ${isLoading ? styles.loading : ""}`}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isWatched ? "Убрать из просмотренных" : "В просмотренное"}
        title={isWatched ? "Убрать из просмотренных" : "В просмотренное"}
      >
        {isLoading ? (
          <span className={styles.loadingSpinner} />
        ) : (
          <>
            <Image
              src={isWatched ? "/icons/eye.svg" : "/icons/eye-closed.svg"}
              alt={isWatched ? "Просмотрено" : "Не просмотрено"}
              width={getIconSize()}
              height={getIconSize()}
              className={styles.watchedIcon}
              priority
            />
            {showLabel && (
              <span className={styles.watchedLabel}>
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
          <span>Добавлено в просмотренное</span>
        </div>
      )}
    </div>
  );
}