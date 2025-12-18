import { Suspense } from 'react';
import ExplorePageContent from './ExplorePageContent';

export default function ExplorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExplorePageContent />
    </Suspense>
  );
}