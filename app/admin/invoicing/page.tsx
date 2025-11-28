"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Download, DollarSign, TrendingUp, AlertCircle,
  CheckCircle, Clock, Search, Building2, Calendar, Eye
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  invoice_type: string;
  billing_period_start: string;
  billing_period_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  created_at: string;
  businesses?: {
    name: string;
    email: string;
  };
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
}

interface Payment {
  id: string;
  business_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_provider: string;
  provider_payment_id: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  businesses?: {
    name: string;
  };
  business_invoices?: {
    invoice_number: string;
  };
}

interface InvoiceStats {
  total_invoices: number;
  pending_amount: number;
  paid_amount: number;
  overdue_amount: number;
  overdue_count: number;
}

export default function AdminInvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadInvoices();
    loadPayments();
    loadStats();
  }, []);

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/admin/invoices');
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        toast.error(data.error || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await fetch('/api/admin/payments');
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/invoice-stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Invoice marked as paid');
        loadInvoices();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      paid: { variant: 'default', icon: CheckCircle, label: 'Paid', className: 'bg-green-600' },
      pending: { variant: 'secondary', icon: Clock, label: 'Pending', className: 'bg-yellow-600 text-white' },
      overdue: { variant: 'destructive', icon: AlertCircle, label: 'Overdue' },
      cancelled: { variant: 'outline', icon: AlertCircle, label: 'Cancelled' }
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

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' }
    };

    const badge = badges[status] || { variant: 'outline', label: status };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.businesses?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.businesses?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.business_invoices?.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoicing data...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Invoicing & Payments</h1>
        <p className="text-gray-500 mt-1">Manage business invoices and track payments</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_invoices}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.paid_amount.toFixed(2)}</div>
              <p className="text-xs text-green-600">
                <TrendingUp className="inline w-3 h-3 mr-1" />
                Total collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.pending_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₺{stats.overdue_amount.toFixed(2)}</div>
              <p className="text-xs text-red-600">{stats.overdue_count} invoices</p>
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
                placeholder="Search by business name or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === 'invoices' && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                      <th className="text-left py-3 px-4 font-medium">Business</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Billing Period</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-500">
                          No invoices found
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{invoice.businesses?.name}</div>
                            <div className="text-sm text-gray-500">{invoice.businesses?.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              {invoice.invoice_type.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div>{format(new Date(invoice.billing_period_start), 'MMM d')}</div>
                            <div className="text-gray-500">to {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}</div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="font-semibold">
                              {invoice.currency === 'TRY' ? '₺' : invoice.currency}{invoice.total_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Tax: {invoice.currency === 'TRY' ? '₺' : invoice.currency}{invoice.tax_amount.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</div>
                            {invoice.paid_at && (
                              <div className="text-xs text-green-600">
                                Paid: {format(new Date(invoice.paid_at), 'MMM d')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {invoice.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(invoice.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Mark Paid
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

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Showing {filteredPayments.length} of {payments.length} payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Business</th>
                      <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Method</th>
                      <th className="text-left py-3 px-4 font-medium">Provider</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{payment.businesses?.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm">
                            {payment.business_invoices?.invoice_number}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            {payment.currency === 'TRY' ? '₺' : payment.currency}{payment.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">{payment.payment_provider}</div>
                            <div className="text-xs text-gray-500 font-mono">
                              {payment.provider_payment_id.substring(0, 16)}...
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getPaymentStatusBadge(payment.status)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {payment.paid_at ? format(new Date(payment.paid_at), 'MMM d, yyyy HH:mm') : 'N/A'}
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
      </Tabs>
    </div>
    </AdminLayout>
  );
}
