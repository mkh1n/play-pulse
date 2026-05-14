"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGameActions } from "@/contexts/GameActionsContexts";
import styles from "./GameActions.module.css";
import StarRating from "../StarRating/StarRaing";
import AuthPopup from "@/components/AuthPopup/AuthPopup";

interface GameActionsProps {
  gameId: number;
  gameName: string;
  compact?: boolean;
}

export default function GameActions({
  gameId,
  gameName,
  compact = false,
}: GameActionsProps) {
  const { isAuthenticated, token } = useAuth();
  const { actions, setGameAction, isLoading: isContextLoading } = useGameActions();
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const gameActions = actions[gameId];
  const isLiked = gameActions?.liked || false;
  const isDisliked = gameActions?.disliked || false;
  const isInWishlist = gameActions?.in_wishlist || false;
  const rating = gameActions?.rating || null;
  const completionStatus = gameActions?.completion_status || "not_played";
  const purchaseStatus = gameActions?.purchase_status || "not_owned";

  const isLoading = isLocalLoading || isContextLoading;

  // Показываем скелетон только если данные не загружены и идет загрузка
  if (isLoading && !gameActions && !compact) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonRating} />
        <div className={styles.skeletonButtons}>
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
        </div>
        <div className={styles.skeletonStatus}>
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
        </div>
        <div className={styles.skeletonPurchase}>
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
          <div className={styles.skeletonButton} />
        </div>
      </div>
    );
  }

  if (isLoading && !gameActions && compact) {
    return (
      <div className={styles.skeletonCompact}>
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
      </div>
    );
  }

  const handleLike = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousState = { liked: isLiked, disliked: isDisliked };
    
    setGameAction(gameId, {
      liked: !isLiked,
      disliked: false,
    });

    try {
      setIsLocalLoading(true);
      const method = isLiked ? "DELETE" : "POST";
      
      const response = await fetch(`/api/games/${gameId}/like`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setGameAction(gameId, previousState);
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, previousState);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousState = { liked: isLiked, disliked: isDisliked };
    
    setGameAction(gameId, {
      disliked: !isDisliked,
      liked: false,
    });

    try {
      setIsLocalLoading(true);
      const method = isDisliked ? "DELETE" : "POST";
      
      const response = await fetch(`/api/games/${gameId}/dislike`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setGameAction(gameId, previousState);
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, previousState);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousState = isInWishlist;
    
    setGameAction(gameId, { in_wishlist: !isInWishlist });

    try {
      setIsLocalLoading(true);
      const method = isInWishlist ? "DELETE" : "POST";
      
      const response = await fetch(`/api/games/${gameId}/wishlist`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setGameAction(gameId, { in_wishlist: previousState });
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, { in_wishlist: previousState });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleCompletionStatus = async (
    status: "not_played" | "playing" | "completed" | "dropped",
  ) => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousState = completionStatus;
    
    setGameAction(gameId, { completion_status: status });

    try {
      setIsLocalLoading(true);
      
      const response = await fetch(`/api/games/${gameId}/status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setGameAction(gameId, { completion_status: previousState });
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, { completion_status: previousState });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handlePurchaseStatus = async (
    status: "owned" | "not_owned" | "want_to_buy",
  ) => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousState = purchaseStatus;
    
    setGameAction(gameId, { purchase_status: status });

    try {
      setIsLocalLoading(true);
      
      const response = await fetch(`/api/games/${gameId}/purchase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purchase: status }),
      });

      if (!response.ok) {
        setGameAction(gameId, { purchase_status: previousState });
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, { purchase_status: previousState });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    const previousRating = rating;
    
    setGameAction(gameId, { rating: newRating === 0 ? null : newRating });

    try {
      setIsLocalLoading(true);

      if (newRating === 0) {
        const response = await fetch(`/api/games/${gameId}/rate`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          setGameAction(gameId, { rating: previousRating });
        }
      } else {
        const response = await fetch(`/api/games/${gameId}/rate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: newRating }),
        });
        
        if (!response.ok) {
          setGameAction(gameId, { rating: previousRating });
        }
      }
    } catch (error) {
      console.error(error);
      setGameAction(gameId, { rating: previousRating });
    } finally {
      setIsLocalLoading(false);
    }
  };

  if (compact) {
    return (
      <>
        <div className={styles.compactActions}>
          <button
            onClick={handleLike}
            className={`${styles.compactButton} ${
              isLiked ? styles.activeLike : ""
            }`}
            disabled={isLoading}
            title={isLiked ? "Убрать лайк" : "Нравится"}
          >
            <span className={styles.icon}>👍</span>
            {isLiked && <span className={styles.activeDot} />}
          </button>

          <button
            onClick={handleWishlist}
            className={`${styles.compactButton} ${
              isInWishlist ? styles.activeWishlist : ""
            }`}
            disabled={isLoading}
            title={isInWishlist ? "Убрать из wishlist" : "Добавить в wishlist"}
          >
            <span className={styles.icon}>❤️</span>
            {isInWishlist && <span className={styles.activeDot} />}
          </button>

          <StarRating
            gameId={gameId}
            gameName={gameName}
            token={token}
            initialRating={rating}
            compact
            onRatingSubmit={handleRatingChange}
          />
        </div>

        {showAuthPopup && <AuthPopup onClose={() => setShowAuthPopup(false)} />}
      </>
    );
  }

  return (
    <>
      <div className={styles.actions}>
        <div className={styles.ratingSection}>
          <StarRating
            gameId={gameId}
            gameName={gameName}
            initialRating={rating}
            token={token}
            onRatingSubmit={handleRatingChange}
            showLabel
          />
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={handleLike}
            className={`${styles.actionButton} ${isLiked ? styles.liked : ""}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>👍</span>
          </button>

          <button
            onClick={handleDislike}
            className={`${styles.actionButton} ${isDisliked ? styles.disliked : ""}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>👎</span>
          </button>

          <button
            onClick={handleWishlist}
            className={`${styles.actionButton} ${isInWishlist ? styles.inWishlist : ""}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>❤️</span>
          </button>
        </div>

        <div className={styles.statusSection}>
          <h4>Статус прохождения:</h4>
          <div className={styles.statusButtons}>
            {[
              { value: "not_played", label: "Не играл", icon: "❓" },
              { value: "playing", label: "Играю", icon: "🎮" },
              { value: "completed", label: "Завершил", icon: "✅" },
              { value: "dropped", label: "Бросил", icon: "🚫" },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handleCompletionStatus(value as any)}
                className={`${styles.statusButton} ${
                  completionStatus === value ? styles.activeStatus : ""
                }`}
                disabled={isLoading}
              >
                <span className={styles.statusIcon}>{icon}</span>
                <span className={styles.statusLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.purchaseSection}>
          <h4>Статус покупки:</h4>
          <div className={styles.purchaseButtons}>
            {[
              { value: "not_owned", label: "Не куплено", icon: "💰" },
              { value: "owned", label: "Куплено", icon: "✅" },
              { value: "want_to_buy", label: "Хочу купить", icon: "🛒" },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handlePurchaseStatus(value as any)}
                className={`${styles.purchaseButton} ${
                  purchaseStatus === value ? styles.activePurchase : ""
                }`}
                disabled={isLoading}
              >
                <span className={styles.purchaseIcon}>{icon}</span>
                <span className={styles.purchaseLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAuthPopup && <AuthPopup onClose={() => setShowAuthPopup(false)} />}
    </>
  );
}