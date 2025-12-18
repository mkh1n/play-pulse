// components/GamesGrid/GamesGrid.tsx
import { Game } from '@/services/gameService';
import GameCard from '../GameCard/GameCard'; // Создайте компонент карточки игры
import styles from './GamesGrid.module.css';

interface GamesGridProps {
  games: Game[];
}

export default function GamesGrid({ games }: GamesGridProps) {
  if (!games || games.length === 0) {
    return <div className={styles.noGames}>Игры не найдены</div>;
  }

  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}