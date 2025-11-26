import './globals.css';
import { Inter } from 'next/font/google';
import ThemeClient from '@/components/ThemeClient';
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import ConditionalLayout from '@/components/ConditionalLayout';
import { CurrencyProvider } from '@/hooks/useCurrency';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "TuristPass - The Smartest Way to Discover Istanbul",
  description: "Unlimited entry to Istanbul's most popular venues and special benefits with a single digital pass.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeClient>
          <CurrencyProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
            <Toaster />
          </CurrencyProvider>
        </ThemeClient>
      </body>
    </html>
  );
}