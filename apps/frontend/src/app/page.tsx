"use client";

import { useState, useEffect } from "react";
import HorizontalMovieScroll from "@/components/HorizontalMovieScroll/HorizontalMovieScroll";
import styles from "./HomePage.module.css";
import { TMDBMediaItem } from "@/types/tmdb";
import Link from "next/link";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<TMDBMediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBMediaItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBMediaItem[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBMediaItem[]>([]);
  const [topRated, setTopRated] = useState<TMDBMediaItem[]>([]);

  // Загружаем данные для главной
  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [
          popularMoviesRes,
          popularTVRes,
          topRatedRes,
        ] = await Promise.all([
          fetch("/api/movies?movies=true&tv=false&people=false&page=1"),
          fetch("/api/movies?movies=false&tv=true&people=false&page=1"),
          fetch("/api/movies?movies=true&tv=false&people=false&sort=vote_average.desc&page=1"),
        ]);

        const popularMoviesData = await popularMoviesRes.json();
        const popularTVData = await popularTVRes.json();
        const topRatedData = await topRatedRes.json();

        setPopularMovies(popularMoviesData.results?.slice(0, 20) || []);
        setPopularTV(popularTVData.results?.slice(0, 20) || []);
        setTopRated(topRatedData.results?.slice(0, 20) || []);
        
      } catch (error) {
        console.error("Error loading home data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className={styles.homeContainer}>
      {/* Hero секция */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Найди свои любимые фильмы</h1>
          <p className={styles.heroSubtitle}>
            Открой мир кино с миллионами фильмов, сериалов и актеров
          </p>
          <div className={styles.heroActions}>
            <Link href="/explore" className={styles.primaryButton}>
              Начать поиск
            </Link>
            <Link href="/explore?sort=popularity.desc" className={styles.secondaryButton}>
              Популярное
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : (
        <>

          <HorizontalMovieScroll
            title="Популярные фильмы"
            movies={popularMovies}
            seeAllLink="/explore?movies=true&tv=false"
            seeAllText="Все фильмы →"
          />

          <HorizontalMovieScroll
            title="Популярные сериалы"
            movies={popularTV}
            seeAllLink="/explore?movies=false&tv=true"
            seeAllText="Все сериалы →"
          />

          <HorizontalMovieScroll
            title="Лучшие по рейтингу"
            movies={topRated}
            seeAllLink="/explore?sort=vote_average.desc"
            seeAllText="Все лучшие →"
          />
        </>
      )}
    </div>
  );
}