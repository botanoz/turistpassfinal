"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Mail,
  FileText,
  Eye,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface RefundRequest {
  id: string;
  request_number: string;
  order_id: string;
  customer_id: string;
  reason_type: string;
  reason_text: string;
  requested_amount: number;
  status: string;
  reviewed_at?: string;
  rejection_reason?: string;
  refund_amount?: number;
  refund_processed_at?: string;
  created_at: string;
  orders: {
    id: string;
    order_number: string;
    total_amount: number;
    currency?: string;
    currency_code?: string;
    payment_method?: string;
    created_at: string;
  };
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminRefunds() {
  const router = useRouter();
  const supabase = createClient();

  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [processing, setProcessing] = useState(false);

  // Action form data
  const [actionData, setActionData] = useState({
    rejection_reason: "",
    refund_method: "original_payment",
    refund_amount: 0,
    admin_notes: ""
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (statusFilter) {
      loadRefunds();
    }
  }, [statusFilter]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: admin } = await supabase
      .from("admin_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!admin) {
      router.push("/admin/login");
      return;
    }

    loadRefunds();
  };

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/refund-requests?status=${statusFilter}&limit=100`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRefunds(data.refundRequests || []);
      } else {
        toast.error("Failed to load refund requests");
      }
    } catch (error) {
      console.error("Error loading refunds:", error);
      toast.error("Error loading refund requests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setShowDetailsDialog(true);
  };

  const handleOpenActionDialog = (refund: RefundRequest, action: 'approve' | 'reject' | 'complete') => {
    setSelectedRefund(refund);
    setActionType(action);
    setActionData({
      rejection_reason: "",
      refund_method: "original_payment",
      refund_amount: refund.requested_amount,
      admin_notes: ""
    });
    setShowActionDialog(true);
  };

  const handleAction = async () => {
    if (!selectedRefund || !actionType) return;

    try {
      setProcessing(true);

      const payload: any = {
        action: actionType === 'complete' ? 'mark_completed' : actionType
      };

      if (actionType === 'approve') {
        payload.refund_method = actionData.refund_method;
        payload.refund_amount = actionData.refund_amount;
      }

      if (actionType === 'reject') {
        if (!actionData.rejection_reason) {
          toast.error("Rejection reason is required");
          return;
        }
        payload.rejection_reason = actionData.rejection_reason;
      }

      if (actionData.admin_notes) {
        payload.admin_notes = actionData.admin_notes;
      }

      const response = await fetch(`/api/admin/refund-requests/${selectedRefund.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Refund request ${actionType}ed successfully`);
        setShowActionDialog(false);
        setSelectedRefund(null);
        setActionType(null);
        await loadRefunds();
      } else {
        toast.error(result.error || "Failed to process refund request");
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error("Error processing refund request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pending", icon: Clock },
      under_review: { variant: "default", label: "Under Review", icon: AlertCircle },
      approved: { variant: "default", label: "Approved", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
      completed: { variant: "default", label: "Completed", icon: CheckCircle },
      cancelled: { variant: "outline", label: "Cancelled", icon: Ban },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getReasonLabel = (reasonType: string) => {
    const reasons: Record<string, string> = {
      not_as_described: "Not as described",
      technical_issue: "Technical issue",
      duplicate_purchase: "Duplicate purchase",
      changed_mind: "Changed mind",
      other: "Other"
    };
    return reasons[reasonType] || reasonType;
  };

  const formatCurrency = (amount: number, currency: string = "TRY") => {
    const symbols: Record<string, string> = {
      TRY: "₺",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return `${symbols[currency] || currency} ${Number(amount).toFixed(2)}`;
  };

  const stats = {
    pending: refunds.filter(r => r.status === "pending").length,
    under_review: refunds.filter(r => r.status === "under_review").length,
    approved: refunds.filter(r => r.status === "approved").length,
    completed: refunds.filter(r => r.status === "completed").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Refund Management</h1>
          <p className="text-muted-foreground">Review and process customer refund requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.under_review}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <RotateCcw className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refunds Table */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Requests</CardTitle>
            <CardDescription>
              {refunds.length} request{refunds.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : refunds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No refund requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-medium">
                        {refund.request_number}
                      </TableCell>
                      <TableCell>{refund.orders.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {refund.customer.first_name} {refund.customer.last_name}
                          </div>
                          <div className="text-muted-foreground">
                            {refund.customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getReasonLabel(refund.reason_type)}</TableCell>
                      <TableCell>
                        {formatCurrency(refund.requested_amount, refund.orders.currency_code || refund.orders.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(refund.status)}</TableCell>
                      <TableCell>
                        {format(new Date(refund.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(refund)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {refund.status === "pending" || refund.status === "under_review" ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenActionDialog(refund, "approve")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenActionDialog(refund, "reject")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          ) : refund.status === "approved" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenActionDialog(refund, "complete")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Complete
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Refund Request Details</DialogTitle>
              <DialogDescription>
                Request #{selectedRefund?.request_number}
              </DialogDescription>
            </DialogHeader>
            {selectedRefund && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Customer</Label>
                    <p className="font-medium">
                      {selectedRefund.customer.first_name} {selectedRefund.customer.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedRefund.customer.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Order</Label>
                    <p className="font-medium">{selectedRefund.orders.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedRefund.orders.total_amount, selectedRefund.orders.currency_code || selectedRefund.orders.currency)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Refund Reason</Label>
                  <p className="font-medium">{getReasonLabel(selectedRefund.reason_type)}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRefund.reason_text}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Requested Amount</Label>
                    <p className="font-medium text-lg">
                      {formatCurrency(selectedRefund.requested_amount, selectedRefund.orders.currency_code || selectedRefund.orders.currency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedRefund.status)}
                    </div>
                  </div>
                </div>

                {selectedRefund.rejection_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded">
                    <Label className="text-red-700">Rejection Reason</Label>
                    <p className="text-sm text-red-600">{selectedRefund.rejection_reason}</p>
                  </div>
                )}

                {selectedRefund.refund_processed_at && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <Label className="text-green-700">Refund Processed</Label>
                    <p className="text-sm text-green-600">
                      {format(new Date(selectedRefund.refund_processed_at), "MMM dd, yyyy HH:mm")}
                    </p>
                    {selectedRefund.refund_amount && (
                      <p className="text-sm text-green-600 font-medium">
                        Amount: {formatCurrency(selectedRefund.refund_amount, selectedRefund.orders.currency_code || selectedRefund.orders.currency)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && 'Approve Refund Request'}
                {actionType === 'reject' && 'Reject Refund Request'}
                {actionType === 'complete' && 'Mark Refund as Complete'}
              </DialogTitle>
              <DialogDescription>
                Request #{selectedRefund?.request_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {actionType === 'approve' && (
                <>
                  <div>
                    <Label>Refund Method</Label>
                    <Select
                      value={actionData.refund_method}
                      onValueChange={(value) => setActionData({ ...actionData, refund_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original_payment">Original Payment Method</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="store_credit">Store Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Refund Amount</Label>
                    <Input
                      type="number"
                      value={actionData.refund_amount}
                      onChange={(e) => setActionData({ ...actionData, refund_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </>
              )}

              {actionType === 'reject' && (
                <div>
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={actionData.rejection_reason}
                    onChange={(e) => setActionData({ ...actionData, rejection_reason: e.target.value })}
                    placeholder="Explain why this refund request is being rejected..."
                    rows={4}
                    required
                  />
                </div>
              )}

              {actionType === 'complete' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Completing Refund</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>All passes will be cancelled</li>
                    <li>Order status will be set to "Refunded"</li>
                    <li>Customer will see "Refund Completed" status</li>
                  </ul>
                </div>
              )}

              <div>
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  value={actionData.admin_notes}
                  onChange={(e) => setActionData({ ...actionData, admin_notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowActionDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'reject' && !actionData.rejection_reason)}
              >
                {processing ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
