import FavoritesPage from '@/components/profile/FavoritesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Favorites - TuristPass',
  description: 'View your favorite places and venues',
};

export default function Page() {
  return <FavoritesPage />;
}
