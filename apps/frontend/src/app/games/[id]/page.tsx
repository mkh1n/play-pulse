"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  GameDetails,
  getGameById,
  getDealsWithAverage,
} from "@/services/gameService";
import GameActions from "@/components/GameActions/GameActions";
import GamesGrid from "@/components/GamesGrid/GamesGrid";
import styles from "../GameDetailPage.module.css";
import { scrollToSectionWithOffset } from "@/services/scrollService";
import ScreenshotGallery from "@/components/ScreenshotGallery/ScreenshotGallery";

export default function GameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [game, setGame] = useState<GameDetails | null>(null);
  const [similarGames, setSimilarGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [averagePrice, setAveragePrice] = useState<number | null>(null);

  // Состояния для сортировки и отображения предложений
  const [sortOrder, setSortOrder] = useState<"price" | "rating">("price");
  const [showAll, setShowAll] = useState(false);


  const navItems = [
    { id: "screenshots", label: "Скриншоты" },
    { id: "description", label: "Описание" },
    { id: "deals", label: "Предложения" },
    { id: "similar", label: "Похожие игры" },
  ];



  // Сортируем и фильтруем предложения
  const sortedDeals = useMemo(() => {
    if (!deals || !Array.isArray(deals)) return [];

    const validDeals = deals.filter(
      (d) => d.price_rur != null && d.seller_rating != null
    );

    // Сортировка
    const sorted = [...validDeals].sort((a, b) => {
      if (sortOrder === "price") {
        return a.price_rur - b.price_rur;
      } else {
        // Рейтинг — по убыванию (лучшие выше)
        return b.seller_rating - a.seller_rating;
      }
    });

    // Показываем 1 или 10
    const limit = showAll ? 10 : 3;
    return sorted.slice(0, limit);
  }, [deals, sortOrder, showAll]);

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
        const { items: dealsData, averagePrice } = await getDealsWithAverage(
          gameData.name
        );
        setDeals(dealsData);
        setAveragePrice(averagePrice);

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
            <div className={styles.heroConetntTop}>
              <div className={styles.heroContentLeft}>
                <h1 className={styles.gameTitle}>{game.name}</h1>
                {game.released && (
                  <p className={styles.releaseDate}>{formatDate(game.released)}</p>
                )}
              </div>
              <div className={styles.heroContentRight}>
                {averagePrice !== null && (
                  <div className={styles.averagePrice} onClick={() => scrollToSectionWithOffset('deals')}
                  >
                    Средняя цена
                    <div className={styles.priceDelimiter}></div>
                    <div className={styles.averagePriceText}>
                      {averagePrice.toLocaleString("ru-RU").split(',')[0].replaceAll(' ', ' &nbsp;')} ₽
                    </div>
                  </div>
                )}

                <div className={styles.linksIcon}>
                  <img src="/icons/site.svg" alt="" />
                </div>
                <div className={styles.links}>
                  {game.website && (
                    <a
                      href={game.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkButton}
                    >
                      <img src="/icons/official.svg" alt="" className={styles.siteIconSmal} />Официальный сайт
                    </a>
                  )}
                  {game.reddit_url && (
                    <a
                      href={game.reddit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkButton}
                    >
                      <img src="/icons/reddit.svg" alt="" className={styles.siteIconSmal} />Reddit
                    </a>
                  )}
                  {game.metacritic_url && (
                    <a
                      href={game.metacritic_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkButton}
                    >
                      <img src="/icons/m.svg" alt="" className={styles.siteIconSmal} /> Metacritic
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.heroContentBottom}>
              <div className={styles.navButtons}>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSectionWithOffset(item.id)}
                    className={styles.navButton}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className={styles.content}>
        <div className={styles.topContentBlock}>

          {game?.screenshots?.results?.length > 0 && (
            <ScreenshotGallery screenshots={game.screenshots} />
          )}

          <div className={styles.sidebar}>
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
            <div className={styles.actionsContainer}>
              <GameActions gameId={game.id} gameName={game.name} />
            </div>
          </div>
        </div>


        {/* Правая колонка: Детали */}
        <div className={styles.details}>
          {/* Описание */}
          {(game.description || game.description_raw) && (
            <section className={styles.section} id="description">
              <h2 className={styles.sectionTitle}>Описание</h2>
              <div className={styles.description}>
                {game.description_raw || game.description}
              </div>
            </section>
          )}
          {/* Предложения */}

          {sortedDeals.length > 0 && (
            <section className={styles.section} id="deals">
              <div className={styles.dealsHeader}>
                <h2 className={styles.sectionTitle}>Предложения</h2>
                <div className={styles.sortControls}>
                  <label htmlFor="sort-deals" className={styles.sortLabel}>
                    Сортировка:
                  </label>
                  <select
                    id="sort-deals"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "price" | "rating")
                    }
                    className={styles.sortSelect}
                  >
                    <option value="price">Сначала дешёвые</option>
                    <option value="rating">Сначала лучшие продавцы</option>
                  </select>
                </div>
              </div>

              <div className={styles.dealsList}>
                {sortedDeals.map((deal, index) => (
                  <div
                    key={`${deal.id || index}`}
                    className={styles.dealCard}
                  >
                    {deal.image && (
                      <div className={styles.dealImageContainer}>
                        <img
                          src={`/api/crop-image?url=${encodeURIComponent(
                            "https:" + deal.image
                          )}`}
                          alt={deal.seller_name}
                          width={80}
                          height={80}
                          className={styles.dealImage} // твои стили всё равно работают
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className={styles.dealInfo}>
                      <div className={styles.dealTop}>
                        <h3 className={styles.dealSeller}>
                          {deal.seller_name}
                        </h3>
                        <div className={styles.dealRating}>
                          ⭐ {deal.seller_rating?.toFixed(0) || "—"}
                        </div>
                      </div>
                      <p className={styles.dealName}>{deal.name}</p>

                      <p className={styles.dealPrice}>
                        {deal.price_rur.toLocaleString("ru-RU")} ₽
                      </p>
                      <a
                        href={deal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.dealLink}
                      >
                        Перейти к предложению →
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {deals.length > 3 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={styles.toggleDealsButton}
                >
                  {showAll
                    ? "Скрыть"
                    : `Показать ещё (${Math.min(9, deals.length - 1)})`}
                </button>
              )}
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
        </div>
      </div>


      {/* Похожие игры */}
      {similarGames.length > 0 && (
        <section className={styles.similarSection} id="similar">
          <h2 className={styles.sectionTitle}>Похожие игры</h2>
          <GamesGrid games={similarGames} />
        </section>
      )}
    </div>
  );
}
