// components/FavoriteButton/FavoriteButton.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "./FavoriteButton.module.css";
import Image from "next/image";
import { useMediaActions } from "@/hooks/useMediaActions";
import { TMDBMediaItem } from "@/types/tmdb";
import { MediaType } from "@/types/storage";

interface FavoriteButtonProps {
  mediaId: number;
  mediaType: MediaType;
  mediaData?: TMDBMediaItem;
  className?: string;
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "default" | "icon-only" | "outline";
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({
  mediaId,
  mediaType,
  mediaData,
  className = "",
  showLabel = true,
  size = "medium",
  variant = "default",
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const {
    toggleFavorite,
    isFavorite: checkFavorite,
    ensureMediaCached,
  } = useMediaActions();

  // Кэшируем медиа при монтировании
  useEffect(() => {
    if (mediaData) {
      ensureMediaCached(mediaData, mediaType);
      console.log(
        `⭐ FavoriteButton: Медиа ${mediaType}_${mediaId} кэшировано`
      );
    }
  }, [mediaData, mediaType, mediaId, ensureMediaCached]);

  // Проверяем состояние при монтировании
  useEffect(() => {
    const checkStatus = () => {
      try {
        const favoriteStatus = checkFavorite(mediaId, mediaType);
        setIsFavorite(favoriteStatus);
      } catch (error) {
        console.error("Ошибка при проверке статуса избранного:", error);
      }
    };

    checkStatus();
  }, [mediaId, mediaType, checkFavorite]);

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Запускаем анимацию
      if (!isFavorite) {
        setIsAnimating(true);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 2000);

        setTimeout(() => setIsAnimating(false), 600);
      }

      // Переключаем состояние
      toggleFavorite(mediaId, mediaType, mediaData);
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);

      // Вызываем колбэк, если есть
      if (onToggle) {
        onToggle(newStatus);
      }

      console.log(
        `⭐ ${
          newStatus ? "Добавлено" : "Удалено"
        } из избранного: ${mediaType}_${mediaId}`
      );
    } catch (error) {
      console.error("Ошибка при переключении избранного:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем текст кнопки
  const getButtonText = () => {
    if (isFavorite) {
      return showLabel ? "В избранном" : "";
    } else {
      return showLabel ? "В избранное" : "";
    }
  };

  // Получаем размеры иконки
  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 24;
      case "medium":
      default:
        return 20;
    }
  };

  // Получаем классы в зависимости от размера и варианта
  const getButtonClasses = () => {
    const sizeClass = styles[size];
    const variantClass = styles[variant];
    const stateClass = isFavorite ? styles.favorite : "";
    const loadingClass = isLoading ? styles.loading : "";

    return `${styles.favoriteButton} ${sizeClass} ${variantClass} ${stateClass} ${loadingClass}`;
  };

  // Получаем путь к иконке
  const getIconPath = () => {
    if (isFavorite) {
      return "/icons/heart.svg";
    } else {
      return "/icons/heart-empty.svg";
    }
  };

  return (
    <div className={`${styles.favoriteButtonContainer} ${className}`}>
      <button
        className={getButtonClasses()}
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={
          isFavorite ? "Убрать из избранного" : "Добавить в избранное"
        }
        title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
      >
        <div
          className={`${styles.iconWrapper} ${isAnimating ? styles.pulse : ""}`}
        >
          <Image
            src={getIconPath()}
            alt={isFavorite ? "В избранном" : "Добавить в избранное"}
            width={getIconSize()}
            height={getIconSize()}
            className={styles.favoriteIcon}
            priority
          />
        </div>

        {showLabel && variant !== "icon-only" && (
          <span className={styles.favoriteLabel}>{getButtonText()}</span>
        )}
      </button>

      {isAnimating && (
        <div className={styles.particles}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={styles.particle}
              style={
                {
                  "--particle-index": i,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      {showConfirmation && !isLoading && (
        <div className={styles.confirmationMessage}>
          <Image
            src="/icons/check.svg"
            alt="✓"
            width={16}
            height={16}
            className={styles.confirmationIcon}
          />
          <span>Добавлено в избранное</span>
        </div>
      )}
    </div>
  );
}
