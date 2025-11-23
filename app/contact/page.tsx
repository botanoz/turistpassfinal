import ContactPage from '@/components/Contact';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - TuristPass',
  description: "Get in touch with TuristPass support team. We're here to help you make the most of your Istanbul experience with 24/7 multilingual support.",
  keywords: 'contact, support, help, istanbul, turistpass, customer service, phone, email, whatsapp',
  openGraph: {
    title: 'Contact Us - TuristPass',
    description: "Get in touch with TuristPass support team. We're here to help you make the most of your Istanbul experience with 24/7 multilingual support.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us - TuristPass',
    description: "Get in touch with TuristPass support team. We're here to help you make the most of your Istanbul experience.",
  }
};

export default function ContactPageRoute() {
  return <ContactPage />;
}