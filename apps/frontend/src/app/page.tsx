// app/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./HomePage.module.css";

import GameCard from "@/components/GameCard/GameCard";
import NewsCard from "@/components/NewsCard/NewsCard";

export default function HomePage() {
  const [popularGames, setPopularGames] = useState([]);
  const [actionGames, setActionGames] = useState([]);
  const [rpgGames, setRpgGames] = useState([]);
  const [indieGames, setIndieGames] = useState([]);
  const [news, setNews] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [
          popularRes,
          actionRes,
          rpgRes,
          indieRes,
          newsRes,
        ] = await Promise.all([
          fetch("/api/games?ordering=-rating&page_size=6"),
          fetch("/api/games?genres=action&page_size=6"),
          fetch("/api/games?genres=role-playing-games-rpg&page_size=6"),
          fetch("/api/games?genres=indie&page_size=6"),
          fetch("/api/news/rss"),
        ]);

        const popularData = await popularRes.json();
        const actionData = await actionRes.json();
        const rpgData = await rpgRes.json();
        const indieData = await indieRes.json();
        const newsData = await newsRes.json();

        setPopularGames(popularData.results.slice(0, 8) || []);
        setActionGames(actionData.results.slice(0, 8) || []);
        setRpgGames(rpgData.results.slice(0, 8) || []);
        setIndieGames(indieData.results.slice(0, 8) || []);

        if (newsData.success) {
          setNews(newsData.items.slice(0, 6));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className={styles.home}>
      <title>PlayPulse | Главная</title>

      {/* HERO */}

      <section className={styles.hero}>
        <img src="./icons/playpulse.svg" alt="" className={styles.mainImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.badge}>
            PlayPulse
          </span>

          <h1 className={styles.heroTitle}>
            Игры, новости и свайпы
          </h1>

          <p className={styles.heroText}>
            Следи за новыми релизами,
            находи лучшие игры по жанрам
            и читай свежие игровые новости.
          </p>

          <div className={styles.heroButtons}>
            <Link
              href="/games"
              className={styles.primaryButton}
            >
              Каталог игр
            </Link>

            <Link
              href="/news"
              className={styles.secondaryButton}
            >
              Новости
            </Link>
            <Link
              href="/swipes"
              className={styles.secondaryButton}
            >
              Свайпы
            </Link>
          </div>
        </div>
      </section>

      {/* POPULAR */}

      <GamesSection
        title="Популярные игры"
        href="/games?sort=popular"
        games={popularGames}
      />
      {/* NEWS */}

      <section className={styles.section}>
        <SectionHeader
          title="Новости"
          href="/news"
        />

        <div className={styles.newsGrid}>
          {news.map((article: any) => (
            <NewsCard
              key={article.id}
              article={article}
              variant="medium"
            />
          ))}
        </div>
      </section>

      {/* ACTION */}

      <GamesSection
        title="Action"
        href="/games?genre=action"
        games={actionGames}
      />

      {/* RPG */}

      <GamesSection
        title="RPG"
        href="/games?genre=role-playing-games-rpg"
        games={rpgGames}
      />

      {/* INDIE */}

      <GamesSection
        title="Инди"
        href="/games?genre=indie"
        games={indieGames}
      />


    </div>
  );
}

function GamesSection({
  title,
  href,
  games,
}: {
  title: string;
  href: string;
  games: any[];
}) {
  return (
    <section className={styles.section}>
      <SectionHeader
        title={title}
        href={href}
      />

      <div className={styles.gamesGrid}>
        {games.map((game: any) => (
          <GameCard
            key={game.id}
            game={game}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>
        {title}
      </h2>

      <Link
        href={href}
        className={styles.moreButton}
      >
        Ещё
      </Link>
    </div>
  );
}