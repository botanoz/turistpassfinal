"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Calendar,
  QrCode,
  BarChart3,
  Store,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type DashboardStats = {
  totalVisits: number;
  monthVisits: number;
  todayVisits: number;
  uniqueCustomers: number;
  totalOriginalAmount: number;
  totalDiscountedAmount: number;
  totalSavings: number;
};

type RecentScan = {
  id: string;
  createdAt: string;
  validationMethod: string | null;
  discountPercentage: number | null;
  originalAmount: number | null;
  discountedAmount: number | null;
  passName: string | null;
  passType: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};

export default function BusinessDashboard() {
  const { business, loading } = useBusinessContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const quickActions = useMemo(
    () => [
      {
        icon: QrCode,
        label: "Scan QR / PIN",
        href: "/business/scanner",
        color: "bg-blue-500 hover:bg-blue-600",
      },
      {
        icon: BarChart3,
        label: "Visit History",
        href: "/business/history",
        color: "bg-green-500 hover:bg-green-600",
      },
      {
        icon: Store,
        label: "My Venue",
        href: "/business/profile",
        color: "bg-purple-500 hover:bg-purple-600",
      },
    ],
    [],
  );

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/business/dashboard");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load dashboard data");
      }

      setStats(result.stats);
      setRecentScans(result.recentScans ?? []);
    } catch (error: any) {
      console.error("Failed to load dashboard", error);
      toast.error(error.message ?? "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      loadDashboard();
    }
  }, [loading, loadDashboard]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const displayStats = stats ?? {
    totalVisits: 0,
    monthVisits: 0,
    todayVisits: 0,
    uniqueCustomers: 0,
    totalOriginalAmount: 0,
    totalDiscountedAmount: 0,
    totalSavings: 0,
  };

  const statCards = [
    {
      icon: Users,
      label: "Total Visits",
      value: displayStats.totalVisits.toLocaleString(),
      subLabel: "All time",
      color: "text-blue-600",
    },
    {
      icon: TrendingUp,
      label: "This Month",
      value: displayStats.monthVisits.toLocaleString(),
      subLabel: "Visits in current month",
      color: "text-green-600",
    },
    {
      icon: Calendar,
      label: "Today",
      value: displayStats.todayVisits.toLocaleString(),
      subLabel: "Visits today",
      color: "text-purple-600",
    },
    {
      icon: Users,
      label: "Unique Customers",
      value: displayStats.uniqueCustomers.toLocaleString(),
      subLabel: "Total unique customers",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">
          {business?.name ? `Welcome back, ${business.name}!` : "Welcome back!"}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subLabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className={`p-4 rounded-full text-white ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <p className="font-semibold">{action.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total sales</span>
              <span className="text-lg font-semibold">
                ₺{displayStats.totalDiscountedAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer savings</span>
              <span className="text-lg font-semibold text-green-600">
                ₺{displayStats.totalSavings.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gross value</span>
              <span className="text-lg font-semibold">
                ₺{displayStats.totalOriginalAmount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scans recorded yet. Start validating passes to see activity here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{scan.customer?.name ?? "Customer"}</p>
                      <p className="text-sm text-muted-foreground">
                        {scan.passName ?? "TuristPass"} ·{" "}
                        {new Date(scan.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {scan.discountPercentage !== null && (
                        <p className="text-sm font-medium text-green-600">
                          {scan.discountPercentage}% off
                        </p>
                      )}
                      {scan.discountedAmount !== null && (
                        <p className="text-xs text-muted-foreground">
                          ₺{scan.discountedAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/business/history">View all history</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
