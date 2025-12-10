import PassUpgradePage from '@/components/profile/PassUpgradePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pass Upgrade - TuristPass',
  description: 'Upgrade your pass to unlock more benefits',
};

export default function Page() {
  return <PassUpgradePage />;
}
