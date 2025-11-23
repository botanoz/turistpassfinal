import BusinessScanner from '@/components/business/BusinessScanner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scanner - TuristPass Business',
  description: 'Validate customer passes',
};

export default function Page() {
  return <BusinessScanner />;
}
