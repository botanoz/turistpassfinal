import ProfilePage from '@/components/profile/ProfilePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile - TuristPass',
  description: 'Manage your TuristPass profile information',
};

export default function Page() {
  return <ProfilePage />;
}
