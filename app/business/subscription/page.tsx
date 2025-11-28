"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard, Download, FileText, TrendingUp, Calendar,
  CheckCircle, AlertCircle, Clock, ArrowUpCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  price: number;
  currency: string;
  billing_cycle: string;
  features: any;
  limits: any;
  commission_rate: number;
  transaction_fee: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  price: number;
  currency: string;
  auto_renew: boolean;
}

interface Usage {
  campaigns_created: number;
  active_campaigns: number;
  total_redemptions: number;
  current_period_redemptions: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  line_items: any[];
}

export default function BusinessSubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    loadSubscriptionData();
    loadInvoices();
    loadAvailablePlans();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch('/api/business/subscription');
      const data = await response.json();

      if (data.success) {
        setSubscription(data.subscription);
        setPlan(data.plan);
        setUsage(data.usage);
      } else {
        toast.error(data.error || 'Failed to load subscription');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast.error('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/business/invoices');
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/business/subscription/plans');
      const data = await response.json();

      if (data.success) {
        setAvailablePlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleUpgrade = async (newPlanId: string) => {
    try {
      const response = await fetch('/api/business/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId,
          action: 'upgrade'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription upgraded successfully!');
        setIsUpgradeDialogOpen(false);
        loadSubscriptionData();
      } else {
        toast.error(data.error || 'Failed to upgrade subscription');
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.error('Failed to upgrade subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/business/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Subscription cancelled successfully');
        loadSubscriptionData();
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
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

  const getInvoiceStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      cancelled: { variant: 'outline', label: 'Cancelled' }
    };

    const badge = badges[status] || { variant: 'outline', label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return (current / limit) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription & Billing</h1>
        <p className="text-gray-500 mt-1">Manage your subscription plan and billing information</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="upgrade">Upgrade Plan</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription details</CardDescription>
                </div>
                {subscription && getStatusBadge(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {plan && (
                <>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-gray-600">{plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)} Plan</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {plan.currency === 'TRY' ? '₺' : plan.currency}{plan.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">per {plan.billing_cycle}</div>
                    </div>
                  </div>

                  {subscription && subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-900">Trial Period Active</h4>
                          <p className="text-sm text-blue-700">
                            Your trial ends on {format(new Date(subscription.trial_end), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {subscription && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Billing Period</div>
                        <div className="font-semibold">
                          {format(new Date(subscription.current_period_start), 'MMM d')} - {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Next Billing Date</div>
                        <div className="font-semibold">
                          {subscription.auto_renew
                            ? format(new Date(subscription.current_period_end), 'MMMM d, yyyy')
                            : 'Auto-renew disabled'}
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Commission Rate</div>
                        <div className="font-semibold">{plan.commission_rate}% + ₺{plan.transaction_fee}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-3">Plan Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plan.features && Object.entries(plan.features).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {usage && plan.limits && (
                    <div>
                      <h4 className="font-semibold mb-3">Usage This Period</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Active Campaigns</span>
                            <span className="font-medium">
                              {usage.active_campaigns} / {plan.limits.max_campaigns === -1 ? '∞' : plan.limits.max_campaigns}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(getUsagePercentage(usage.active_campaigns, plan.limits.max_campaigns), 100)}%`
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Monthly Redemptions</span>
                            <span className="font-medium">
                              {usage.current_period_redemptions} / {plan.limits.monthly_redemptions === -1 ? '∞' : plan.limits.monthly_redemptions}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(getUsagePercentage(usage.current_period_redemptions, plan.limits.monthly_redemptions), 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => setIsUpgradeDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    {subscription && subscription.status === 'active' && (
                      <Button
                        variant="outline"
                        onClick={handleCancelSubscription}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Payment History</CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="font-semibold">{invoice.invoice_number}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(invoice.created_at), 'MMMM d, yyyy')}
                            </div>
                          </div>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {invoice.line_items.map((item: any, idx: number) => (
                            <div key={idx}>{item.description} - {item.quantity}x</div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {invoice.currency === 'TRY' ? '₺' : invoice.currency}{invoice.total_amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.status === 'paid' && invoice.paid_at
                            ? `Paid on ${format(new Date(invoice.paid_at), 'MMM d')}`
                            : `Due ${format(new Date(invoice.due_date), 'MMM d')}`}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Download className="w-4 h-4 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upgrade Tab */}
        <TabsContent value="upgrade">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availablePlans.map((availablePlan) => (
              <Card key={availablePlan.id} className={plan?.id === availablePlan.id ? 'border-blue-600 border-2' : ''}>
                <CardHeader>
                  <CardTitle>{availablePlan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {availablePlan.currency === 'TRY' ? '₺' : availablePlan.currency}{availablePlan.price}
                    <span className="text-base font-normal text-gray-500">/{availablePlan.billing_cycle}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {availablePlan.limits && Object.entries(availablePlan.limits).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value === -1 ? 'Unlimited' : value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan?.id === availablePlan.id ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedPlan(availablePlan);
                        handleUpgrade(availablePlan.id);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Select Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
