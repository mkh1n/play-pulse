"use client";

import { useEffect, useState, useCallback } from "react";

import styles from "./GameActions.module.css";

interface Props {
  gameId: number;
  gameName?: string;
  compact?: boolean;
  initialLiked?: boolean;
  initialDisliked?: boolean;
  initialWishlist?: boolean;
  initialRating?: number | null;
  initialCompletionStatus?: string;
  initialPurchaseStatus?: string;
  onActionChange?: () => void;
}

interface UserActions {
  liked: boolean;
  disliked: boolean;
  in_wishlist: boolean;
  rating: number | null;
  completion_status:
    | "not_played"
    | "playing"
    | "completed"
    | "dropped";
  purchase_status:
    | "owned"
    | "not_owned"
    | "want_to_buy";
}

export default function GameActions({
  gameId,
  gameName,
  compact = false,
  initialLiked,
  initialDisliked,
  initialWishlist,
  initialRating,
  initialCompletionStatus,
  initialPurchaseStatus,
  onActionChange,
}: Props) {
  const [actions, setActions] =
    useState<UserActions | null>(
      initialLiked !== undefined || initialRating !== undefined
        ? {
            liked: initialLiked ?? false,
            disliked: initialDisliked ?? false,
            in_wishlist: initialWishlist ?? false,
            rating: initialRating ?? null,
            completion_status:
              (initialCompletionStatus as any) ?? "not_played",
            purchase_status:
              (initialPurchaseStatus as any) ?? "not_owned",
          }
        : null,
    );

  const [loading, setLoading] =
    useState(!actions);
  
  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    // Если уже есть initial данные, не загружаем
    if (actions && actions.liked !== undefined) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      const response =
        await fetch(
          `/api/games/${gameId}/user-actions`,
          {
            credentials:
              "include",
            cache:
              "no-store",
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

      // Если не авторизован (401), просто возвращаем дефолтные значения
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setActions({
            liked: false,
            disliked: false,
            in_wishlist: false,
            rating: null,
            completion_status: "not_played",
            purchase_status: "not_owned",
          });
          setLoading(false);
          return;
        }
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const data =
        await response.json();

      setActions(data.data || data);
    } catch (error) {
      console.error(
        "GameActions load error:",
        error,
      );
      // При ошибке устанавливаем дефолтные значения
      setActions({
        liked: false,
        disliked: false,
        in_wishlist: false,
        rating: null,
        completion_status: "not_played",
        purchase_status: "not_owned",
      });
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (
    actionType: 'like' | 'dislike' | 'wishlist' | 'rate' | 'status' | 'purchase',
    method: 'POST' | 'DELETE',
    additionalData?: any
  ) => {
    if (actionLoading) return;
    
    setActionLoading(actionType);
    
    try {
      let url = `/api/games/${gameId}`;
      
      switch (actionType) {
        case 'like':
          url += '/like';
          break;
        case 'dislike':
          url += '/dislike';
          break;
        case 'wishlist':
          url += '/wishlist';
          break;
        case 'rate':
          url += '/rate';
          break;
        case 'status':
          url += '/status';
          break;
        case 'purchase':
          url += '/purchase';
          break;
      }

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: additionalData ? JSON.stringify(additionalData) : undefined,
      });

      if (!response.ok) {
        throw new Error('Action failed');
      }

      const result = await response.json();
      
      if (result.success) {
        if (onActionChange) {
          onActionChange();
        }
        load();
      }
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleLike = async () => {
    const shouldAdd = !actions?.liked;
    await handleAction('like', shouldAdd ? 'POST' : 'DELETE');
  };

  const toggleDislike = async () => {
    const shouldAdd = !actions?.disliked;
    await handleAction('dislike', shouldAdd ? 'POST' : 'DELETE');
  };

  const toggleWishlist = async () => {
    const shouldAdd = !actions?.in_wishlist;
    await handleAction('wishlist', shouldAdd ? 'POST' : 'DELETE');
  };

  const handleRating = async (rating: number) => {
    if (rating === actions?.rating) {
      await handleAction('rate', 'DELETE');
    } else {
      await handleAction('rate', 'POST', { rating });
    }
  };

  const handleStatusChange = async (status: string) => {
    await handleAction('status', 'POST', { status });
  };

  const handlePurchaseChange = async (purchase: string) => {
    await handleAction('purchase', 'POST', { purchase });
  };

  if (loading) {
    return (
      <div
        className={
          styles.loading
        }
      >
        Загрузка...
      </div>
    );
  }

  if (!actions) {
    return null;
  }

  if (compact) {
    return (
      <div
        className={
          styles.compactActions
        }
      >
        <div
          className={
            styles.row
          }
        >
          <button
            className={`${styles.actionButton} ${actions.liked ? styles.activeLike : ''}`}
            onClick={toggleLike}
            disabled={!!actionLoading}
            title="Нравится"
          >
            👍
          </button>

          <button
            className={`${styles.actionButton} ${actions.disliked ? styles.activeDislike : ''}`}
            onClick={toggleDislike}
            disabled={!!actionLoading}
            title="Не нравится"
          >
            👎
          </button>

          <button
            className={`${styles.actionButton} ${actions.in_wishlist ? styles.activeWishlist : ''}`}
            onClick={toggleWishlist}
            disabled={!!actionLoading}
            title="В вишлисте"
          >
            ❤️
          </button>

          <div
            className={styles.rating}
          >
            <select
              value={actions.rating || ''}
              onChange={(e) => handleRating(Number(e.target.value))}
              disabled={!!actionLoading}
              className={styles.ratingSelect}
            >
              <option value="">Оценка</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={
            styles.row
          }
        >
          <select
            value={actions.completion_status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={!!actionLoading}
            className={styles.statusSelect}
          >
            <option value="not_played">Не играл</option>
            <option value="playing">Играю</option>
            <option value="completed">Пройдено</option>
            <option value="dropped">Брошено</option>
          </select>

          <select
            value={actions.purchase_status}
            onChange={(e) => handlePurchaseChange(e.target.value)}
            disabled={!!actionLoading}
            className={styles.purchaseSelect}
          >
            <option value="not_owned">Не куплено</option>
            <option value="owned">Куплено</option>
            <option value="want_to_buy">Хочу купить</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <div
        className={
          styles.actions
        }
      >
        <div
          className={
            styles.row
          }
        >
          <button
            className={`${styles.actionButton} ${actions.liked ? styles.activeLike : ''}`}
            onClick={toggleLike}
            disabled={!!actionLoading}
            title="Нравится"
          >
            👍
          </button>

          <button
            className={`${styles.actionButton} ${actions.disliked ? styles.activeDislike : ''}`}
            onClick={toggleDislike}
            disabled={!!actionLoading}
            title="Не нравится"
          >
            👎
          </button>

          <button
            className={`${styles.actionButton} ${actions.in_wishlist ? styles.activeWishlist : ''}`}
            onClick={toggleWishlist}
            disabled={!!actionLoading}
            title="В вишлисте"
          >
            ❤️
          </button>

          <div
            className={styles.rating}
          >
            <label className={styles.ratingLabel}>
              Моя оценка:
            </label>
            <select
              value={actions.rating || ''}
              onChange={(e) => handleRating(Number(e.target.value))}
              disabled={!!actionLoading}
              className={styles.ratingSelect}
            >
              <option value="">Не оценено</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={
            styles.row
          }
        >
          <div className={styles.statusGroup}>
            <label className={styles.statusLabel}>
              Статус прохождения:
            </label>
            <select
              value={actions.completion_status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={!!actionLoading}
              className={styles.statusSelect}
            >
              <option value="not_played">Не играл</option>
              <option value="playing">Играю</option>
              <option value="completed">Пройдено</option>
              <option value="dropped">Брошено</option>
            </select>
          </div>

          <div className={styles.purchaseGroup}>
            <label className={styles.purchaseLabel}>
              Статус покупки:
            </label>
            <select
              value={actions.purchase_status}
              onChange={(e) => handlePurchaseChange(e.target.value)}
              disabled={!!actionLoading}
              className={styles.purchaseSelect}
            >
              <option value="not_owned">Не куплено</option>
              <option value="owned">Куплено</option>
              <option value="want_to_buy">Хочу купить</option>
            </select>
          </div>
        </div>
      </div>

      <div
        className={
          styles.statusRow
        }
      >
        {actions.liked && (
          <span
            className={
              styles.badge
            }
          >
            👍 Лайк
          </span>
        )}

        {actions.disliked && (
          <span
            className={
              styles.badge
            }
          >
            👎 Дизлайк
          </span>
        )}

        {actions.in_wishlist && (
          <span
            className={
              styles.badge
            }
          >
            ❤️ Wishlist
          </span>
        )}

        {actions.rating && (
          <span
            className={
              styles.badge
            }
          >
            ⭐{" "}
            {
              actions.rating
            }
            /10
          </span>
        )}
      </div>

      <div
        className={
          styles.statusRow
        }
      >
        {actions.completion_status ===
          "playing" && (
          <span
            className={
              styles.status
            }
          >
            🎮 Играю
          </span>
        )}

        {actions.completion_status ===
          "completed" && (
          <span
            className={
              styles.status
            }
          >
            ✅ Пройдено
          </span>
        )}

        {actions.completion_status ===
          "dropped" && (
          <span
            className={
              styles.status
            }
          >
            🚫 Брошено
          </span>
        )}

        {actions.purchase_status ===
          "owned" && (
          <span
            className={
              styles.status
            }
          >
            💰 Куплено
          </span>
        )}

        {actions.purchase_status ===
          "want_to_buy" && (
          <span
            className={
              styles.status
            }
          >
            🛒 Хочу купить
          </span>
        )}
      </div>
    </div>
  );
}