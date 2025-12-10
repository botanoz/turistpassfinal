import NotificationPreferencesPage from '@/components/profile/NotificationPreferencesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notification Preferences - TuristPass',
  description: 'Manage how you receive TuristPass notifications',
};

export default function Page() {
  return <NotificationPreferencesPage />;
}
