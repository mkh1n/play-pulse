// ProfileGameCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "./Profile.module.css";

interface Props {
  game: any;
}

const playStatusMap: Record<
  string,
  string
> = {
  not_played: "Не играл",
  playing: "Играю сейчас",
  completed: "Пройдена",
  dropped: "Брошена",
};

const purchaseStatusMap: Record<
  string,
  string
> = {
  owned: "Куплена",
  not_owned: "Не куплена",
  want_to_buy: "Хочу купить",
};

export default function ProfileGameCard({
  game,
}: Props) {
  const playStatus =
    playStatusMap[
      game.playStatus
    ] ||
    playStatusMap[
      game.completion_status
    ];

  const purchaseStatus =
    purchaseStatusMap[
      game.purchaseStatus
    ] ||
    purchaseStatusMap[
      game.purchase_status
    ];

  return (
    <Link
      href={`/games/${game.slug}`}
      className={styles.card}
    >
      <div className={styles.cardImage}>
        {game.background_image ? (
          <Image
            src={
              game.background_image
            }
            alt={game.name}
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

        <div
          className={
            styles.topBadges
          }
        >
          {game.user_rating && (
            <div
              className={
                styles.ratingBadge
              }
            >
              ⭐{" "}
              {game.user_rating.toFixed(
                1,
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={
          styles.cardContent
        }
      >
        <div>
          <h3
            className={
              styles.gameTitle
            }
          >
            {game.name}
          </h3>
        </div>

        <div
          className={styles.tags}
        >
          {(game.isLiked ||
            game.liked) && (
            <span
              className={
                styles.likeTag
              }
            >
              👍 Нравится
            </span>
          )}

          {(game.inWishlist ||
            game.in_wishlist) && (
            <span
              className={
                styles.wishlistTag
              }
            >
              💜 В wishlist
            </span>
          )}

          {(game.isDisliked ||
            game.disliked) && (
            <span
              className={
                styles.dislikeTag
              }
            >
              👎 Не понравилась
            </span>
          )}

          {playStatus && (
            <span
              className={
                styles.statusTag
              }
            >
              🎯 {playStatus}
            </span>
          )}

          {purchaseStatus && (
            <span
              className={
                styles.purchaseTag
              }
            >
              🛒{" "}
              {
                purchaseStatus
              }
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}