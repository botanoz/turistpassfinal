import BusinessNotifications from '@/components/business/BusinessNotifications';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications - TuristPass Business',
  description: 'View your notifications',
};

export default function Page() {
  return <BusinessNotifications />;
}
