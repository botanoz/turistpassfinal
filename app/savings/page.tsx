import SavingsPage from '@/components/profile/SavingsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Savings - TuristPass',
  description: 'Track your savings with TuristPass',
};

export default function Page() {
  return <SavingsPage />;
}
