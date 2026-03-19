"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GamesGrid from '@/components/GamesGrid/GamesGrid';
import GameActions from '@/components/GameActions/GameActions';
import gameService, { GameSortOption } from '@/services/gameService';
import styles from './HomePage.module.css';

type TabType = 'popular' | 'new' | 'recommended' | 'trending';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const [sortBy, setSortBy] = useState<GameSortOption>('-rating');
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedGames, setRecommendedGames] = useState<any[]>([]);

  useEffect(() => {
    loadGames();
  }, [activeTab, sortBy]);

  const loadGames = async () => {
    setIsLoading(true);
    try {
      let response;
      
      switch (activeTab) {
        case 'recommended':
          if (isAuthenticated) {
            response = await fetch('/api/recommendations/personalized?limit=20');
            if (response.ok) {
              const data = await response.json();
              setRecommendedGames(data.recommendations || []);
            }
          } else {
            // Для неавторизованных показываем популярные
            response = await gameService({}, 1, 20, '-rating');
            setGames(response.results);
          }
          break;
          
        case 'new':
          const currentYear = new Date().getFullYear();
          response = await gameService(
            { dates: `${currentYear}-01-01,${currentYear}-12-31` },
            1,
            20,
            '-released'
          );
          setGames(response.results);
          break;
          
        case 'trending':
          response = await gameService({}, 1, 20, '-added');
          setGames(response.results);
          break;
          
        default: // popular
          response = await gameService({}, 1, 20, sortBy);
          setGames(response.results);
          break;
      }
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (value: GameSortOption) => {
    setSortBy(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Откройте мир игр</h1>
        <p className={styles.subtitle}>Найдите свою следующую любимую игру</p>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'popular' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            🔥 Популярные
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'new' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('new')}
          >
            🆕 Новинки
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'trending' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            📈 В тренде
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'recommended' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('recommended')}
          >
            💫 Для вас
          </button>
        </div>

        {activeTab === 'popular' && (
          <div className={styles.sortControls}>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as GameSortOption)}
              className={styles.sortSelect}
            >
              <option value="-rating">По рейтингу ⬇</option>
              <option value="-released">По дате выхода ⬇</option>
              <option value="name">По названию (A-Z)</option>
              <option value="-name">По названию (Z-A)</option>
              <option value="-metacritic">По Metacritic ⬇</option>
              <option value="-added">По популярности ⬇</option>
            </select>
          </div>
        )}
      </div>

      {activeTab === 'recommended' && !isAuthenticated && (
        <div className={styles.authPrompt}>
          <h3>💡 Персональные рекомендации</h3>
          <p>Войдите в аккаунт, чтобы получать рекомендации на основе ваших предпочтений</p>
          <div className={styles.authButtons}>
            <a href="/auth?tab=login" className={styles.authButton}>Войти</a>
            <a href="/auth?tab=register" className={`${styles.authButton} ${styles.registerButton}`}>
              Зарегистрироваться
            </a>
          </div>
        </div>
      )}

      <div className={styles.gamesSection}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Загрузка игр...</p>
          </div>
        ) : (
          <>
            {activeTab === 'recommended' && isAuthenticated ? (
              <>
                <h2 className={styles.sectionTitle}>Рекомендуем специально для вас</h2>
                {recommendedGames.length > 0 ? (
                  <GamesGrid games={recommendedGames} />
                ) : (
                  <div className={styles.emptyRecommendations}>
                    <p>Оцените несколько игр, чтобы получить персональные рекомендации</p>
                    <a href="/games" className={styles.exploreLink}>Перейти к играм →</a>
                  </div>
                )}
              </>
            ) : (
              <GamesGrid games={games} />
            )}
          </>
        )}
      </div>

      {activeTab === 'recommended' && isAuthenticated && recommendedGames.length > 0 && (
        <div className={styles.recommendationInfo}>
          <h3>Как работают рекомендации?</h3>
          <p>
            Мы анализируем ваши лайки, оценки и добавленные в wishlist игры, чтобы подбирать игры, 
            которые могут вам понравиться на основе схожих жанров, тегов и предпочтений других пользователей.
          </p>
        </div>
      )}
    </div>
  );
}