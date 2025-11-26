import NotificationPreferencesPage from '@/components/profile/NotificationPreferencesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bildirim Tercihleri - TuristPass',
  description: 'Bildirim ayarlarınızı yönetin',
};

export default function Page() {
  return <NotificationPreferencesPage />;
}
