import { Suspense } from 'react';
import GamePageContent from './GamesPageContent';
import styles from '../games/GameDetailPage.module.css'
export default function GamePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>
      <div className={styles.spinner}></div>
    </div>}>
      <GamePageContent />
    </Suspense>
  );
}