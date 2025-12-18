"use client";

import { useRef } from "react";
import MovieCard from "@/components/GameCard/GameCard";
import { TMDBMediaItem } from "@/types/tmdb";
import Link from "next/link";
import styles from "./HorizontalMovieScroll.module.css";

interface HorizontalMovieScrollProps {
  title: string;
  movies: TMDBMediaItem[];
  seeAllLink?: string;
  seeAllText?: string;
}

export default function HorizontalMovieScroll({
  title,
  movies,
  seeAllLink,
  seeAllText = "Все →"
}: HorizontalMovieScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {seeAllLink && (
          <Link href={seeAllLink} className={styles.seeAllLink}>
            {seeAllText}
          </Link>
        )}
      </div>
      <div className={styles.scrollSection}>
        <button 
          className={`${styles.scrollButton} ${styles.scrollButtonLeft}`} 
          onClick={scrollLeft}
          aria-label="Прокрутить влево"
        >
        </button>
        <div className={styles.horizontalScroll} ref={scrollRef}>
          <div className={styles.scrollContainer}>
            {movies.map((movie) => (
              <div key={`${title}-${movie.id}`} className={styles.movieCardWrapper}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
        <button 
          className={`${styles.scrollButton} ${styles.scrollButtonRight}`} 
          onClick={scrollRight}
          aria-label="Прокрутить вправо"
        >
        </button>
      </div>
    </div>
  );
}