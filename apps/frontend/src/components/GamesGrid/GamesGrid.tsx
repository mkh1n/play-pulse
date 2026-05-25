// components/GamesGrid/GamesGrid.tsx
import { Game } from '@/services/gameService';
import GameCard from '../GameCard/GameCard';
import styles from './GamesGrid.module.css';

export default function GamesGrid({ games, showswipesReason = false }: GamesGridProps) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          swipesReason={showswipesReason ? game.swipesReason : undefined}
        />
      ))}
    </div>
  );
}