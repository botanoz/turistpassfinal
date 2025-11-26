import VisitHistoryPage from '@/components/profile/VisitHistoryPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visit History - TuristPass',
  description: 'Review your recent venue visits and the savings you earned.',
};

export default function Page() {
  return <VisitHistoryPage />;
}
