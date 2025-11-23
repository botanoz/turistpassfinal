import { Suspense } from 'react';
import PlacesPage from '@/components/Places';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Places - TuristPass',
  description: 'Discover amazing restaurants, cafes, shops and activities in Istanbul. Browse 70+ partner locations with exclusive discounts.',
  keywords: 'istanbul places, restaurants, shops, activities, turistpass, discounts',
};

// Loading component for Suspense
function PlacesLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading amazing places in Istanbul...</p>
      </div>
    </div>
  );
}

export default function PlacesPageRoute() {
  return (
    <Suspense fallback={<PlacesLoading />}>
      <PlacesPage />
    </Suspense>
  );
}