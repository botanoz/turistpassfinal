import BusinessApplyPage from '@/components/business/BusinessApplyPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Application - TuristPass',
  description: 'Join TuristPass as a business partner',
};

export default function Page() {
  return <BusinessApplyPage />;
}
