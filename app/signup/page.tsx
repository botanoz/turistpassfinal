import { Suspense } from 'react';
import SignupPage from '@/components/auth/SignupPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account - TuristPass',
  description: 'Join TuristPass today and start exploring Istanbul with exclusive discounts at 70+ locations. Get 10% off your first pass!',
  keywords: 'signup, register, create account, turistpass, istanbul, join, discounts',
  openGraph: {
    title: 'Create Account - TuristPass',
    description: 'Join TuristPass today and start exploring Istanbul with exclusive discounts at 70+ locations.',
    type: 'website',
  },
  robots: {
    index: false,
    follow: true,
  }
};

export default function SignupPageRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupPage />
    </Suspense>
  );
}