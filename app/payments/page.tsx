import PaymentsPage from '@/components/profile/PaymentsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payments & Billing - TuristPass',
  description: 'View your orders, download invoices, and manage refund requests',
};

export default function Page() {
  return <PaymentsPage />;
}
