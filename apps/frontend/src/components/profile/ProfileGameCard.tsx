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
  const image =
    game.background_image ||
    game.backgroundImage;

  const title =
    game.game_name ||
    game.name ||
    "Unknown game";

  const gameId =
    game.game_id || game.id;

  return (
    <div className={styles.gameCard}>
      <Link
        href={`/games/${gameId}`}
        className={styles.gameImage}
      >
        {image ? (
          <Image
            src={proxifyImage(image)}
            alt={title}
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
      </Link>

      <div
        className={
          styles.gameContent
        }
      >
        <div className={styles.top}>
          <Link
            href={`/games/${gameId}`}
            className={
              styles.gameTitle
            }
          >
            {title}
          </Link>

          {game.user_rating && (
            <div
              className={
                styles.ratingBadge
              }
            >
              ⭐{" "}
              {
                game.user_rating
              }
            }
          </div>
        )}
        </div>

        <div className={styles.badges}>
          {game.liked && (
            <span
              className={
                styles.likeBadge
              }
            >
              👍 Нравится
            </span>
          )}

          {game.disliked && (
            <span
              className={
                styles.dislikeBadge
              }
            >
              👎 Не нравится
            </span>
          )}

          {game.in_wishlist && (
            <span
              className={
                styles.wishlistBadge
              }
            >
              ❤️ Wishlist
            </span>
          )}

          {game.completion_status &&
            game.completion_status !==
              "not_played" && (
              <span
                className={
                  styles.statusBadge
                }
              >
                {
                  game.completion_status
                }
              </span>
            )}
        </div>

        <div className={styles.actions}>
          <GameActions
            compact
            gameId={gameId}
            gameName={title}
            initialLiked={
              game.liked
            }
            initialDisliked={
              game.disliked
            }
            initialWishlist={
              game.in_wishlist
            }
            initialRating={
              game.user_rating
            }
          />
        </div>
      </div>
    </div>
  );
}