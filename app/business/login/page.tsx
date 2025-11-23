import { Suspense } from 'react';
import BusinessLoginPage from '@/components/business/BusinessLoginPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Login - TuristPass',
  description: 'Access your TuristPass business dashboard',
  robots: {
    index: false,
    follow: true,
  }
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BusinessLoginPage />
    </Suspense>
  );
}
