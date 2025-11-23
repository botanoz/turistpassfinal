import BusinessHistory from '@/components/business/BusinessHistory';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visit History - TuristPass Business',
  description: 'View customer visit history',
};

export default function Page() {
  return <BusinessHistory />;
}
