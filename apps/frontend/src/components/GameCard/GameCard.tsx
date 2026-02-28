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
       
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{game.name}</h3>
        <div className={styles.info}>
             <div className={styles.rating}>
              <img src="icons/star.svg" alt="" className={styles.starIcon}/> {game.rating.toFixed(1)}
            </div>
            <span className={styles.delimiter}>/</span>
          <div className={styles.genres}>
            {game.genres?.slice(0, 3).map((ganre)=> ganre.name).join(', ')}
          </div>
        </div>
        
      </div>
    </Link>
  );
}