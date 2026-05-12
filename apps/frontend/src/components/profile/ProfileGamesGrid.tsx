"use client";

import styles from "./Profile.module.css";

import ProfileGameCard from "./ProfileGameCard";

interface Props {
  games: any[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export default function ProfileGamesGrid({
  games,
  loading,
  error,
  onRefresh,
}: Props) {
  if (loading) {
    return (
      <div className={styles.center}>
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p>{error}</p>

        <button
          className={
            styles.retryButton
          }
          onClick={onRefresh}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!games.length) {
    return (
      <div className={styles.center}>
        Игр пока нет
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <ProfileGameCard
          key={game.id}
          game={game}
        />
      ))}
    </div>
  );
}