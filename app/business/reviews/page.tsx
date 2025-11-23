import BusinessReviews from '@/components/business/BusinessReviews';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reviews - TuristPass Business',
  description: 'Manage customer reviews',
};

export default function Page() {
  return <BusinessReviews />;
}
