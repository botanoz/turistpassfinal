"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "./AdminLayout";
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
  RotateCcw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalOrders: 0,
    completed: 0,
    pending: 0,
    totalRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery
      });
      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setOrders(data.orders);
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  const filteredOrders = orders;

  const statsCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: '📦' },
    { label: 'Completed', value: stats.completed, icon: '✅' },
    { label: 'Pending', value: stats.pending, icon: '⏳' },
    { label: 'Total Revenue', value: `₺${Number(stats.totalRevenue || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💰' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Order Management</h2>
            <p className="text-muted-foreground">View and manage all orders</p>
          </div>
          <Button onClick={() => toast.info('Export feature coming soon')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {statsCards.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
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
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No orders have been placed yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold">{order.id}</h3>
                        <Badge variant={
                          order.status === "completed" ? "default" :
                          order.status === "pending" ? "secondary" :
                          order.status === "cancelled" ? "outline" :
                          "destructive"
                        }>
                          {order.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {order.status === "pending" && <span className="h-3 w-3 mr-1">⏳</span>}
                          {order.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                          {order.status === "refunded" && <RotateCcw className="h-3 w-3 mr-1" />}
                          {order.status}
                        </Badge>
                        {/* Refund Status Badges */}
                        {order.refund_status === 'pending' || order.refund_status === 'under_review' ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Refund Requested
                          </Badge>
                        ) : order.refund_status === 'approved' ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Refund Approved
                          </Badge>
                        ) : order.refund_status === 'completed' && order.status !== 'refunded' ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Refunded
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Customer: <strong>{order.customer}</strong></span>
                        <span>Pass: <strong>{order.pass}</strong></span>
                        <span>Amount: <strong>₺{Number(order.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span>Date: {new Date(order.date).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info('Order details feature coming soon')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {order.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.orderId, 'completed')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.orderId, 'cancelled')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel Order
                          </DropdownMenuItem>
                        )}
                        {order.status === 'completed' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.orderId, 'refunded')}>
                            <span className="h-4 w-4 mr-2">↩️</span>
                            Refund Order
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
