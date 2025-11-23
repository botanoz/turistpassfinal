"use client";

import { usePathname } from 'next/navigation';
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBusinessRoute = pathname?.startsWith('/business');
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isBusinessRoute || isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
