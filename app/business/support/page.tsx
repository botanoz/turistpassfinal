import BusinessSupport from '@/components/business/BusinessSupport';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support - TuristPass Business',
  description: 'Get help and support',
};

export default function Page() {
  return <BusinessSupport />;
}
