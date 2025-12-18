"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { tvService } from "@/services/tmdbService";
import { TVShowDetails, TVShow, Credits } from "@/types/tmdb";
import styles from "../../ExploreDetailPage.module.css";
import { getYearFromDate, getImageUrl } from "@/services/itemDetail";
import Link from "next/link";
import { generateSearchLinks, SearchLink } from "@/services/findWatchLinks";
import StarRating from "@/components/StarRating/StarRaing";
import NoteBlock from "@/components/NoteBlock/NoteBlock";
import FavoriteButton from "@/components/FavoriteButton/FavoriteButton";
import WatchedButton from "@/components/WatchedButton/WatchedButton";

export default function TVDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [tvShow, setTVShow] = useState<TVShowDetails | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchLinks, setWatchLinks] = useState<SearchLink[] | null>(null);

  const fetchTVData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setTVShow(null);
    setCredits(null);

    try {
      const numericId = parseInt(id, 10);
      // Получаем все данные сериала
      const tvDetails = await tvService.getDetailsWithAppend(numericId);
      setTVShow(tvDetails as TVShowDetails);
      setCredits(tvDetails.credits || null);
      const links = await generateSearchLinks(tvDetails);
      setWatchLinks(links);
    } catch (err: any) {
      console.error("Error fetching TV show:", err);
      setError(err.message || "Ошибка при загрузке данных сериала");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTVData();
    }
  }, [id, fetchTVData]);

  // Показываем состояние загрузки
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.loading}>Загрузка данных сериала...</div>
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
  if (!tvShow) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.error}>Сериал не найден</div>
      </div>
    );
  }

  // Рендерим сериал
  const backdropUrl = getImageUrl(tvShow.backdrop_path, "original");
  const posterUrl = getImageUrl(tvShow.poster_path, "w500");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Назад
        </button>
      </div>

      {/* Бэкдроп */}
      {tvShow.backdrop_path && (
        <div className={styles.backdrop}>
          <Image
            src={backdropUrl}
            alt={tvShow.name}
            fill
            className={styles.backdropImage}
            priority
          />
          <div className={styles.backdropOverlay} />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.mainInfo}>
          {tvShow.poster_path && (
            <div className={styles.posterHolder}>
              <Image
                src={posterUrl}
                alt={tvShow.name}
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
                  mediaId={tvShow.id}
                  mediaType="tv"
                  mediaData={tvShow}
                  showLabel={false}
                  size="medium"
                />
                <WatchedButton
                  mediaId={tvShow.id}
                  mediaType="tv"
                  mediaData={tvShow}
                  showLabel={false}
                  size="medium"
                />
              </div>

              <StarRating
                mediaId={tvShow.id}
                mediaType="tv"
                mediaData={tvShow}
                showLabel={true}
              />
              <NoteBlock mediaId={tvShow.id} mediaType="tv" />
            </div>
          )}

          <div className={styles.details}>
            <h1 className={styles.title}>{tvShow.name}</h1>
            {tvShow.original_name !== tvShow.name && (
              <p className={styles.originalTitle}>{tvShow.original_name}</p>
            )}

            <div className={styles.metaInfo}>
              {tvShow.first_air_date && (
                <span className={styles.metaItem}>
                  Начало: {getYearFromDate(tvShow.first_air_date)}
                </span>
              )}
              {tvShow.last_air_date && (
                <span className={styles.metaItem}>
                  Конец: {getYearFromDate(tvShow.last_air_date)}
                </span>
              )}
              {tvShow.number_of_seasons && (
                <span className={styles.metaItem}>
                  Сезонов: {tvShow.number_of_seasons}
                </span>
              )}
              {tvShow.number_of_episodes && (
                <span className={styles.metaItem}>
                  Эпизодов: {tvShow.number_of_episodes}
                </span>
              )}
              {tvShow.vote_average && (
                <span className={styles.metaItem}>
                  Рейтинг: {tvShow.vote_average.toFixed(1)}/10
                </span>
              )}
            </div>

            {tvShow.genres && tvShow.genres.length > 0 && (
              <div className={styles.genres}>
                {tvShow.genres.map((genre) => (
                  <span key={genre.id} className={styles.genre}>
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {tvShow.overview && (
              <div className={styles.overview}>
                <h3>Описание</h3>
                <p>{tvShow.overview}</p>
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
      </div>
    </div>
  );
}
