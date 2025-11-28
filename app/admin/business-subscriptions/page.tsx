"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SubscriptionPlansManager from "@/components/admin/SubscriptionPlansManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard, Building2, CheckCircle, XCircle, AlertCircle, Clock,
  Search, Plus, TrendingUp, Users, DollarSign, Calendar, Settings
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Business {
  id: string;
  name: string;
  email: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface Subscription {
  id: string;
  business_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  price: number;
  currency: string;
  auto_renew: boolean;
  created_at: string;
  business?: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  plan?: {
    id: string;
    name: string;
    slug: string;
    plan_type: string;
    price: number;
    currency: string;
  };
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  total_mrr: number;
  by_plan: Record<string, { count: number; revenue: number }>;
}

export default function AdminBusinessSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Create subscription form
  const [formData, setFormData] = useState({
    business_id: '',
    plan_id: '',
    trial_days: 14,
    auto_renew: true
  });

  useEffect(() => {
    loadSubscriptions();
    loadStats();
    loadBusinesses();
    loadPlans();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/business-subscriptions');
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      } else {
        toast.error(data.error || 'Failed to load subscriptions');
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/subscription-stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses?status=active');
      const data = await response.json();

      if (data.businesses) {
        setBusinesses(data.businesses || []);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/business/subscription/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_id || !formData.plan_id) {
      toast.error('Please select business and plan');
      return;
    }

    try {
      const response = await fetch('/api/admin/business-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription created successfully!');
        setIsCreateDialogOpen(false);
        setFormData({ business_id: '', plan_id: '', trial_days: 14, auto_renew: true });
        loadSubscriptions();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    }
  };

  const handleUpdateSubscriptionStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/business-subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription status updated!');
        loadSubscriptions();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      active: { variant: 'default', icon: CheckCircle, label: 'Active', className: 'bg-green-600' },
      trial: { variant: 'secondary', icon: Clock, label: 'Trial', className: 'bg-blue-600 text-white' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
      expired: { variant: 'outline', icon: AlertCircle, label: 'Expired' },
      past_due: { variant: 'destructive', icon: AlertCircle, label: 'Past Due' }
    };

    const badge = badges[status] || { variant: 'outline', icon: AlertCircle, label: status };
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className={badge.className}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.business?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.business?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Subscriptions</h1>
        <p className="text-gray-500 mt-1">Manage subscriptions, plans, and billing</p>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Users className="w-4 h-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Settings className="w-4 h-4 mr-2" />
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
        <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Subscription</DialogTitle>
              <DialogDescription>Assign a subscription plan to a business</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <Label htmlFor="business_id">Business</Label>
                <Select value={formData.business_id} onValueChange={(value) => setFormData({ ...formData, business_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name} ({business.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="plan_id">Subscription Plan</Label>
                <Select value={formData.plan_id} onValueChange={(value) => setFormData({ ...formData, plan_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.currency === 'TRY' ? '₺' : plan.currency}{plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trial_days">Trial Days</Label>
                <Input
                  id="trial_days"
                  type="number"
                  value={formData.trial_days}
                  onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_renew"
                  checked={formData.auto_renew}
                  onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="auto_renew">Auto-renew subscription</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Create Subscription
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_subscriptions} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trial_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Currently in trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.total_mrr.toFixed(2)}</div>
              <p className="text-xs text-green-600">
                <TrendingUp className="inline w-3 h-3 mr-1" />
                From active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled/Expired</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.cancelled_subscriptions + stats.expired_subscriptions}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.cancelled_subscriptions} cancelled, {stats.expired_subscriptions} expired
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Business</th>
                  <th className="text-left py-3 px-4 font-medium">Plan</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-left py-3 px-4 font-medium">Period</th>
                  <th className="text-left py-3 px-4 font-medium">Auto-Renew</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{subscription.business?.name}</div>
                        <div className="text-sm text-gray-500">{subscription.business?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{subscription.plan?.name}</div>
                        {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                          <div className="text-xs text-blue-600">
                            Trial ends {format(new Date(subscription.trial_end), 'MMM d')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(subscription.status)}</td>
                      <td className="text-right py-3 px-4">
                        {subscription.currency === 'TRY' ? '₺' : subscription.currency}{subscription.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>{format(new Date(subscription.current_period_start), 'MMM d')}</div>
                        <div className="text-gray-500">to {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}</div>
                      </td>
                      <td className="py-3 px-4">
                        {subscription.auto_renew ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {subscription.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateSubscriptionStatus(subscription.id, 'active')}
                              className="text-green-600"
                            >
                              Reactivate
                            </Button>
                          )}
                          {subscription.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateSubscriptionStatus(subscription.id, 'cancelled')}
                              className="text-red-600"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="plans">
          <SubscriptionPlansManager />
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
