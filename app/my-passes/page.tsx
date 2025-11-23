import MyPassesPage from '@/components/profile/MyPassesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Passes - TuristPass',
  description: 'View and manage your active TuristPass passes',
};

export default function Page() {
  return <MyPassesPage />;
}
