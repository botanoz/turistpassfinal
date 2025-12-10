"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchFaqContent, type FaqCategory, type FaqQuestion } from "@/lib/services/contentService";
import { getContactInfo, type ContactInfo } from "@/lib/services/settingsService";
import {
  ArrowLeft,
  BadgeInfo,
  CheckCircle2,
  Clock,
  Headphones,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
};

type SupportTicket = {
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
  message_count: number;
};

export default function SupportPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [faqCategories, setFaqCategories] = useState<FaqCategory[]>([]);
  const [faqQuestions, setFaqQuestions] = useState<FaqQuestion[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [activeFaqCategory, setActiveFaqCategory] = useState<string | null>(null);

  const [ticketForm, setTicketForm] = useState({
    orderId: "",
    issueType: "",
    subject: "",
    description: "",
    priority: "normal",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          setIsAuthed(true);
          await loadData();
        } else {
          router.replace("/login?redirect=/support");
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

      const [ordersRes, ticketsRes] = await Promise.all([
        fetch("/api/customer/orders"),
        fetch("/api/customer/support-tickets"),
      ]);

      const ordersData = await ordersRes.json();
      const ticketsData = await ticketsRes.json();

      if (ordersData.success) {
        setOrders(ordersData.orders || []);
        if (!ticketForm.orderId && ordersData.orders?.length) {
          setTicketForm((prev) => ({ ...prev, orderId: ordersData.orders[0].id }));
        }
      }

      if (ticketsData.success) {
        setSupportTickets(ticketsData.supportTickets || []);
      }

      const [{ categories, questions }, contact] = await Promise.all([
        fetchFaqContent(),
        getContactInfo(),
      ]);

      setFaqCategories(categories);
      setFaqQuestions(questions);
      if (!activeFaqCategory && categories.length > 0) {
        setActiveFaqCategory(categories[0].id);
      }
      setContactInfo(contact);
    } catch (error) {
      console.error("Failed to load support data:", error);
      toast.error("Support data could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitSupportTicket = async () => {
    if (!ticketForm.orderId) {
      toast.error("Please select an order before creating a ticket.");
      return;
    }
    if (!ticketForm.issueType || !ticketForm.subject || !ticketForm.description) {
      toast.error("Please fill in every field.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/customer/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ticketForm.orderId,
          issueType: ticketForm.issueType,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Support request could not be created");
      }

      toast.success("Support request created", {
        description: "Our team will get back to you shortly.",
      });
      setTicketForm((prev) => ({
        ...prev,
        subject: "",
        description: "",
      }));
      await loadData();
    } catch (error: any) {
      console.error("Ticket creation failed:", error);
      toast.error(error?.message || "Request could not be created");
    } finally {
      setSubmitting(false);
    }
  };

  const openTickets = useMemo(
    () =>
      supportTickets.filter((t) =>
        ["open", "in_progress", "waiting_customer"].includes(t.status),
      ).length,
    [supportTickets],
  );

  const resolvedTickets = useMemo(
    () => supportTickets.filter((t) => ["resolved", "closed"].includes(t.status)).length,
    [supportTickets],
  );

  const lastReply = useMemo(() => {
    const replies = supportTickets
      .map((t) => t.last_reply_at)
      .filter(Boolean) as string[];
    if (replies.length === 0) return null;
    const sorted = replies.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    return sorted[0];
  }, [supportTickets]);

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      { label: string; className: string }
    > = {
      open: { label: "Open", className: "bg-blue-50 text-blue-700 border-blue-200" },
      in_progress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
      waiting_customer: { label: "Waiting", className: "bg-orange-50 text-orange-700 border-orange-200" },
      resolved: { label: "Resolved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      closed: { label: "Closed", className: "bg-slate-50 text-slate-700 border-slate-200" },
    };
    const config = map[status] || map.open;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (isChecking || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Support & Help</h1>
            <p className="text-muted-foreground">
              FAQs, support tickets, and quick contact options.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                Open Tickets
              </CardTitle>
              <CardDescription>Your open support tickets</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold">{openTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Resolved Tickets
              </CardTitle>
              <CardDescription>Completed support records</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold">{resolvedTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">Closed tickets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Latest Update
              </CardTitle>
              <CardDescription>Support team activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {lastReply ? format(new Date(lastReply), "dd MMM yyyy, HH:mm", { locale: enUS }) : "No replies yet"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                We keep every ticket in sync
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets">
              <Ticket className="h-4 w-4 mr-2" />
              Ticket System
            </TabsTrigger>
            <TabsTrigger value="faq">
              <BadgeInfo className="h-4 w-4 mr-2" />
              FAQs
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MessageCircle className="h-4 w-4 mr-2" />
              Email & WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Create a Support Ticket</CardTitle>
                <CardDescription>Share order details and our team will reach out.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Related Order</p>
                    <Select
                      value={ticketForm.orderId}
                      onValueChange={(orderId) => setTicketForm((prev) => ({ ...prev, orderId }))}
                      disabled={orders.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={orders.length === 0 ? "No orders found" : "Select an order"} />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            #{order.order_number} - {format(new Date(order.created_at), "dd MMM yyyy", { locale: enUS })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link the ticket to an order so we can resolve it faster.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subject</p>
                    <Input
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Example: Activation code is not working"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Issue Type</p>
                    <Select
                      value={ticketForm.issueType}
                      onValueChange={(issueType) => setTicketForm((prev) => ({ ...prev, issueType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activation_issue">Activation issue</SelectItem>
                        <SelectItem value="pass_not_working">Pass is not working</SelectItem>
                        <SelectItem value="missing_benefits">Missing benefits</SelectItem>
                        <SelectItem value="billing_question">Payment/Billing</SelectItem>
                        <SelectItem value="general_inquiry">General inquiry</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Priority</p>
                    <Select
                      value={ticketForm.priority}
                      onValueChange={(priority) => setTicketForm((prev) => ({ ...prev, priority }))}
                    >
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

                <div className="space-y-2">
                  <p className="text-sm font-medium">Details</p>
                  <Textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Describe the issue in detail; include links if helpful."
                  />
                </div>

                <div className="flex flex-wrap gap-3 justify-end">
                  <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={submitSupportTicket}
                    disabled={submitting || orders.length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Create Ticket
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Ticket History</CardTitle>
                <CardDescription>All records with status, priority, and reply counts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : supportTickets.length === 0 ? (
                  <div className="p-6 border rounded-lg text-center text-muted-foreground bg-muted/40">
                    <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    You do not have any support tickets yet.
                  </div>
                ) : (
                  supportTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-lg border p-4 hover:border-primary/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {ticket.ticket_number}
                            </Badge>
                            {getStatusBadge(ticket.status)}
                            <Badge variant="secondary">{ticket.priority}</Badge>
                          </div>
                          <p className="font-semibold">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            Order: #{ticket.order_number} - {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: enUS })}
                          </p>
                        </div>
                        <div className="text-right space-y-1 min-w-[160px]">
                          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                            <MessageSquare className="h-4 w-4" />
                            {(ticket.message_count ?? 0)} messages
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last reply:{" "}
                            {ticket.last_reply_at
                              ? format(new Date(ticket.last_reply_at), "dd MMM HH:mm", { locale: enUS })
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{ticket.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>Most common questions and answers.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : faqCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No FAQ entries available right now.</p>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {faqCategories.map((category) => (
                        <Button
                          key={category.id}
                          size="sm"
                          variant={activeFaqCategory === category.id ? "default" : "outline"}
                          onClick={() => setActiveFaqCategory(category.id)}
                        >
                          {category.label}
                        </Button>
                      ))}
                    </div>
                    <Accordion type="single" collapsible className="mt-4 space-y-2">
                      {faqQuestions
                        .filter((q) => q.category_id === activeFaqCategory)
                        .map((faq, index) => (
                          <AccordionItem key={faq.id ?? index} value={`item-${faq.id ?? index}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    WhatsApp
                  </CardTitle>
                  <CardDescription>
                    {contactInfo?.whatsappDescription || "24/7 quick responses on WhatsApp"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold">
                    {contactInfo?.whatsapp || "+90 555 123 4567"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contactInfo?.whatsappAvailability || "Available all day, every day"}
                  </p>
                  <Button asChild className="w-full">
                    <Link
                      href={contactInfo?.whatsappUrl || "https://wa.me/905551234567"}
                      target="_blank"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message on WhatsApp
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Email
                  </CardTitle>
                  <CardDescription>
                    {contactInfo?.emailDescription || "Support team replies within four hours."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold">
                    {contactInfo?.supportEmail || contactInfo?.email || "support@turistpass.com"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contactInfo?.emailResponseTime || "Typical response time: 4 hours"}
                  </p>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`mailto:${contactInfo?.supportEmail || "support@turistpass.com"}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Call
                  </CardTitle>
                  <CardDescription>Call us for quick phone support.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold">
                    {contactInfo?.phone || "+90 212 345 6789"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contactInfo?.phoneAvailability || "09:00 - 22:00"}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`tel:${(contactInfo?.phone || "+902123456789").replace(/\s/g, "")}`}>
                      <Headphones className="h-4 w-4 mr-2" />
                      Call now
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BadgeInfo className="h-4 w-4 text-amber-600" />
                    Ticket Status
                  </CardTitle>
                  <CardDescription>Track active, pending, and resolved tickets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Open tickets: <span className="font-medium text-foreground">{openTickets}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Resolved tickets: <span className="font-medium text-foreground">{resolvedTickets}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    Last reply: <span className="font-medium text-foreground">
                      {lastReply
                        ? format(new Date(lastReply), "dd MMM HH:mm", { locale: enUS })
                        : "No replies yet"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
