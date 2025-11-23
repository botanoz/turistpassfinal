import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password - TuristPass',
  description: 'Forgot your TuristPass password? Enter your email address and we\'ll send you a secure link to reset your password.',
  keywords: 'forgot password, reset password, turistpass, account recovery',
  openGraph: {
    title: 'Reset Password - TuristPass',
    description: 'Reset your TuristPass password securely and get back to exploring Istanbul.',
    type: 'website',
  },
  robots: {
    index: false, // Password reset pages shouldn't be indexed
    follow: true,
  }
};

export default function ForgotPasswordPageRoute() {
  return <ForgotPasswordPage />;
}