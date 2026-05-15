"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "./Profile.module.css";

import GameActions from "@/components/GameActions/GameActions";

import { proxifyImage } from "@/services/gameService";

interface Props {
  game: any;
}

export default function ProfileGameCard({
  game,
}: Props) {
  const normalizedGame = {
    id:
      game.game_id ??
      game.id,

    name:
      game.game_name ??
      game.name ??
      "Unknown game",

    image:
      game.game_image ??
      game.background_image ??
      game.backgroundImage ??
      null,

    genres:
      game.genres ??
      [],

    tags:
      game.tags ??
      [],

    liked:
      Boolean(game.liked),

    disliked:
      Boolean(game.disliked),

    wishlist:
      Boolean(game.in_wishlist),

    rating:
      game.user_rating ??
      game.rating ??
      null,

    completionStatus:
      game.completion_status ??
      "not_played",

    purchaseStatus:
      game.purchase_status ??
      "not_owned",
  };

  return (
    <div className={styles.gameCard}>
      <Link
        href={`/games/${normalizedGame.id}`}
        className={styles.cardLink}
      >
        <div className={styles.gameImage}>
          {normalizedGame.image ? (
            <Image
              src={proxifyImage(
                normalizedGame.image,
              )}
              alt={normalizedGame.name}
              fill
              className={styles.image}
            />
          ) : (
            <div
              className={
                styles.placeholder
              }
            >
              🎮
            </div>
          )}
        </div>

        <div className={styles.gameContent}>
          <div className={styles.top}>
            <h3
              className={
                styles.gameTitle
              }
            >
              {normalizedGame.name}
            </h3>

            {normalizedGame.rating && (
              <div
                className={
                  styles.ratingBadge
                }
              >
                ⭐{" "}
                {
                  normalizedGame.rating
                }
              </div>
            )}
          </div>

          <div className={styles.badges}>
            {normalizedGame.liked && (
              <span
                className={
                  styles.likeBadge
                }
              >
                👍 Нравится
              </span>
            )}

            {normalizedGame.disliked && (
              <span
                className={
                  styles.dislikeBadge
                }
              >
                👎 Не нравится
              </span>
            )}

            {normalizedGame.wishlist && (
              <span
                className={
                  styles.wishlistBadge
                }
              >
                ❤️ Wishlist
              </span>
            )}

            {normalizedGame
              .completionStatus !==
              "not_played" && (
                <span
                  className={
                    styles.statusBadge
                  }
                >
                  {
                    normalizedGame.completionStatus
                  }
                </span>
              )}
          </div>
        </div>
      </Link>

      <div
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <GameActions
          gameId={normalizedGame.id}
          gameName={normalizedGame.name}
          genres={normalizedGame.genres}
          tags={normalizedGame.tags}
        />
      </div>
    </div>
  );
}