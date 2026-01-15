"use client";

import { useMemo, useState } from 'react';
import styles from './StatsCharts.module.css';

interface StatsChartsProps {
  genresStats: { [key: string]: number };
  tagsStats: { [key: string]: number };
  likedGenresStats?: { [key: string]: number };
  likedTagsStats?: { [key: string]: number };
  highRatedGenresStats?: { [key: string]: number };
  highRatedTagsStats?: { [key: string]: number };
  maxItems?: number;
}

export default function StatsCharts({ 
  genresStats, 
  tagsStats, 
  likedGenresStats = {},
  likedTagsStats = {},
  highRatedGenresStats = {},
  highRatedTagsStats = {},
  maxItems = 10 
}: StatsChartsProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'liked' | 'highRated'>('all');

  // Функция для преобразования и сортировки статистики
  const prepareStatsData = (statsObj: { [key: string]: number }) => {
    return Object.entries(statsObj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);
  };

  // Подготовка данных для разных типов статистики
  const allGenres = useMemo(() => prepareStatsData(genresStats), [genresStats, maxItems]);
  const allTags = useMemo(() => prepareStatsData(tagsStats), [tagsStats, maxItems]);
  const likedGenres = useMemo(() => prepareStatsData(likedGenresStats), [likedGenresStats, maxItems]);
  const likedTags = useMemo(() => prepareStatsData(likedTagsStats), [likedTagsStats, maxItems]);
  const highRatedGenres = useMemo(() => prepareStatsData(highRatedGenresStats), [highRatedGenresStats, maxItems]);
  const highRatedTags = useMemo(() => prepareStatsData(highRatedTagsStats), [highRatedTagsStats, maxItems]);

  // Находим максимальные значения для нормализации столбиков
  const maxGenreCount = allGenres.length > 0 ? Math.max(...allGenres.map(g => g.count)) : 0;
  const maxLikedGenreCount = likedGenres.length > 0 ? Math.max(...likedGenres.map(g => g.count)) : 0;
  const maxHighRatedGenreCount = highRatedGenres.length > 0 ? Math.max(...highRatedGenres.map(g => g.count)) : 0;

  // Создаем цвета для пирог-чарта
  const pieColors = [
    '#4299e1', '#ed8936', '#48bb78', '#9f7aea', '#f56565', 
    '#ed64a6', '#38b2ac', '#ecc94b', '#667eea', '#ed8936',
    '#f687b3', '#4fd1c7', '#f6ad55', '#90cdf4', '#fc8181',
    '#9ae6b4', '#fbb6ce', '#d6bcfa', '#a0aec0', '#e2e8f0'
  ];

  // Компонент для отображения столбчатой диаграммы (для жанров)
  const BarChart = ({ 
    title, 
    data, 
    maxCount,
    color = '#4299e1'
  }: { 
    title: string; 
    data: { name: string; count: number }[]; 
    maxCount: number;
    color?: string;
  }) => {
    if (data.length === 0) return null;

    return (
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.barChart}>
          {data.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 200 : 0;
            return (
              <div key={`${item.name}-${index}`} className={styles.barContainer}>
                <div className={styles.barWrapper}>
                  <div 
                    className={styles.bar}
                    style={{ 
                      height: `${height}px`,
                      background: `linear-gradient(to top, ${color}, ${color}88)`
                    }}
                    data-count={item.count}
                  >
                    <span className={styles.barValue}>{item.count}</span>
                  </div>
                </div>
                <div className={styles.barLabel}>
                  {item.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Компонент для отображения пирог-чарта (для тегов)
  const PieChart = ({ 
    title, 
    data 
  }: { 
    title: string; 
    data: { name: string; count: number }[]; 
  }) => {
    if (data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;

    return (
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.pieChartContainer}>
          <svg width="200" height="200" viewBox="0 0 200 200" className={styles.pieChart}>
            {data.map((item, index) => {
              const percentage = (item.count / total) * 100;
              const angle = (item.count / total) * 360;
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const x1 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
              
              const x2 = 100 + 80 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = 100 + 80 * Math.sin(((currentAngle + angle) * Math.PI) / 180);

              const pathData = `
                M 100 100
                L ${x1} ${y1}
                A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
              `;

              const sliceColor = pieColors[index % pieColors.length];
              currentAngle += angle;

              return (
                <path
                  key={`${item.name}-${index}`}
                  d={pathData}
                  fill={sliceColor}
                  className={styles.pieSlice}
                  data-name={item.name}
                  data-count={item.count}
                  data-percentage={percentage.toFixed(1)}
                />
              );
            })}
            <circle cx="100" cy="100" r="30" fill="#1a202c" />
            <text x="100" y="100" textAnchor="middle" dy=".3em" className={styles.pieCenterText}>
              {total}
            </text>
          </svg>
          
          {/* Легенда */}
          <div className={styles.legend}>
            {data.map((item, index) => {
              const percentage = ((item.count / total) * 100).toFixed(1);
              return (
                <div key={`legend-${item.name}-${index}`} className={styles.legendItem}>
                  <div 
                    className={styles.legendColor} 
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className={styles.legendLabel}>
                    {item.name} ({item.count}, {percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Определяем, какие графики показывать
  const hasAllStats = allGenres.length > 0 || allTags.length > 0;
  const hasLikedStats = likedGenres.length > 0 || likedTags.length > 0;
  const hasHighRatedStats = highRatedGenres.length > 0 || highRatedTags.length > 0;

  // Текущие данные в зависимости от активной вкладки
  const currentGenres = activeTab === 'all' ? allGenres : 
                       activeTab === 'liked' ? likedGenres : 
                       highRatedGenres;
  
  const currentTags = activeTab === 'all' ? allTags : 
                     activeTab === 'liked' ? likedTags : 
                     highRatedTags;
  
  const currentMaxGenreCount = activeTab === 'all' ? maxGenreCount : 
                              activeTab === 'liked' ? maxLikedGenreCount : 
                              maxHighRatedGenreCount;

  const tabLabels = {
    all: 'Все игры',
    liked: 'Лайкнутые',
    highRated: 'Оценка >7'
  };

  // Свернутый вид - показывает только первую строку
  if (!isExpanded) {
    return (
      <div className={styles.collapsedContainer}>
        <div className={styles.collapsedHeader}>
          <h2 className={styles.collapsedTitle}>
            Статистика по жанрам и тегам
          </h2>
          <button 
            onClick={() => setIsExpanded(true)}
            className={styles.expandButton}
          >
            Развернуть
          </button>
        </div>
        
        <div className={styles.collapsedStats}>
          {hasAllStats && (
            <div className={styles.collapsedStatItem}>
              <span className={styles.collapsedStatLabel}>Жанры:</span>
              <span className={styles.collapsedStatValue}>
                {Object.keys(genresStats).length} уникальных
              </span>
            </div>
          )}
          
          {hasAllStats && (
            <div className={styles.collapsedStatItem}>
              <span className={styles.collapsedStatLabel}>Теги:</span>
              <span className={styles.collapsedStatValue}>
                {Object.keys(tagsStats).length} уникальных
              </span>
            </div>
          )}
          
          {hasLikedStats && (
            <div className={styles.collapsedStatItem}>
              <span className={styles.collapsedStatLabel}>Лайкнутые:</span>
              <span className={styles.collapsedStatValue}>
                {Object.keys(likedGenresStats).length} жанров, {Object.keys(likedTagsStats).length} тегов
              </span>
            </div>
          )}
          
          {hasHighRatedStats && (
            <div className={styles.collapsedStatItem}>
              <span className={styles.collapsedStatLabel}>Оценка больше 7:</span>
              <span className={styles.collapsedStatValue}>
                {Object.keys(highRatedGenresStats).length} жанров, {Object.keys(highRatedTagsStats).length} тегов
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Развернутый вид
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Статистика по жанрам и тегам</h2>
        <button 
          onClick={() => setIsExpanded(false)}
          className={styles.collapseButton}
        >
          Свернуть
        </button>
      </div>

      {/* Вкладки */}
      <div className={styles.tabs}>
        {hasAllStats && (
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {tabLabels.all}
          </button>
        )}
        
        {hasLikedStats && (
          <button
            className={`${styles.tab} ${activeTab === 'liked' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            {tabLabels.liked}
          </button>
        )}
        
        {hasHighRatedStats && (
          <button
            className={`${styles.tab} ${activeTab === 'highRated' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('highRated')}
          >
            {tabLabels.highRated}
          </button>
        )}
      </div>

      {/* Графики */}
      <div className={styles.chartsRow}>
        {currentGenres.length > 0 && (
          <BarChart 
            title="Жанры"
            data={currentGenres}
            maxCount={currentMaxGenreCount}
            color={activeTab === 'all' ? '#4299e1' : 
                   activeTab === 'liked' ? '#48bb78' : '#f56565'}
          />
        )}
        
        {currentTags.length > 0 && (
          <PieChart 
            title="Теги"
            data={currentTags}
          />
        )}
      </div>

      {currentGenres.length === 0 && currentTags.length === 0 && (
        <div className={styles.emptyState}>
          <p>Нет данных для выбранной категории</p>
        </div>
      )}
    </div>
  );
}