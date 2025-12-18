"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { movieService } from "@/services/tmdbService";
import { MovieDetails, Movie, Credits } from "@/types/tmdb";
import styles from "../../ExploreDetailPage.module.css";
import { getYearFromDate, getImageUrl } from "@/services/itemDetail";
import { generateSearchLinks, SearchLink } from "@/services/findWatchLinks";
import StarRating from "@/components/StarRating/StarRaing";
import NoteBlock from "@/components/NoteBlock/NoteBlock";
import FavoriteButton from "@/components/FavoriteButton/FavoriteButton";
import WatchedButton from "@/components/WatchedButton/WatchedButton";
import WatchlistButton from "@/components/WatchlistButton/WatchlistButton";

export default function MovieDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchLinks, setWatchLinks] = useState<SearchLink[] | null>(null);

  const fetchMovieData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setMovie(null);
    setCredits(null);
    setSimilar([]);

    try {
      const numericId = parseInt(id, 10);

      // Получаем все данные фильма
      const movieDetails = await movieService.getDetailsWithAppend(numericId);
      setMovie(movieDetails as MovieDetails);
      setCredits(movieDetails.credits || null);
      setSimilar(movieDetails.similar?.results || []);
      const links = await generateSearchLinks(movieDetails);
      setWatchLinks(links);
    } catch (err: any) {
      console.error("Error fetching movie:", err);
      setError(err.message || "Ошибка при загрузке данных фильма");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMovieData();
    }
  }, [id, fetchMovieData]);

  // Показываем состояние загрузки
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.loading}>Загрузка данных фильма...</div>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  // Если нет данных
  if (!movie) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.error}>Фильм не найден</div>
      </div>
    );
  }

  // Рендерим фильм
  const backdropUrl = getImageUrl(movie.backdrop_path, "original");
  const posterUrl = getImageUrl(movie.poster_path, "w500");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Назад
        </button>
      </div>

      {/* Бэкдроп */}
      {movie.backdrop_path && (
        <div className={styles.backdrop}>
          <Image
            src={backdropUrl}
            alt={movie.title}
            fill
            className={styles.backdropImage}
            priority
          />
          <div className={styles.backdropOverlay} />
        </div>
      )}

      <div className={styles.content}>
        {/* Постер и основная информация */}
        <div className={styles.mainInfo}>
          {movie.poster_path && (
            <div className={styles.posterHolder}>
              <Image
                src={posterUrl}
                alt={movie.title}
                width={300}
                height={450}
                className={styles.posterImage}
              />
              <div className={styles.watchLinkBlock}>
                <p>Искать в</p>
                <div className={styles.watchLinkHolder}>
                  {watchLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      className={`${styles.watchLink} ${styles[link.engine]}`}
                    >
                      <Image
                        src={`/icons/${link.engine}.svg`}
                        alt={link.engine}
                        width={40}
                        height={40}
                      />
                    </a>
                  ))}
                </div>
              </div>
              <div className={styles.interactiveButtonHolder}>
                <FavoriteButton
                  mediaId={movie.id}
                  mediaType="movie"
                  mediaData={movie}
                  showLabel={false}
                  size="medium"
                />
                <WatchedButton
                  mediaId={movie.id}
                  mediaType="movie"
                  mediaData={movie}
                  showLabel={false}
                  size="medium"
                />
                 <WatchlistButton
                  mediaId={movie.id}
                  mediaType="movie"
                  mediaData={movie}
                  showLabel={false}
                  size="medium"
                />
              </div>

              <StarRating
                mediaId={movie.id}
                mediaType="movie"
                mediaData={movie}
                showLabel={true}
              />
              <NoteBlock mediaId={movie.id} mediaType="movie" />
            </div>
          )}

          <div className={styles.details}>
            <h1 className={styles.title}>{movie.title}</h1>
            {movie.original_title !== movie.title && (
              <p className={styles.originalTitle}>{movie.original_title}</p>
            )}

            <div className={styles.metaInfo}>
              {movie.release_date && (
                <span className={styles.metaItem}>
                  Год: {getYearFromDate(movie.release_date)}
                </span>
              )}
              {movie.runtime && (
                <span className={styles.metaItem}>
                  Время: {movie.runtime} мин.
                </span>
              )}
              {movie.vote_average && (
                <span className={styles.metaItem}>
                  Рейтинг: {movie.vote_average.toFixed(1)}/10
                </span>
              )}
            </div>

            {movie.genres && movie.genres.length > 0 && (
              <div className={styles.genres}>
                {movie.genres.map((genre) => (
                  <span key={genre.id} className={styles.genre}>
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {movie.overview && (
              <div className={styles.overview}>
                <h3>Описание</h3>
                <p>{movie.overview}</p>
              </div>
            )}
          </div>
        </div>

        {/* Актеры */}
        {credits?.cast && credits.cast.length > 0 && (
          <div className={styles.section}>
            <h2>Актерский состав</h2>
            <div className={styles.castGrid}>
              {credits.cast.slice(0, 10).map((actor) => (
                <Link
                  key={actor.id}
                  href={`/explore/person/${actor.id}`}
                  className={styles.castItem}
                >
                  {actor.profile_path ? (
                    <Image
                      src={getImageUrl(actor.profile_path, "w200", true)}
                      alt={actor.name}
                      width={100}
                      height={150}
                      className={styles.castImage}
                    />
                  ) : (
                    <div className={styles.noImage} />
                  )}
                  <p className={styles.castName}>{actor.name}</p>
                  <p className={styles.castCharacter}>{actor.character}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Похожие фильмы */}
        {similar && similar.length > 0 && (
          <div className={styles.section}>
            <h2>Похожие фильмы</h2>
            <div className={styles.similarGrid}>
              {similar.slice(0, 6).map((movieItem) => (
                <Link
                  key={movieItem.id}
                  href={`/explore/movie/${movieItem.id}`}
                  className={styles.similarItem}
                >
                  {movieItem.poster_path && (
                    <Image
                      src={getImageUrl(movieItem.poster_path, "w300")}
                      alt={movieItem.title}
                      width={200}
                      height={300}
                      className={styles.similarImage}
                    />
                  )}
                  <p className={styles.similarTitle}>{movieItem.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
