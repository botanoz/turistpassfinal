"use client";

import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText, Download, DollarSign, TrendingUp, AlertCircle,
  CheckCircle, Clock, Search, Calendar, Eye, Upload, X, File
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: string;
  payment_id: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  customer_profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
  purchased_passes?: {
    id: string;
    pass_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

interface OrderStats {
  total_orders: number;
  pending_amount: number;
  completed_amount: number;
  pending_invoice_count: number;
}

export default function AdminInvoicingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [uploadType, setUploadType] = useState<'invoice' | 'receipt'>('invoice');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOrders();
    loadStats();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/orders/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleOpenUploadDialog = (order: Order, type: 'invoice' | 'receipt') => {
    setSelectedOrder(order);
    setUploadType(type);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF or image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadInvoice = async () => {
    if (!selectedOrder || !selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('orderId', selectedOrder.id);
      formData.append('type', uploadType);

      const response = await fetch('/api/admin/orders/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${uploadType === 'invoice' ? 'Invoice' : 'Receipt'} uploaded successfully`);
        setUploadDialogOpen(false);
        setSelectedFile(null);
        loadOrders(); // Reload orders to show updated document
      } else {
        toast.error(data.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async (orderId: string, type: 'invoice' | 'receipt') => {
    if (!confirm(`Are you sure you want to remove this ${type}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/orders/remove-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, type }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${type === 'invoice' ? 'Invoice' : 'Receipt'} removed successfully`);
        loadOrders();
      } else {
        toast.error(data.error || 'Failed to remove document');
      }
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed', className: 'bg-green-600' },
      pending: { variant: 'secondary', icon: Clock, label: 'Pending', className: 'bg-yellow-600 text-white' },
      cancelled: { variant: 'outline', icon: AlertCircle, label: 'Cancelled' },
      refunded: { variant: 'destructive', icon: AlertCircle, label: 'Refunded' }
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
    const badges: Record<string, { variant: any; label: string; className?: string }> = {
      completed: { variant: 'default', label: 'Paid', className: 'bg-green-600' },
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-600 text-white' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' }
    };

    const badge = badges[status] || { variant: 'outline', label: status };
    return <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment = filterPaymentStatus === 'all' || order.payment_status === filterPaymentStatus;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Invoicing</h1>
          <p className="text-gray-500 mt-1">Manage customer orders and upload invoices/receipts</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_orders}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Amount</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{stats.completed_amount.toFixed(2)}</div>
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
                <CardTitle className="text-sm font-medium">Missing Invoices</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending_invoice_count}</div>
                <p className="text-xs text-red-600">Needs invoice upload</p>
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
                  placeholder="Search by customer name, email or order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Orders</CardTitle>
            <CardDescription>
              Showing {filteredOrders.length} of {orders.length} orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Order #</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Items</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Order Status</th>
                    <th className="text-left py-3 px-4 font-medium">Payment</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Documents</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{order.order_number}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{order.customer_profiles?.full_name}</div>
                          <div className="text-sm text-gray-500">{order.customer_profiles?.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {order.purchased_passes?.length || 0} pass(es)
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="font-semibold">
                            {order.currency === 'TRY' ? '₺' : order.currency}{order.total_amount.toFixed(2)}
                          </div>
                          {order.payment_method && (
                            <div className="text-xs text-gray-500">
                              {order.payment_method.replace('_', ' ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-3 px-4">
                          {getPaymentStatusBadge(order.payment_status)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>{format(new Date(order.created_at), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(order.created_at), 'HH:mm')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {order.invoice_url ? (
                              <div className="flex items-center gap-1 text-xs">
                                <File className="w-3 h-3 text-green-600" />
                                <span className="text-green-600">Invoice</span>
                                <button
                                  onClick={() => handleRemoveDocument(order.id, 'invoice')}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No invoice</span>
                            )}
                            {order.receipt_url ? (
                              <div className="flex items-center gap-1 text-xs">
                                <File className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-600">Receipt</span>
                                <button
                                  onClick={() => handleRemoveDocument(order.id, 'receipt')}
                                  className="text-red-500 hover:text-red-700 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No receipt</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUploadDialog(order, 'invoice')}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Invoice
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUploadDialog(order, 'receipt')}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Receipt
                            </Button>
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
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === 'invoice' ? 'Invoice' : 'Receipt'}
            </DialogTitle>
            <DialogDescription>
              Upload a PDF or image file for order {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File (PDF, JPG, PNG - Max 5MB)</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <File className="w-4 h-4" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {selectedOrder && (
              <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                <div><span className="font-medium">Customer:</span> {selectedOrder.customer_profiles?.full_name}</div>
                <div><span className="font-medium">Order:</span> {selectedOrder.order_number}</div>
                <div><span className="font-medium">Amount:</span> ₺{selectedOrder.total_amount.toFixed(2)}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadInvoice}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
