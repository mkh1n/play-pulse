"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { personService } from "@/services/tmdbService";
import { Person, Movie, TVShow } from "@/types/tmdb";
import styles from "../../ExploreDetailPage.module.css";
import { getImageUrl } from "@/services/itemDetail";

interface ExtendedPerson extends Person {
  birthday?: string;
  deathday?: string | null;
  place_of_birth?: string;
  biography?: string;
  movie_credits?: {
    cast: Movie[];
  };
  tv_credits?: {
    cast: TVShow[];
  };
}

export default function PersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [person, setPerson] = useState<ExtendedPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    setPerson(null);

    try {
      const numericId = parseInt(id, 10);

      // Получаем данные персоны и её фильмографию
      const [personDetails, movieCredits, tvCredits] = await Promise.all([
        personService.getDetails(numericId),
        personService.getMovieCredits(numericId),
        personService.getTVCredits(numericId),
      ]);

      setPerson({
        ...personDetails,
        movie_credits: movieCredits,
        tv_credits: tvCredits,
      });
    } catch (err: any) {
      console.error("Error fetching person:", err);
      setError(err.message || "Ошибка при загрузке данных актера");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPersonData();
    }
  }, [id, fetchPersonData]);

  // Показываем состояние загрузки
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.loading}>Загрузка данных актера...</div>
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
  if (!person) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.error}>Актер не найден</div>
      </div>
    );
  }

  // Рендерим персону
  const profileUrl = getImageUrl(person.profile_path, "w500", true);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Назад
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.mainInfo}>
          {person.profile_path && (
            <div className={styles.profile}>
              <Image
                src={profileUrl}
                alt={person.name}
                width={300}
                height={450}
                className={styles.profileImage}
              />
            </div>
          )}

          <div className={styles.details}>
            <h1 className={styles.title}>{person.name}</h1>

            <div className={styles.metaInfo}>
              {person.known_for_department && (
                <span className={styles.metaItem}>
                  Департамент: {person.known_for_department}
                </span>
              )}
              {person.birthday && (
                <span className={styles.metaItem}>
                  Дата рождения:{" "}
                  {new Date(person.birthday).toLocaleDateString()}
                </span>
              )}
              {person.deathday && (
                <span className={styles.metaItem}>
                  Дата смерти: {new Date(person.deathday).toLocaleDateString()}
                </span>
              )}
              {person.place_of_birth && (
                <span className={styles.metaItem}>
                  Место рождения: {person.place_of_birth}
                </span>
              )}
            </div>

            {person.biography && (
              <div className={styles.overview}>
                <h3>Биография</h3>
                <p>{person.biography}</p>
              </div>
            )}
          </div>
        </div>

        {/* Фильмы */}
        {person.movie_credits?.cast && person.movie_credits.cast.length > 0 && (
          <div className={styles.section}>
            <h2>Фильмы</h2>
            <div className={styles.creditsGrid}>
              {person.movie_credits.cast
                .sort(
                  (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
                )
                .slice(0, 10)
                .map((movie: any) => (
                  <Link
                    key={movie.id}
                    href={`/explore/movie/${movie.id}`}
                    className={styles.creditItem}
                  >
                    {movie.poster_path && (
                      <Image
                        src={getImageUrl(movie.poster_path, "w300")}
                        alt={movie.title}
                        width={200}
                        height={300}
                        className={styles.creditImage}
                      />
                    )}
                    <p className={styles.creditTitle}>{movie.title}</p>
                    {movie.character && (
                      <p className={styles.creditRole}>
                        в роли: {movie.character}
                      </p>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Сериалы */}
        {person.tv_credits?.cast && person.tv_credits.cast.length > 0 && (
          <div className={styles.section}>
            <h2>Сериалы</h2>
            <div className={styles.creditsGrid}>
              {person.tv_credits.cast
                .sort(
                  (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
                )
                .slice(0, 10)
                .map((tv: any) => (
                  <Link
                    key={tv.id}
                    href={`/explore/tv/${tv.id}`}
                    className={styles.creditItem}
                  >
                    {tv.poster_path && (
                      <Image
                        src={getImageUrl(tv.poster_path, "w300")}
                        alt={tv.name}
                        width={200}
                        height={300}
                        className={styles.creditImage}
                      />
                    )}
                    <p className={styles.creditTitle}>{tv.name}</p>
                    {tv.character && (
                      <p className={styles.creditRole}>
                        в роли: {tv.character}
                      </p>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
