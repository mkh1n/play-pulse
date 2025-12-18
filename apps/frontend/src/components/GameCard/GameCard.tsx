// components/GameCard/GameCard.tsx
import { Game } from '@/services/gameService';
import Image from 'next/image';
import Link from 'next/link';
import styles from './GameCard.module.css';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/games/${game.id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={game.background_image || '/placeholder-game.jpg'}
          alt={game.name}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className={styles.rating}>
          ★ {game.rating.toFixed(1)}
        </div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{game.name}</h3>
        <div className={styles.meta}>
          <span>{new Date(game.released).getFullYear()}</span>
          {game.metacritic && (
            <span className={styles.metacritic}>
              {game.metacritic}
            </span>
          )}
        </div>
        <div className={styles.genres}>
          {game.genres?.slice(0, 3).map(genre => (
            <span key={genre.id} className={styles.genre}>
              {genre.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}