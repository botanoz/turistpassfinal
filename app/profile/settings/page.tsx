import ProfileSettingsPage from '@/components/profile/ProfileSettingsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile Settings - TuristPass',
  description: 'Manage your profile information and security settings',
};

export default function Page() {
  return <ProfileSettingsPage />;
}
