import type { Metadata } from "next";
import BusinessLayout from "@/components/business/BusinessLayout";

export const metadata: Metadata = {
  title: "TuristPass Business Portal",
  description: "Manage your venue with TuristPass",
};

export default function BusinessOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BusinessLayout>{children}</BusinessLayout>;
}
