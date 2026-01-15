import { Suspense } from 'react';
import GamePageContent from './GamesPageContent';

export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GamePageContent />
    </Suspense>
  );
}