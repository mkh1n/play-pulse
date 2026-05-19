"use client";

import { useMemo, useState } from "react";

import styles from "./Profile.module.css";

import ProfileGameCard from "./ProfileGameCard";

interface Props {
  games: any[];
}

export default function ProfileGamesGrid({
  games,
}: Props) {
  const [sortBy, setSortBy] =
    useState("updated");

  const [
    interactionFilter,
    setInteractionFilter,
  ] = useState("all");

  const [
    progressFilter,
    setProgressFilter,
  ] = useState("all");

  const [
    purchaseFilter,
    setPurchaseFilter,
  ] = useState("all");

  // =========================================
  // FILTERS + SORT
  // =========================================

  const filteredGames =
    useMemo(() => {
      let result = [...games];

      // =========================================
      // INTERACTION FILTERS
      // =========================================

      if (
        interactionFilter ===
        "liked"
      ) {
        result = result.filter(
          (game) =>
            game.liked ===
              true ||
            game.isLiked ===
              true,
        );
      }

      if (
        interactionFilter ===
        "wishlist"
      ) {
        result = result.filter(
          (game) =>
            game.in_wishlist ===
              true ||
            game.inWishlist ===
              true,
        );
      }

      if (
        interactionFilter ===
        "disliked"
      ) {
        result = result.filter(
          (game) =>
            game.disliked ===
              true ||
            game.isDisliked ===
              true,
        );
      }

      // =========================================
      // PLAY STATUS FILTER
      // =========================================

      if (
        progressFilter !==
        "all"
      ) {
        result = result.filter(
          (game) => {
            const status =
              game
                .completion_status ||
              game.playStatus;

            return (
              status ===
              progressFilter
            );
          },
        );
      }

      // =========================================
      // PURCHASE FILTER
      // =========================================

      if (
        purchaseFilter !==
        "all"
      ) {
        result = result.filter(
          (game) => {
            const status =
              game
                .purchase_status ||
              game.purchaseStatus;

            return (
              status ===
              purchaseFilter
            );
          },
        );
      }

      // =========================================
      // SORT
      // =========================================

      switch (sortBy) {
        case "rating":
          result.sort(
            (a, b) =>
              (b.rating || 0) -
              (a.rating || 0),
          );
          break;

        case "updated":
          result.sort(
            (a, b) =>
              new Date(
                b.updated_at ||
                  0,
              ).getTime() -
              new Date(
                a.updated_at ||
                  0,
              ).getTime(),
          );
          break;

        case "released":
          result.sort(
            (a, b) =>
              new Date(
                b.released ||
                  0,
              ).getTime() -
              new Date(
                a.released ||
                  0,
              ).getTime(),
          );
          break;

        case "name":
          result.sort((a, b) =>
            (
              a.name || ""
            ).localeCompare(
              b.name || "",
            ),
          );
          break;

        default:
          break;
      }

      return result;
    }, [
      games,
      interactionFilter,
      progressFilter,
      purchaseFilter,
      sortBy,
    ]);

  // =========================================
  // EMPTY
  // =========================================

  if (!games.length) {
    return (
      <div className={styles.center}>
        Игр пока нет
      </div>
    );
  }

  return (
    <>
      {/* =========================================
      TOOLBAR
      ========================================= */}

      <div className={styles.toolbar}>
        {/* LEFT */}

        <div
          className={
            styles.toolbarLeft
          }
        >
          <div
            className={
              styles.actionFilters
            }
          >
            <button
              className={`${styles.filterChip} ${
                interactionFilter ===
                "all"
                  ? styles.filterChipActive
                  : ""
              }`}
              onClick={() =>
                setInteractionFilter(
                  "all",
                )
              }
            >
              Все
            </button>

            <button
              className={`${styles.filterChip} ${
                interactionFilter ===
                "liked"
                  ? styles.filterChipActive
                  : ""
              }`}
              onClick={() =>
                setInteractionFilter(
                  "liked",
                )
              }
            >
              👍 Лайки
            </button>

            <button
              className={`${styles.filterChip} ${
                interactionFilter ===
                "wishlist"
                  ? styles.filterChipActive
                  : ""
              }`}
              onClick={() =>
                setInteractionFilter(
                  "wishlist",
                )
              }
            >
              💜 Wishlist
            </button>

            <button
              className={`${styles.filterChip} ${
                interactionFilter ===
                "disliked"
                  ? styles.filterChipActive
                  : ""
              }`}
              onClick={() =>
                setInteractionFilter(
                  "disliked",
                )
              }
            >
              👎 Дизлайки
            </button>
          </div>
        </div>

        {/* RIGHT */}

        <div
          className={
            styles.toolbarRight
          }
        >
          <select
            className={
              styles.select
            }
            value={
              progressFilter
            }
            onChange={(e) =>
              setProgressFilter(
                e.target.value,
              )
            }
          >
            <option value="all">
              Статус прохождения
            </option>

            <option value="playing">
              Играю сейчас
            </option>

            <option value="completed">
              Пройдено
            </option>

            <option value="dropped">
              Заброшено
            </option>

            <option value="not_played">
              Не начато
            </option>
          </select>

          <select
            className={
              styles.select
            }
            value={
              purchaseFilter
            }
            onChange={(e) =>
              setPurchaseFilter(
                e.target.value,
              )
            }
          >
            <option value="all">
              Статус покупки
            </option>

            <option value="owned">
              Куплено
            </option>

            <option value="want_to_buy">
              Хочу купить
            </option>

            <option value="not_owned">
              Не куплено
            </option>
          </select>

          <select
            className={
              styles.select
            }
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value,
              )
            }
          >
            <option value="rating">
              По рейтингу
            </option>

            <option value="updated">
              По активности
            </option>

            <option value="released">
              По дате выхода
            </option>

            <option value="name">
              По названию
            </option>
          </select>
        </div>
      </div>

      {/* =========================================
      FILTER RESULT
      ========================================= */}

      {!filteredGames.length ? (
        <div
          className={
            styles.emptyState
          }
        >
          <div
            className={
              styles.emptyIcon
            }
          >
            🎮
          </div>

          <h2
            className={
              styles.emptyTitle
            }
          >
            Ничего не найдено
          </h2>

          <p
            className={
              styles.emptyText
            }
          >
            Попробуйте изменить
            фильтры
          </p>
        </div>
      ) : (
        <div
          className={
            styles.gamesGrid
          }
        >
          {filteredGames.map(
            (game, index) => (
              <ProfileGameCard
                key={
                  game.id ||
                  index
                }
                game={game}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}