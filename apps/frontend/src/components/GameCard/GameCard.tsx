// components/GameCard/GameCard.tsx
import { Game, proxifyImage } from '@/services/gameService';
import Image from 'next/image';
import Link from 'next/link';
import styles from './GameCard.module.css';
import { useState, useEffect } from 'react';
import { getDealsWithAverage } from '@/services/gameService';
interface GameCardProps {
  game: Game;
  swipesReason?: string; // <- добавляем необязательный проп
}
export default function GameCard({ game }: GameCardProps) {
  const [averagePrice, setAveragePrice] = useState<number | null>(null);

  useEffect(() => {
    if (!game.id) return;
    const fetchGameData = async () => {
      const { items: dealsData, averagePrice } = await getDealsWithAverage(
        game.name
      );
      setAveragePrice(averagePrice);
    };
    fetchGameData()
  }, [game]);

  return (
    <Link href={`/games/${game.id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={proxifyImage(game.background_image) || '/placeholder-game.jpg'}
          alt={game.name}
          fill
          unoptimized
          className={styles.image}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

      </div>
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <h3 className={styles.title}>{game.name}</h3>
          <div className={styles.info}>
            <div className={styles.rating}>
              <img src="../icons/star.svg" alt="" className={styles.starIcon} /> {game.rating.toFixed(1)}
            </div>
            <span className={styles.delimiter}>/</span>
            <div className={styles.genres}>
              {game.genres?.slice(0, 3).map((ganre) => ganre.name).join(', ')}
            </div>
          </div>
        </div>

        <div className={styles.averagePrice}>{averagePrice && `${averagePrice?.toLocaleString("ru-RU").split(',')[0]} ₽`}</div>
      </div>

    </Link>
  );
}