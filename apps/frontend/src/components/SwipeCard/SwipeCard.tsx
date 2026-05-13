"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./SwipeCard.module.css";
import { proxifyImage } from "@/services/gameService";

interface SwipeCardProps {
  game: any;
  onSwipe: (direction: "left" | "right" | "up") => void;
  onWishlist: () => Promise<void>;
  isActive: boolean;
  isNext?: boolean;
  triggerSwipe?: "left" | "right" | "up" | null;
  onSwipeComplete?: () => void;
}

export default function SwipeCard({
  game,
  onSwipe,
  onWishlist,
  isActive,
  isNext,
  triggerSwipe,
  onSwipeComplete,
}: SwipeCardProps) {
  const { token } = useAuth();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLeaving, setIsLeaving] = useState<"left" | "right" | "up" | null>(null);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showFullInfo, setShowFullInfo] = useState(false);

  const startPos = useRef({ x: 0, y: 0 });

  // 🔥 ПК свайп (оставлен, но переписан БЕЗ лагов)
  useEffect(() => {
    if (triggerSwipe && isActive) {
      setIsLeaving(triggerSwipe);

      setTimeout(() => {
        onSwipe(triggerSwipe);
        setDragOffset({ x: 0, y: 0 });
        setIsLeaving(null);
        onSwipeComplete?.();
      }, 200);
    }
  }, [triggerSwipe, isActive]);

  // 👉 DOWN
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive || showFullInfo) return;

      setIsDragging(true);
      startPos.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [isActive, showFullInfo]
  );

  // 👉 MOVE
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !isActive || showFullInfo) return;

      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;

      setDragOffset({ x: dx, y: dy });
    },
    [isDragging, isActive, showFullInfo]
  );

  // 👉 UP (главное изменение)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !isActive || showFullInfo) return;

      setIsDragging(false);

      const threshold = 100;
      const absX = Math.abs(dragOffset.x);
      const absY = Math.abs(dragOffset.y);

      let direction: "left" | "right" | "up" | null = null;

      if (absX > threshold || absY > threshold) {
        if (absY > absX && dragOffset.y < -threshold) {
          direction = "up";
        } else if (dragOffset.x > threshold) {
          direction = "right";
        } else if (dragOffset.x < -threshold) {
          direction = "left";
        }
      }

      if (direction) {
        setIsLeaving(direction);

        setTimeout(() => {
          onSwipe(direction!);
          setDragOffset({ x: 0, y: 0 });
          setIsLeaving(null);
        }, 200);
      } else {
        setDragOffset({ x: 0, y: 0 });
      }

      (e.target as Element).releasePointerCapture(e.pointerId);
    },
    [isDragging, dragOffset, isActive, showFullInfo]
  );

  // 🔥 Wishlist (optimistic)
  const handleWishlistClick = () => {
    if (!token) return;

    setIsWishlisted(true);

    onWishlist().catch(() => {
      setIsWishlisted(false);
    });
  };

  const rotation = dragOffset.x * 0.05;

  const getTransform = () => {
    if (isLeaving === "left") return "translate(-120%,0) rotate(-20deg)";
    if (isLeaving === "right") return "translate(120%,0) rotate(20deg)";
    if (isLeaving === "up") return "translate(0,-120%) rotate(5deg)";

    if (isActive) {
      return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`;
    }

    if (isNext) return "scale(0.95) translateY(20px)";
    return "scale(0.8) translateY(50px)";
  };

  const opacity = isLeaving
    ? 0
    : isActive
      ? Math.max(0, 1 - Math.abs(dragOffset.x) / 500)
      : isNext
        ? 0.9
        : 0.5;

  const likeOpacity = Math.max(0, Math.min(1, dragOffset.x / 100));
  const nopeOpacity = Math.max(0, Math.min(1, -dragOffset.x / 100));
  const skipOpacity = Math.max(0, Math.min(1, -dragOffset.y / 100));

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : isNext ? styles.next : styles.inactive
        }`}
      style={{
        transform: getTransform(),
        opacity,
        transition: isDragging
          ? "none"
          : "transform 0.2s ease-out, opacity 0.2s ease-out",
        cursor: isActive && !showFullInfo ? "grab" : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* бейджи */}
      {isActive && (
        <>
          <div className={styles.likeStamp} style={{ opacity: likeOpacity }}>
            👍 LIKE
          </div>
          <div className={styles.nopeStamp} style={{ opacity: nopeOpacity }}>
            👎 NOPE
          </div>
          <div className={styles.skipStamp} style={{ opacity: skipOpacity }}>
            ⏭️ SKIP
          </div>
        </>
      )}

      {/* IMAGE */}
      <div className={styles.imageContainer}>
        <Image
          src={proxifyImage(proxifyImage(game.background_image)) || "/placeholder-game.jpg"}
          alt={game.name}
          fill
          className={styles.image}
        />
        <div className={styles.gradient} />
      </div>

      {/* CONTENT */}
      <div className={styles.content}>
        <h2 className={styles.title}>{game.name}</h2>

        <div className={styles.meta}>
          {game.rating > 0 && <span>⭐ {game.rating.toFixed(1)}</span>}
          {game.metacritic && <span>🎯 {game.metacritic}</span>}
          {game.released && <span>{new Date(game.released).getFullYear()}</span>}
        </div>

        {game.genres?.length > 0 && (
          <div className={styles.genres}>
            {game.genres.slice(0, 3).map((g: any) => (
              <span key={g.id} className={styles.genre}>
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* DESCRIPTION with first 500 chars */}
        {(game.description_raw || game.description) && (
          <div
            className={styles.descriptionShort}
            onClick={() => setShowFullInfo(true)}
          >
            <p>
              {(game.description_raw || game.description).substring(0, 500)}
              {(game.description_raw || game.description).length > 500 ? '...' : ''}
            </p>
            <span className={styles.readMore}>Узнать больше →</span>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={`/games/${game.id}`} className={styles.gameLink} target="_blank">
            Страница игры
          </Link>

          <button
            className={`${styles.wishlistButton} ${isWishlisted ? styles.wishlisted : ""
              }`}
            onClick={handleWishlistClick}
            title={isWishlisted ? "Уже в вишлисте" : "Добавить в вишлист"}
          > 
          
            {isWishlisted ? "❤️" : "🤍"}
          </button>
        </div>
      </div>

      {/* popup оставлен без изменений */}
      {showFullInfo && (
        <div className={styles.fullInfoPopup} onClick={() => setShowFullInfo(false)}> <div className={styles.fullInfoContent} onClick={(e) => e.stopPropagation()}> <button className={styles.closePopup} onClick={() => setShowFullInfo(false)}> ✕ </button>
          <h2 className={styles.fullInfoTitle}>{game.name}</h2>
          <div className={styles.fullInfoMeta}> {game.rating > 0 && (<div className={styles.fullInfoStat}> <span className={styles.fullInfoStatLabel}>Рейтинг</span> <span className={styles.fullInfoStatValue}>⭐ {game.rating.toFixed(1)}</span> </div>)} {game.metacritic && (<div className={styles.fullInfoStat}> <span className={styles.fullInfoStatLabel}>Metacritic</span> <span className={styles.fullInfoStatValue}>🎯 {game.metacritic}</span> </div>)} {game.released && (<div className={styles.fullInfoStat}> <span className={styles.fullInfoStatLabel}>Год выхода</span> <span className={styles.fullInfoStatValue}> {new Date(game.released).getFullYear()} </span> </div>)} {game.added && (<div className={styles.fullInfoStat}> <span className={styles.fullInfoStatLabel}>В библиотеках</span> <span className={styles.fullInfoStatValue}>{game.added.toLocaleString()}</span> </div>)} </div> {game.platforms?.length > 0 && (<div className={styles.fullInfoSection}>
            <h3>Платформы</h3>
            <div className={styles.fullInfoTags}> {game.platforms.slice(0, 5).map((p) => (<span key={p.platform.name} className={styles.fullInfoTag}> {p.platform.name} </span>))} </div>
          </div>)} {game.developers?.length > 0 && (<div className={styles.fullInfoSection}>
            <h3>Разработчик</h3>
            <p>{game.developers[0].name}</p>
          </div>)} {game.publishers?.length > 0 && (<div className={styles.fullInfoSection}>
            <h3>Издатель</h3>
            <p>{game.publishers[0].name}</p>
          </div>)} {game.genres?.length > 0 && (<div className={styles.fullInfoSection}>
            <h3>Жанры</h3>
            <div className={styles.fullInfoTags}> {game.genres.map((genre) => (<span key={genre.id} className={styles.fullInfoTag}> {genre.name} </span>))} </div>
          </div>)}
        </div>
        </div>
      )}
    </div>
  );
}