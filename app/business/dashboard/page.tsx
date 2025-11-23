import BusinessDashboard from '@/components/business/BusinessDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - TuristPass Business',
  description: 'Manage your business with TuristPass',
};

export default function Page() {
  return <BusinessDashboard />;
}
