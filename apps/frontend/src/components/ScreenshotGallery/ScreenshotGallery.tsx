import React, { useState, useEffect, useMemo, useRef } from "react";
import styles from "./ScreenshotGallery.module.css";
import { ScreenshotGalleryProps } from "@/services/gameService";

const AUTO_SCROLL_INTERVAL = 5000;

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const images = useMemo(
    () => screenshots?.results?.filter((s) => !s.is_deleted) || [],
    [screenshots]
  );

  const length = images.length;

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const goTo = (index: number) => {
    resetTimer();
    setCurrentIndex((index + length) % length);
  };

  const goNext = () => goTo(currentIndex + 1);
  const goPrev = () => goTo(currentIndex - 1);

  useEffect(() => {
    if (length <= 1 || isFullscreen) return;

    timerRef.current = setTimeout(goNext, AUTO_SCROLL_INTERVAL);

    return resetTimer;
  }, [currentIndex, isFullscreen]);

  const openFullscreen = () => {
    setIsFullscreen(true);
    resetTimer();
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  if (!length) {
    return <div className={styles.empty}>Скриншоты не найдены</div>;
  }

  const currentImage = images[currentIndex]?.image?.trim();

  return (
    <>
      <div className={styles.gallery} id="screenshots">
        <div className={styles.imageStack} onClick={openFullscreen}>
          {images.map((img, i) => (
            <div
              key={i}
              className={`${styles.slide} ${i === currentIndex ? styles.active : ""}`}
              style={{ backgroundImage: `url(${img.image})` }}
            />
          ))}
        </div>

        {/* Кнопки навигации в маленьком режиме */}
        {length > 1 && (
          <>
            <button
              className={`${styles.smallNavButton} ${styles.prevButton}`}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              ◀
            </button>

            <button
              className={`${styles.smallNavButton} ${styles.nextButton}`}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              ▶
            </button>
          </>
        )}

        <div className={styles.progressContainer}>
          {images.map((_, i) => (
            <button
              key={i}
              className={styles.progressBlock}
              onClick={() => goTo(i)}
            >
              <span
                className={`${styles.progressFill}
                ${i < currentIndex ? styles.filled : ""}
                ${i === currentIndex ? styles.animating : ""}`}
                style={{
                  animationDuration: `${AUTO_SCROLL_INTERVAL}ms`
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {isFullscreen && (
        <div className={styles.modal} onClick={closeFullscreen}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeFullscreen}>✕</button>

            <button className={`${styles.navButton} ${styles.prevButton}`} onClick={goPrev}>
              ◀
            </button>

            <div
              className={styles.fullscreenImage}
              style={{ backgroundImage: `url(${currentImage})` }}
            />

            <button className={`${styles.navButton} ${styles.nextButton}`} onClick={goNext}>
              ▶
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotGallery;