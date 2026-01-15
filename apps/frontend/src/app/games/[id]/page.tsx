"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GameDetails, getGameById, getDeals } from "@/services/gameService";
import GameActions from "@/components/GameActions/GameActions";
import GamesGrid from "@/components/GamesGrid/GamesGrid";
import styles from "../GameDetailPage.module.css";

export default function GameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [game, setGame] = useState<GameDetails | null>(null);
  const [similarGames, setSimilarGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;

    const fetchGameData = async () => {
      setLoading(true);
      setError(null);

      try {
        const numericId = parseInt(id, 10);

        // Получаем данные игры
        const gameData = await getGameById(numericId);
        console.log(gameData);
        setGame(gameData);
        const dealsData = await getDeals("product name");
        setDeals(dealsData);

        // Для похожих игр будем использовать игры из того же жанра
        if (gameData.genres && gameData.genres.length > 0) {
          // Временное решение - можно будет добавить отдельный эндпоинт для похожих игр
          fetch(`/api/games?genres=${gameData.genres[0].id}&page_size=6`)
            .then((res) => res.json())
            .then((data) => {
              // Фильтруем текущую игру из списка
              const filtered =
                data.results?.filter((g: any) => g.id !== gameData.id) || [];
              setSimilarGames(filtered.slice(0, 5));
            })
            .catch((err) =>
              console.error("Error fetching similar games:", err)
            );
        }
      } catch (err: any) {
        console.error("Error fetching game:", err);
        setError(err.message || "Ошибка при загрузке данных игры");
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id]);

  // Показываем состояние загрузки
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка данных игры...</p>
        </div>
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
        <div className={styles.error}>
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Если нет данных
  if (!game) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.error}>
          <h2>Игра не найдена</h2>
          <p>К сожалению, мы не смогли найти информацию об этой игре.</p>
          <Link href="/explore" className={styles.exploreLink}>
            Перейти к поиску игр
          </Link>
        </div>
      </div>
    );
  }

  // Форматируем дату
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Форматируем время игры
  const formatPlaytime = (minutes: number) => {
    if (!minutes || minutes <= 0) return "Не указано";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${minutes} мин`;
    }

    if (mins === 0) {
      return `${hours} ч`;
    }

    return `${hours} ч ${mins} мин`;
  };

  return (
    <div className={styles.container}>
      {/* Хедер */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Назад
        </button>
        <h1 className={styles.pageTitle}>Информация об игре</h1>
      </div>

      {/* Основное изображение */}
      {game.background_image && (
        <div className={styles.hero}>
          <Image
            src={game.background_image}
            alt={game.name}
            fill
            className={styles.heroImage}
            priority
            sizes="100vw"
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <h1 className={styles.gameTitle}>{game.name}</h1>
            {game.released && (
              <p className={styles.releaseDate}>{formatDate(game.released)}</p>
            )}
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className={styles.content}>
        <div className={styles.mainLayout}>
          <div>{game.id}</div>
          {/* Левая колонка: Постер и действия */}
          <div className={styles.sidebar}>
            {/* Постер */}
            {game.background_image && (
              <div className={styles.posterContainer}>
                <Image
                  src={game.background_image}
                  alt={game.name}
                  width={400}
                  height={300}
                  className={styles.poster}
                  priority
                />
              </div>
            )}

            {/* Кнопки действий */}
            <div className={styles.actionsContainer}>
              <GameActions gameId={game.id} gameName={game.name} />
            </div>

            {/* Статистика */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Рейтинг</span>
                <span className={styles.statValue}>
                  {game.rating
                    ? `${game.rating.toFixed(1)}/${game.rating_top || 5}`
                    : "Нет"}
                </span>
              </div>

              {game.metacritic && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Metacritic</span>
                  <span className={styles.metacriticScore}>
                    {game.metacritic}
                  </span>
                </div>
              )}

              {game.playtime > 0 && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Время игры</span>
                  <span className={styles.statValue}>
                    {formatPlaytime(game.playtime)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка: Детали */}
          <div className={styles.details}>
            {/* Описание */}
            {(game.description || game.description_raw) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Описание</h2>
                <div className={styles.description}>
                  {game.description_raw || game.description}
                </div>
              </section>
            )}
            {/* Предложения */}

            {deals.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Предложения</h2>
                <div className={styles.description}>
                  {deals.map((deal, index) => (
                    <div key={index} className={styles.dealItem}>
                      {/* Адаптируйте под структуру ваших данных */}
                      <h3>{deal.title || deal.name}</h3>
                      <p>Цена: {deal.price}</p>
                      <p>Продавец: {deal.seller}</p>
                      <a
                        href={deal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Перейти к предложению
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Жанры */}
            {game.genres && game.genres.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Жанры</h2>
                <div className={styles.genreList}>
                  {game.genres.map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/explore?genres=${genre.id}`}
                      className={styles.genreTag}
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Платформы */}
            {game.platforms && game.platforms.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Платформы</h2>
                <div className={styles.platformList}>
                  {game.platforms.map((platform) => (
                    <span
                      key={platform.platform.id}
                      className={styles.platformTag}
                    >
                      {platform.platform.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Разработчики */}
            {game.developers && game.developers.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Разработчики</h2>
                <div className={styles.developerList}>
                  {game.developers.map((developer) => (
                    <span key={developer.id} className={styles.developerTag}>
                      {developer.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Издатели */}
            {game.publishers && game.publishers.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Издатели</h2>
                <div className={styles.publisherList}>
                  {game.publishers.map((publisher) => (
                    <span key={publisher.id} className={styles.publisherTag}>
                      {publisher.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Теги */}
            {game.tags && game.tags.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Теги</h2>
                <div className={styles.tagList}>
                  {game.tags.slice(0, 10).map((tag) => (
                    <span key={tag.id} className={styles.tag}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Ссылки */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ссылки</h2>
              <div className={styles.links}>
                {game.website && (
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    🌐 Официальный сайт
                  </a>
                )}
                {game.reddit_url && (
                  <a
                    href={game.reddit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    🔗 Reddit
                  </a>
                )}
                {game.metacritic_url && (
                  <a
                    href={game.metacritic_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    🎮 Metacritic
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Скриншоты */}
        {game.screenshots && game.screenshots.length > 0 && (
          <section className={styles.screenshotsSection}>
            <h2 className={styles.sectionTitle}>Скриншоты</h2>
            <div className={styles.screenshots}>
              {game.screenshots.slice(0, 5).map((screenshot, index) => (
                <div key={index} className={styles.screenshotContainer}>
                  <Image
                    src={screenshot.image}
                    alt={`${game.name} скриншот ${index + 1}`}
                    width={400}
                    height={225}
                    className={styles.screenshot}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Похожие игры */}
        {similarGames.length > 0 && (
          <section className={styles.similarSection}>
            <h2 className={styles.sectionTitle}>Похожие игры</h2>
            <GamesGrid games={similarGames} />
          </section>
        )}
      </div>
    </div>
  );
}
