import DetailedHowItWorksPage from '@/components/DetailedHowItWorksPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works? - TuristPass',
  description: 'Discover Istanbul with TuristPass in just 4 steps! Learn every detail with our comprehensive guide and start saving today.',
  keywords: 'turistpass, istanbul, how it works, guide, tourist card, step by step',
  openGraph: {
    title: 'How It Works? - TuristPass',
    description: 'Discover Istanbul with TuristPass in just 4 steps! Learn every detail with our comprehensive guide and start saving today.',
    type: 'website',
  },
};

export default function HowItWorksPage() {
  return <DetailedHowItWorksPage />;
}