// components/GamesGrid/GamesGrid.tsx
import { Game } from '@/services/gameService';
import GameCard from '../GameCard/GameCard';
import styles from './GamesGrid.module.css';

export default function GamesGrid({ games, showRecommendationReason = false }: GamesGridProps) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          recommendationReason={showRecommendationReason ? game.recommendationReason : undefined}
        />
      ))}
    </div>
  );
}