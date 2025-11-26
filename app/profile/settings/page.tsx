import ProfileSettingsPage from '@/components/profile/ProfileSettingsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profil Ayarları - TuristPass',
  description: 'Profil bilgilerinizi ve güvenlik ayarlarınızı yönetin',
};

export default function Page() {
  return <ProfileSettingsPage />;
}
