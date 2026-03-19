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

  const [sortOrder, setSortOrder] = useState<"price" | "rating">("rating");
  const [showAll, setShowAll] = useState(false);
  const [activeNav, setActiveNav] = useState("screenshots");

  const navItems = [
    { id: "screenshots", label: "Скриншоты" },
    { id: "description", label: "Описание" },
    { id: "deals", label: "Предложения" },
    { id: "similar", label: "Похожие игры" },
  ];

  const sortedDeals = useMemo(() => {
    if (!deals || !Array.isArray(deals)) return [];
    const validDeals = deals.filter(
      (d) => d.price_rur != null && d.seller_rating != null
    );
    const sorted = [...validDeals].sort((a, b) => {
      if (sortOrder === "price") return a.price_rur - b.price_rur;
      return b.seller_rating - a.seller_rating;
    });
    const limit = showAll ? 16 : 4;
    return sorted.slice(0, limit);
  }, [deals, sortOrder, showAll]);

  useEffect(() => {
    if (!id) return;
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      try {
        const numericId = parseInt(id, 10);
        const gameData = await getGameById(numericId);
        setGame(gameData);
        const { items: dealsData, averagePrice } = await getDealsWithAverage(
          gameData.name
        );
        setDeals(dealsData);
        setAveragePrice(averagePrice);

        fetch(`/api/recommendations/similar/${numericId}?limit=8`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.games) setSimilarGames(data.games);
          })
          .catch((err) => console.error("Error fetching similar games:", err));
      } finally {
        setLoading(false);
      }
    };
    fetchGameData();
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", { year: "numeric" });
    } catch {
      return dateString;
    }
  };

  const formatPlaytime = (minutes: number) => {
    if (!minutes || minutes <= 0) return "Не указано";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${minutes} мин`;
    if (mins === 0) return `${hours} ч`;
    return `${hours} ч ${mins} мин`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Назад
          </button>
        </div>
        <div className={styles.heroSkeleton}>
          <div className={styles.heroImageSkeleton} />
          <div className={styles.titleSkeleton} />

          <div className={styles.heroContentSkeleton}>
            <div className={styles.metaSkeleton} />
          </div>
        </div>
        <div className={styles.contentSkeleton}>
          <div className={styles.sidebarSkeleton}>
            <div className={styles.statSkeleton} />
            <div className={styles.statSkeleton} />
            <div className={styles.statSkeleton} />
            <div className={styles.actionsSkeleton} />
          </div>
          <div className={styles.detailsSkeleton}>
            <div className={styles.sectionSkeleton} />
            <div className={styles.sectionSkeleton} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Что-то пошло не так</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}></div>
          <h2>Игра не найдена</h2>
          <p>К сожалению, мы не смогли найти информацию об этой игре.</p>
          <Link href="/games" className={styles.exploreButton}>
            Перейти к поиску игр
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <span className={styles.backIcon}>←</span> Назад
          </button>

        </div>
      </header>

      {/* 🖼️ Hero секция с параллакс-эффектом */}
      {game.background_image && (
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <Image
              src={game.background_image}
              alt={game.name}
              fill
              className={styles.heroImage}
              priority
              sizes="100vw"
            />
            <div className={styles.heroGradient} />
            <div className={styles.heroBlur} />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroMain}>
              <div className={styles.heroText}>
                <h1 className={styles.gameTitle}>{game.name}</h1>
                <div className={styles.gameMeta}>
                  {game.released && (
                    <span className={styles.metaItem}>
                      {formatDate(game.released)}
                    </span>
                  )}
                  {game.developers?.[0] && (
                    <span className={styles.metaItem}>
                      {game.developers[0].name}
                    </span>
                  )}
                  {game.genres?.[0] && (
                    <span className={styles.metaItem}>
                      {game.genres[0].name}
                    </span>
                  )}
                </div>
              </div>


            </div>

            <div className={styles.heroActions}>
              <div className={styles.heroActionsLeft}>
                {averagePrice !== null && (
                  <button
                    className={styles.priceButton}
                    onClick={() => scrollToSectionWithOffset('deals')}
                  >
                    <span className={styles.priceLabel}>Средняя цена</span>
                    <span className={styles.priceValue}>
                      {averagePrice.toLocaleString("ru-RU").split(',')[0]} ₽
                    </span>
                    <span className={styles.priceArrow}>→</span>
                  </button>
                )}

                
              </div>
              <div className={styles.ratingBadges}>
                <div className={styles.externalLinks}>
                  {[
                    { href: game.website, label: "Сайт", icon: "../icons/site.svg" },
                    { href: game.reddit_url, label: "Reddit", icon: "../icons/reddit.svg" },
                    { href: game.metacritic_url, label: "Metacritic", icon: "../icons/m.svg" },
                  ].filter((l) => l.href).map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.externalLink}
                      title={link.label}
                    >
                      <img src={link.icon} className={styles.externalLinkIcon} />
                    </a>
                  ))}
                </div>
                {game.rating && (
                  <div className={styles.ratingBadge}>
                    <span className={styles.ratingValue}>{game.rating.toFixed(1)}</span>
                    <span className={styles.ratingLabel}>RAWG</span>
                  </div>
                )}
                {game.metacritic && (
                  <a className={`${styles.ratingBadge} ${styles.metacritic}`} href={game.metacritic_url}>
                    <span className={styles.ratingValue}>{game.metacritic}</span>
                    <span className={styles.ratingLabel}>MC</span>
                  </a>
                )}
              </div>

            </div>

            {/* 🧭 Навигация по секциям */}
            <nav className={styles.sectionNav}>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    scrollToSectionWithOffset(item.id);
                  }}
                  className={`${styles.navItem} ${activeNav === item.id ? styles.navItemActive : ""
                    }`}
                >
                  <span className={styles.navLabel}>{item.label}</span>
                  {activeNav === item.id && (
                    <span className={styles.navIndicator} />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>
      )}

      {/* 📦 Основной контент */}
      <main className={styles.main}>
        <div className={styles.contentGrid}>
          {/* 🎮 Скриншоты */}
          {game?.screenshots?.length > 0 && (
              <ScreenshotGallery screenshots={game.screenshots} />
          )}

          {/* 📊 Сайдбар */}
          <aside className={styles.sidebar}>
            {/* Действия */}
            <div className={styles.actionsCard}>
              <GameActions gameId={game.id} gameName={game.name} />
            </div>

            {/* Платформы */}
            {game.platforms?.length > 0 && (
              <div className={styles.platformsCard}>
                <h4 className={styles.cardSubTitle}>Платформы</h4>
                <div className={styles.platformChips}>
                  {game.platforms.map((p) => (
                    <span key={p.platform.id} className={styles.platformChip}>
                      {p.platform.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* 📝 Детали игры */}
        <div className={styles.details}>
          {/* Описание */}
          {(game.description || game.description_raw) && (
            <section id="description" className={styles.section}>
              <h2 className={styles.sectionTitle}>Описание</h2>
              <div className={styles.description}>
                {game.description_raw || game.description}
              </div>
            </section>
          )}

          {/* Предложения */}
          {sortedDeals.length > 0 && (
            <section id="deals" className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Предложения</h2>
                <div className={styles.sortControl}>
                  <label>Сортировка:</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "price" | "rating")}
                    className={styles.sortSelect}
                  >
                    <option value="rating">Лучшие продавцы</option>
                    <option value="price">Сначала дешёвые</option>
                  </select>
                </div>
              </div>

              <div className={styles.dealsGrid}>
                {sortedDeals.map((deal) => (
                  <a
                    key={deal.id}
                    href={deal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.dealCard}
                  >
                    {deal.image && (
                      <div className={styles.dealImage}>
                        <img
                          src={`/api/crop-image?url=${encodeURIComponent("https:" + deal.image)}`}
                          alt={deal.seller_name}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className={styles.dealContent}>
                      <div className={styles.dealHeader}>
                        <h4 className={styles.dealSeller}>{deal.seller_name}</h4>
                        <span className={styles.dealRating}>⭐ {deal.seller_rating?.toFixed(0)}</span>
                      </div>
                      <p className={styles.dealName}>{deal.name}</p>
                      <div className={styles.dealFooter}>
                        <span className={styles.dealPrice}>
                          {deal.price_rur.toLocaleString("ru-RU")} ₽
                        </span>
                        <span className={styles.dealArrow}>→</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {deals.length > 3 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={styles.toggleButton}
                >
                  {showAll ? "Скрыть" : `Показать ещё (${Math.min(9, deals.length - 1)})`}
                </button>
              )}
            </section>
          )}

          {/* Мета-теги */}
          <div className={styles.metaGrid}>
            {game.genres?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Жанры</h3>
                <div className={styles.chipGroup}>
                  {game.genres.map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/games?genres=${genre.id}`}
                      className={styles.chip}
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {game.tags?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Теги</h3>
                <div className={styles.chipGroup}>
                  {game.tags.slice(0, 12).map((tag) => (
                    <span key={tag.id} className={styles.chip}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {game.developers?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Разработчики</h3>
                <div className={styles.chipGroup}>
                  {game.developers.map((dev) => (
                    <span key={dev.id} className={styles.chip}>
                      {dev.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {game.publishers?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Издатели</h3>
                <div className={styles.chipGroup}>
                  {game.publishers.map((pub) => (
                    <span key={pub.id} className={styles.chip}>
                      {pub.name}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ✨ Похожие игры */}
        {similarGames.length > 0 && (
          <section id="similar" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Похожие игры</h2>
              <Link href="/games" className={styles.viewAllLink}>
                Все игры →
              </Link>
            </div>
            <GamesGrid games={similarGames} showRecommendationReason />
          </section>
        )}
      </main>
    </div>
  );
}