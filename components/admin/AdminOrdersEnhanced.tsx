"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AdminLayout from "./AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Package,
  Send,
  Activity,
  Calendar,
  User,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  currency: string;
  created_at: string;
  paid_at?: string;
  confirmed_at?: string;
  pass_delivered_at?: string;
  first_used_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  customer_profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    passes: {
      name: string;
    };
  }>;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  actor_name: string;
  created_at: string;
}

export default function AdminOrdersEnhanced() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({
    totalOrders: 0,
    completed: 0,
    pending: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentStatusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        search: searchQuery,
      });
      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setOrders(data.orders);
      setStats(data.stats);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeline = async (orderId: string) => {
    try {
      setLoadingTimeline(true);
      const response = await fetch(`/api/admin/orders/${orderId}/timeline`);
      if (!response.ok) throw new Error("Failed to fetch timeline");
      const data = await response.json();
      setTimeline(data.timeline || []);
    } catch (err) {
      toast.error("Failed to load timeline");
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
    await fetchTimeline(order.id);
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success("Order status updated successfully");
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        await fetchTimeline(orderId);
      }
    } catch (err) {
      toast.error("Failed to update order status");
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      completed: { color: "bg-green-500 text-white", label: "Paid", icon: CheckCircle },
      pending: { color: "bg-yellow-500 text-white", label: "Pending", icon: Clock },
      failed: { color: "bg-red-500 text-white", label: "Failed", icon: XCircle },
      refunded: { color: "bg-gray-500 text-white", label: "Refunded", icon: DollarSign },
    }[status] || { color: "bg-gray-300 text-gray-800", label: status, icon: AlertCircle };

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: string) => {
    const config = {
      completed: { color: "bg-green-100 text-green-800 border-green-200", label: "Completed" },
      pending: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Pending" },
      cancelled: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Cancelled" },
      refunded: { color: "bg-purple-100 text-purple-800 border-purple-200", label: "Refunded" },
    }[status] || { color: "bg-gray-100 text-gray-800", label: status };

    return <Badge className={`${config.color} border`}>{config.label}</Badge>;
  };

  const calculateProgress = (order: Order): number => {
    let steps = 0;
    let completed = 0;

    // Step 1: Payment
    steps++;
    if (order.paid_at) completed++;

    // Step 2: Confirmation
    steps++;
    if (order.confirmed_at) completed++;

    // Step 3: Delivery
    steps++;
    if (order.pass_delivered_at) completed++;

    // Step 4: Usage
    steps++;
    if (order.first_used_at) completed++;

    // Step 5: Completion
    steps++;
    if (order.completed_at) completed++;

    return (completed / steps) * 100;
  };

  const getTimelineIcon = (eventType: string) => {
    const icons: Record<string, any> = {
      order_created: Package,
      payment_pending: Clock,
      payment_completed: CreditCard,
      payment_failed: XCircle,
      order_confirmed: CheckCircle,
      pass_delivered: Send,
      first_usage: Activity,
      order_completed: CheckCircle,
      order_cancelled: XCircle,
      refund_completed: DollarSign,
    };
    return icons[eventType] || Calendar;
  };

  const formatCurrency = (amount: number, currency: string = "TRY") => {
    const symbols: Record<string, string> = {
      TRY: "₺",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const statsCards = [
    { label: "Total Orders", value: stats.totalOrders, icon: Package, color: "text-blue-600" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600" },
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue || 0),
      icon: DollarSign,
      color: "text-purple-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Order Management</h2>
            <p className="text-muted-foreground">View and manage all orders</p>
          </div>
          <Button onClick={() => toast.info("Export feature coming soon")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="completed">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search criteria" : "No orders have been placed yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const progress = calculateProgress(order);
                  return (
                    <div key={order.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Left Section */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                            {getOrderStatusBadge(order.status)}
                            {getPaymentStatusBadge(order.payment_status)}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {order.customer_profiles.first_name} {order.customer_profiles.last_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{order.order_items?.[0]?.passes?.name || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{formatCurrency(order.total_amount, order.currency)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: enUS })}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Order Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className={order.paid_at ? "text-green-600" : ""}>Payment</span>
                              <span className={order.confirmed_at ? "text-green-600" : ""}>Confirmed</span>
                              <span className={order.pass_delivered_at ? "text-green-600" : ""}>Delivered</span>
                              <span className={order.first_used_at ? "text-green-600" : ""}>Used</span>
                              <span className={order.completed_at ? "text-green-600" : ""}>Completed</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex lg:flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)} className="flex-1 lg:flex-none">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {order.status !== "completed" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "completed")}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Completed
                                </DropdownMenuItem>
                              )}
                              {order.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "cancelled")}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                              {order.status === "completed" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "refunded")}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Refund Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>View complete order information and timeline</DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedOrder.customer_profiles.first_name}{" "}
                      {selectedOrder.customer_profiles.last_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOrder.customer_profiles.email}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 bg-muted rounded-lg text-sm">
                        <span>{item.passes?.name}</span>
                        <span>
                          {item.quantity} x {formatCurrency(item.unit_price, selectedOrder.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between p-3 border-t font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total_amount, selectedOrder.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold mb-4">Order Timeline</h3>
                  {loadingTimeline ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No timeline events yet</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {timeline.map((event, index) => {
                          const Icon = getTimelineIcon(event.event_type);
                          return (
                            <div key={event.id} className="relative flex gap-4 pl-10">
                              <div className="absolute left-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary-foreground" />
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{event.title}</h4>
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground">{event.description}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {event.actor_name} •{" "}
                                      {format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: enUS })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
