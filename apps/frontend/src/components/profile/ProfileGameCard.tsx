// ProfileGameCard.tsx

"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "./Profile.module.css";

interface Props {
  game: any;
}

export default function ProfileGameCard({
  game,
}: Props) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className={styles.card}
    >
      <div className={styles.cardImage}>
        {game.background_image ? (
          <Image
            src={game.background_image}
            alt={game.name}
            fill
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>
            🎮
          </div>
        )}

        <div className={styles.imageOverlay} />

        <div className={styles.topBadges}>
          {game.rating && (
            <div className={styles.ratingBadge}>
              ⭐ {game.rating.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardContent}>
        <div>
          <h3 className={styles.gameTitle}>
            {game.name}
          </h3>
        </div>

        <div className={styles.tags}>
          {game.isLiked && (
            <span
              className={styles.likeTag}
            >
              👍 Нравится
            </span>
          )}

          {game.inWishlist && (
            <span
              className={
                styles.wishlistTag
              }
            >
              💜 Wishlist
            </span>
          )}

          {game.isDisliked && (
            <span
              className={
                styles.dislikeTag
              }
            >
              👎 Не понравилось
            </span>
          )}

          {game.playStatus && (
            <span
              className={styles.statusTag}
            >
              🎯 {game.playStatus}
            </span>
          )}

          {game.purchaseStatus && (
            <span
              className={styles.purchaseTag}
            >
              🛒 {game.purchaseStatus}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}