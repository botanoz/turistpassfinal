import AllPassesPage from '@/components/AllPassesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Passes - TuristPass Istanbul',
  description: 'Explore all Istanbul passes and choose the best one for your trip. Save money on attractions, tours, and activities.',
};

export default function PassesPage() {
  return <AllPassesPage />;
}
