"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard/AuthGuard';
import styles from './GameActions.module.css';
import StarRating from '../StarRating/StarRaing';

interface GameActionsProps {
  gameId: number;
  gameName: string;
  compact?: boolean;
}

export default function GameActions({ gameId, gameName, compact = false }: GameActionsProps) {
  const { isAuthenticated, token } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'not_played' | 'playing' | 'completed' | 'dropped'>('not_played');
  const [purchaseStatus, setPurchaseStatus] = useState<'owned' | 'not_owned' | 'want_to_buy'>('not_owned');
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadUserActions();
    } else {
      // Сбрасываем состояние если пользователь вышел
      setIsLiked(false);
      setIsDisliked(false);
      setIsInWishlist(false);
      setRating(null);
      setCompletionStatus('not_played');
      setPurchaseStatus('not_owned');
    }
  }, [gameId, isAuthenticated, token]);

  const loadUserActions = async () => {
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}/user-actions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User actions loaded:', data);

        setIsLiked(data.data?.liked || false);
        setIsDisliked(data.data?.disliked || false);
        setIsInWishlist(data.data?.in_wishlist || false);
        setRating(data.data?.rating || null);
        setCompletionStatus(data.data?.completion_status || 'not_played');
        setPurchaseStatus(data.data?.purchase_status || 'not_owned');
      } else if (response.status === 401) {
        console.log('Unauthorized, token might be expired');
      }
    } catch (error) {
      console.error('Error loading user actions:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const endpoint = `/api/games/${gameId}/like`;
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setIsDisliked(false); // Убираем дизлайк если был
        await loadUserActions(); // Перезагружаем для синхронизации
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      const method = isDisliked ? 'DELETE' : 'POST';
      const endpoint = `/api/games/${gameId}/dislike`;
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsDisliked(!isDisliked);
        setIsLiked(false); // Убираем лайк если был
        await loadUserActions(); // Перезагружаем для синхронизации
      }
    } catch (error) {
      console.error('Error toggling dislike:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      const method = isInWishlist ? 'DELETE' : 'POST';
      const endpoint = `/api/games/${gameId}/wishlist`;
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsInWishlist(!isInWishlist);
        await loadUserActions(); // Перезагружаем для синхронизации
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletionStatus = async (status: 'not_played' | 'playing' | 'completed' | 'dropped') => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setCompletionStatus(status);
        await loadUserActions();
      }
    } catch (error) {
      console.error('Error updating completion status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseStatus = async (status: 'owned' | 'not_owned' | 'want_to_buy') => {
    if (!isAuthenticated || !token) {
      setShowAuthPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchase: status }),
      });

      if (response.ok) {
        setPurchaseStatus(status);
        await loadUserActions();
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // Можно также вызвать loadUserActions для синхронизации
    // или оставить как есть, так как StarRating сам отправляет запрос
  };

  // Компактная версия
  if (compact) {
    return (
      <>
        <div className={styles.compactActions}>
          <button
            onClick={handleLike}
            className={`${styles.compactButton} ${isLiked ? styles.activeLike : ''}`}
            disabled={isLoading}
            title={isLiked ? "Убрать лайк" : "Нравится"}
          >
            <span className={styles.icon}>👍</span>
            {isLiked && <span className={styles.activeDot}></span>}
          </button>

          <button
            onClick={handleWishlist}
            className={`${styles.compactButton} ${isInWishlist ? styles.activeWishlist : ''}`}
            disabled={isLoading}
            title={isInWishlist ? "Убрать из wishlist" : "Добавить в wishlist"}
          >
            <span className={styles.icon}>❤️</span>
            {isInWishlist && <span className={styles.activeDot}></span>}
          </button>

          <StarRating 
            gameId={gameId}
            gameName={gameName}
            token={token}
            initialRating={rating}
            compact={true}
            onRatingSubmit={handleRatingChange}
          />
        </div>

        {showAuthPopup && (
          <AuthGuard 
            requireAuth={false} 
            showPopup={true} 
            onClose={() => setShowAuthPopup(false)}
          />
        )}
      </>
    );
  }

  // Полная версия
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
            showLabel={true}
          />
          
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={handleLike}
            className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>👍</span>
            {isLiked ? 'Вам нравится' : 'Нравится'}
          </button>

          <button
            onClick={handleDislike}
            className={`${styles.actionButton} ${isDisliked ? styles.disliked : ''}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>👎</span>
            {isDisliked ? 'Не нравится' : 'Не нравится'}
          </button>

          <button
            onClick={handleWishlist}
            className={`${styles.actionButton} ${isInWishlist ? styles.inWishlist : ''}`}
            disabled={isLoading}
          >
            <span className={styles.buttonIcon}>❤️</span>
            {isInWishlist ? 'В wishlist' : 'В wishlist'}
          </button>
        </div>

        {/* Секция со статусами прохождения */}
        <div className={styles.statusSection}>
          <h4>Статус прохождения:</h4>
          <div className={styles.statusButtons}>
            {[
              { value: 'not_played', label: 'Не играл', icon: '❓' },
              { value: 'playing', label: 'Играю', icon: '🎮' },
              { value: 'completed', label: 'Завершил', icon: '✅' },
              { value: 'dropped', label: 'Бросил', icon: '🚫' },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handleCompletionStatus(value as any)}
                className={`${styles.statusButton} ${
                  completionStatus === value ? styles.activeStatus : ''
                }`}
                disabled={isLoading}
                title={label}
              >
                <span className={styles.statusIcon}>{icon}</span>
                <span className={styles.statusLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Секция со статусами покупки */}
        <div className={styles.purchaseSection}>
          <h4>Статус покупки:</h4>
          <div className={styles.purchaseButtons}>
            {[
              { value: 'not_owned', label: 'Не куплено', icon: '💰' },
              { value: 'owned', label: 'Куплено', icon: '✅' },
              { value: 'want_to_buy', label: 'Хочу купить', icon: '🛒' },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handlePurchaseStatus(value as any)}
                className={`${styles.purchaseButton} ${
                  purchaseStatus === value ? styles.activePurchase : ''
                }`}
                disabled={isLoading}
                title={label}
              >
                <span className={styles.purchaseIcon}>{icon}</span>
                <span className={styles.purchaseLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAuthPopup && (
        <AuthGuard 
          requireAuth={false} 
          showPopup={true} 
          onClose={() => setShowAuthPopup(false)}
        />
      )}
    </>
  );
}