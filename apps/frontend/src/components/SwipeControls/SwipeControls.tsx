// components/SwipeControls/SwipeControls.tsx
"use client";

import styles from "./SwipeControls.module.css";

interface SwipeControlsProps {
  onSwipe: (direction: "left" | "right" | "up") => void;
  disabled: boolean;
  triggerSwipe: "left" | "right" | "up" | null;
  onSwipeComplete: () => void;
}

export default function SwipeControls({
  onSwipe,
  disabled,
  triggerSwipe,
  onSwipeComplete,
}: SwipeControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.hint}>
        <span className={styles.key}>←</span> Дизлайк
        <span className={styles.key}>↑</span> Пропустить
        <span className={styles.key}>→</span> Лайк
      </div>

      <div className={styles.buttons}>
        <button
          className={`${styles.button} ${styles.nope}`}
          onClick={() => onSwipe("left")}
          disabled={disabled}
          title="Дизлайк (←)"
        >
          👎
        </button>

        <button
          className={`${styles.button} ${styles.skip}`}
          onClick={() => onSwipe("up")}
          disabled={disabled}
          title="Пропустить (↑)"
        >
          ⏭️
        </button>

        <button
          className={`${styles.button} ${styles.like}`}
          onClick={() => onSwipe("right")}
          disabled={disabled}
          title="Лайк (→)"
        >
          👍
        </button>
      </div>
    </div>
  );
}