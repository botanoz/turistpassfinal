import BusinessProfile from '@/components/business/BusinessProfile';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Profile - TuristPass',
  description: 'Manage your business profile',
};

export default function Page() {
  return <BusinessProfile />;
}
