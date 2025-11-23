"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "./AdminLayout";
import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Map icon names to components
const iconMap: Record<string, any> = {
  Users,
  Building2,
  CreditCard,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Clock,
  CheckCircle
};

interface DashboardData {
  mainStats: Array<{
    label: string;
    value: string;
    change: string;
    icon: string;
    color: string;
    bgColor: string;
    href: string;
  }>;
  quickStats: Array<{
    label: string;
    value: number;
    icon: string;
    color: string;
    href: string;
  }>;
  recentActivity: Array<{
    type: string;
    text: string;
    time: string;
  }>;
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-destructive">{error || 'Failed to load dashboard'}</p>
            <Button onClick={fetchDashboardData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { mainStats, quickStats, recentActivity } = dashboardData;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your admin panel</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mainStats.map((stat) => {
            const IconComponent = iconMap[stat.icon];
            const isPositiveChange = stat.change.startsWith('+');

            return (
              <Link key={stat.label} href={stat.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        {IconComponent && <IconComponent className={`h-4 w-4 ${stat.color}`} />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className={`flex items-center text-sm ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className={`h-4 w-4 mr-1 ${!isPositiveChange && 'rotate-180'}`} />
                        {stat.change}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const IconComponent = iconMap[stat.icon];

            return (
              <Link key={stat.label} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {IconComponent && <IconComponent className={`h-8 w-8 ${stat.color}`} />}
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                      <div className="p-2 rounded-full bg-primary/10">
                        {activity.type === "order" && <ShoppingCart className="h-4 w-4 text-primary" />}
                        {activity.type === "business" && <Building2 className="h-4 w-4 text-primary" />}
                        {activity.type === "support" && <AlertCircle className="h-4 w-4 text-primary" />}
                        {activity.type === "customer" && <Users className="h-4 w-4 text-primary" />}
                        {activity.type === "system" && <Clock className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/customers">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Customers
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/businesses">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Businesses
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/passes">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Passes
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/support">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Support Tickets
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/settings">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
