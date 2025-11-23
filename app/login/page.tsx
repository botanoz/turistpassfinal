import { Suspense } from 'react';
import LoginPage from '@/components/auth/LoginPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - TuristPass',
  description: 'Sign in to your TuristPass account to access your passes, track savings, and explore Istanbul with exclusive discounts.',
  keywords: 'login, sign in, turistpass, istanbul, account, access',
  openGraph: {
    title: 'Sign In - TuristPass',
    description: 'Sign in to your TuristPass account to access your passes and explore Istanbul.',
    type: 'website',
  },
  robots: {
    index: false,
    follow: true,
  }
};

export default function LoginPageRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}