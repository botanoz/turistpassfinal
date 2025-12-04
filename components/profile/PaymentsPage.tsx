"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Download,
  Receipt,
  RotateCcw,
  MessageSquare,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  currency: string;
  payment_method: string;
  created_at: string;
  completed_at?: string;
  invoice_url?: string | null;
  receipt_url?: string | null;
  has_pending_refund?: boolean;
  refund_status?: string | null;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  pass_id: string;
  pass_name: string;
  pass_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  adult_quantity?: number;
  child_quantity?: number;
}

interface RefundRequest {
  id: string;
  request_number: string;
  order_number: string;
  reason_type: string;
  reason_text: string;
  requested_amount: number;
  status: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  refund_amount?: number;
  refund_processed_at?: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  order_number: string;
  issue_type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  last_reply_at: string;
  resolved_at?: string;
  message_count: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  // Dialog states
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refund form
  const [refundForm, setRefundForm] = useState({
    reasonType: "",
    reasonText: "",
  });

  // Support ticket form
  const [ticketForm, setTicketForm] = useState({
    issueType: "",
    subject: "",
    description: "",
    priority: "normal",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setIsAuthed(true);
          await loadData();
        } else {
          router.replace("/login?redirect=/payments");
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load orders
      const ordersRes = await fetch('/api/customer/orders');
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.orders);
      }

      // Load refund requests
      const refundsRes = await fetch('/api/customer/refund-requests');
      const refundsData = await refundsRes.json();
      if (refundsData.success) {
        setRefundRequests(refundsData.refundRequests);
      }

      // Load support tickets
      const ticketsRes = await fetch('/api/customer/support-tickets');
      const ticketsData = await ticketsRes.json();
      if (ticketsData.success) {
        setSupportTickets(ticketsData.supportTickets);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (orderId: string) => {
    window.open(`/api/customer/invoice/${orderId}?print=true`, '_blank');
  };

  const handleDownloadReceipt = (orderId: string) => {
    window.open(`/api/customer/receipt/${orderId}?print=true`, '_blank');
  };

  const handleRequestRefund = (order: Order) => {
    setSelectedOrder(order);
    setRefundForm({
      reasonType: "",
      reasonText: "",
    });
    setIsRefundDialogOpen(true);
  };

  const handleOpenSupportTicket = (order: Order) => {
    setSelectedOrder(order);
    setTicketForm({
      issueType: "",
      subject: "",
      description: "",
      priority: "normal",
    });
    setIsSupportDialogOpen(true);
  };

  const submitRefundRequest = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/customer/refund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          reasonType: refundForm.reasonType,
          reasonText: refundForm.reasonText,
          requestedAmount: selectedOrder.total_amount, // Auto-use full order amount
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsRefundDialogOpen(false);
        await loadData(); // Reload data
        toast.success('Refund Request Submitted', {
          description: 'Your refund request has been received and is being reviewed by our team. We will notify you once it has been processed.',
          duration: 5000,
        });
      } else {
        toast.error('Failed to Submit Refund Request', {
          description: data.error || 'Please try again or contact support.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error submitting refund:', error);
      toast.error('Error', {
        description: 'An error occurred. Please try again.',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitSupportTicket = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/customer/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          issueType: ticketForm.issueType,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSupportDialogOpen(false);
        await loadData(); // Reload data
        toast.success('Support Request Created', {
          description: 'Your support request has been created. Our team will respond shortly.',
          duration: 5000,
        });
      } else {
        toast.error('Failed to Create Support Request', {
          description: data.error || 'Please try again or contact support.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error', {
        description: 'An error occurred. Please try again.',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      completed: { variant: 'default', label: 'Completed', icon: CheckCircle },
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      cancelled: { variant: 'destructive', label: 'Cancelled', icon: XCircle },
      refunded: { variant: 'outline', label: 'Refunded', icon: RotateCcw },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    const symbols: Record<string, string> = {
      TRY: '₺',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  if (isChecking || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payments & Billing</h1>
            <p className="text-muted-foreground">View and manage your orders</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              <Receipt className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="refunds">
              <RotateCcw className="h-4 w-4 mr-2" />
              Refund Requests
            </TabsTrigger>
            <TabsTrigger value="support">
              <MessageSquare className="h-4 w-4 mr-2" />
              Support Requests
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by purchasing your first pass!</p>
                  <Button asChild>
                    <Link href="/#passes-section">Explore Passes</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          Order #{order.order_number}
                          {getStatusBadge(order.status)}
                          {/* Show refund status badge */}
                          {order.refund_status === 'pending' || order.refund_status === 'under_review' ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Refund In Progress
                            </Badge>
                          ) : order.refund_status === 'approved' ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Refund Approved
                            </Badge>
                          ) : order.refund_status === 'completed' || order.status === 'refunded' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Refund Completed
                            </Badge>
                          ) : null}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: enUS })}
                          </span>
                          <span>{getPaymentStatusBadge(order.payment_status)}</span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(order.total_amount, order.currency)}</p>
                        <p className="text-sm text-muted-foreground">
                          <CreditCard className="h-3 w-3 inline mr-1" />
                          {order.payment_method || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Order Items */}
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{item.pass_name}</p>
                              {item.adult_quantity && (
                                <p className="text-sm text-muted-foreground">Adult: {item.adult_quantity}</p>
                              )}
                              {item.child_quantity && (
                                <p className="text-sm text-muted-foreground">Child: {item.child_quantity}</p>
                              )}
                            </div>
                            <p className="font-semibold">{formatCurrency(item.total_price, order.currency)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {/* Only show invoice/receipt buttons if order is not refunded */}
                        {order.status !== 'refunded' && order.invoice_url && (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(order.id)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Invoice
                          </Button>
                        )}
                        {order.status !== 'refunded' && order.receipt_url && (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(order.id)}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
                        )}
                        {/* Refund button logic */}
                        {/* Show Request Refund button only if no refund exists */}
                        {order.status === 'completed' && order.payment_status === 'completed' && !order.refund_status && (
                          <Button variant="outline" size="sm" onClick={() => handleRequestRefund(order)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Request Refund
                          </Button>
                        )}
                        {/* Show refund status badge in actions area */}
                        {order.refund_status === 'pending' || order.refund_status === 'under_review' ? (
                          <Badge variant="secondary" className="px-3 py-1 h-9 flex items-center gap-2 bg-orange-100 text-orange-800">
                            <Clock className="h-4 w-4" />
                            Refund In Progress
                          </Badge>
                        ) : order.refund_status === 'approved' ? (
                          <Badge variant="secondary" className="px-3 py-1 h-9 flex items-center gap-2 bg-blue-100 text-blue-800">
                            <CheckCircle className="h-4 w-4" />
                            Refund Approved - Processing
                          </Badge>
                        ) : order.refund_status === 'completed' || order.status === 'refunded' ? (
                          <Badge variant="outline" className="px-3 py-1 h-9 flex items-center gap-2 bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-4 w-4" />
                            Refund Completed
                          </Badge>
                        ) : null}
                        {/* Support button - always available */}
                        <Button variant="outline" size="sm" onClick={() => handleOpenSupportTicket(order)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Request Support
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-4">
            {refundRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No refund requests</h3>
                  <p className="text-muted-foreground">Refund requests will appear here</p>
                </CardContent>
              </Card>
            ) : (
              refundRequests.map((refund) => (
                <Card key={refund.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Refund Request #{refund.request_number}</CardTitle>
                        <CardDescription>Order: {refund.order_number}</CardDescription>
                      </div>
                      <Badge>{refund.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Reason</p>
                        <p className="text-sm text-muted-foreground">{refund.reason_text}</p>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Requested Amount:</span>
                        <span className="font-semibold">{formatCurrency(refund.requested_amount)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(refund.created_at), 'dd MMM yyyy', { locale: enUS })}
                      </div>
                      {refund.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm font-medium text-red-600">Rejection Reason:</p>
                          <p className="text-sm text-red-600">{refund.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-4">
            {supportTickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No support requests</h3>
                  <p className="text-muted-foreground">Support requests will appear here</p>
                </CardContent>
              </Card>
            ) : (
              supportTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Request #{ticket.ticket_number}</CardTitle>
                        <CardDescription>{ticket.subject}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{ticket.status}</Badge>
                        <Badge variant="outline">{ticket.priority}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">{ticket.description}</p>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Messages: {ticket.message_count}</span>
                        <span>{format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: enUS })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Refund Request Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Refund Request</DialogTitle>
              <DialogDescription>
                Refund request for order #{selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Refund Reason</Label>
                <Select value={refundForm.reasonType} onValueChange={(value) => setRefundForm({ ...refundForm, reasonType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_as_described">Not as described</SelectItem>
                    <SelectItem value="technical_issue">Technical issue</SelectItem>
                    <SelectItem value="duplicate_purchase">Duplicate purchase</SelectItem>
                    <SelectItem value="changed_mind">Changed mind</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={refundForm.reasonText}
                  onChange={(e) => setRefundForm({ ...refundForm, reasonText: e.target.value })}
                  placeholder="Explain your refund reason in detail..."
                  rows={4}
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Refund Amount:</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedOrder?.total_amount || 0, selectedOrder?.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Full order amount will be refunded</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitRefundRequest} disabled={submitting || !refundForm.reasonType || !refundForm.reasonText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Support Ticket Dialog */}
        <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Request</DialogTitle>
              <DialogDescription>
                Support request for order #{selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Issue Type</Label>
                <Select value={ticketForm.issueType} onValueChange={(value) => setTicketForm({ ...ticketForm, issueType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activation_issue">Activation issue</SelectItem>
                    <SelectItem value="pass_not_working">Pass not working</SelectItem>
                    <SelectItem value="missing_benefits">Missing benefits</SelectItem>
                    <SelectItem value="billing_question">Billing question</SelectItem>
                    <SelectItem value="general_inquiry">General inquiry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Write a brief title"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Explain your issue in detail..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSupportDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitSupportTicket} disabled={submitting || !ticketForm.issueType || !ticketForm.subject || !ticketForm.description}>
                {submitting ? 'Creating...' : 'Create Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
