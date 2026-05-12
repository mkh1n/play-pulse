"use client";

import { useEffect, useState } from "react";

import styles from "./GameActions.module.css";

interface Props {
  gameId: number;
  gameName?: string;
  compact?: boolean;
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
}: Props) {
  const [actions, setActions] =
    useState<UserActions | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    load();
  }, [gameId]);

  async function load() {
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
          },
        );

      if (!response.ok) {
        throw new Error(
          "Failed",
        );
      }

      const data =
        await response.json();

      setActions(data);
    } catch (error) {
      console.error(
        error,
      );
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <div
        className={
          styles.row
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
          styles.row
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