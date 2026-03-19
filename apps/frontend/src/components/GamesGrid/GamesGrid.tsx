// components/GamesGrid/GamesGrid.tsx
import { Game } from '@/services/gameService';
import GameCard from '../GameCard/GameCard'; // Создайте компонент карточки игры
import styles from './GamesGrid.module.css';

interface GamesGridProps {
  games: any[];
  showRecommendationReason?: boolean; // ← новый проп
}

export default function GamesGrid({ games, showRecommendationReason = false }: GamesGridProps) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard 
          key={game.id} 
          game={game}
          // ← Передаём причину, если режим персонализации
          recommendationReason={showRecommendationReason ? game.recommendationReason : undefined}
        />
      ))}
    </div>
  );
}