import MessagesPage from '@/components/profile/MessagesPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages - TuristPass',
  description: 'View your notifications and messages',
};

export default function Page() {
  return <MessagesPage />;
}
