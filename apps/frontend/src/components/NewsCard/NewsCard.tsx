"use client";

import Link from "next/link";
import styles from "./NewsCard.module.css";

interface NewsCardProps {
  article: any;
  variant?: "large" | "medium" | "tall" | "wide";
}

export default function NewsCard({ article, variant = "medium" }: NewsCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Link
      href={article.link}
      target="_blank"
      className={`${styles.card} ${styles[variant]}`}
    >
      {article.image && (
        <div className={styles.imageContainer}>
          <img src={article.image} alt={article.title} className={styles.image} />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.meta}>
          <div className={styles.metaSide}>
            <span className={styles.source}>{article.source}</span>
            <span className={styles.date}>{formatDate(article.pubDate)}</span>
          </div>

          <div className={styles.metaSide}>
            <span className={styles.categoryBadge}>{article.category}</span>
          </div>
        </div>
        <h3 className={styles.title}>{article.title}</h3>

        {variant !== "wide" && (
          <p className={styles.description}>{article.description}</p>
        )}
      </div>
    </Link>
  );
}