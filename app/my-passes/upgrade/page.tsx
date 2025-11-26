import PassUpgradePage from '@/components/profile/PassUpgradePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pass Yükseltme - TuristPass',
  description: 'Pasınızı yükseltin ve daha fazla avantajdan yararlanın',
};

export default function Page() {
  return <PassUpgradePage />;
}
