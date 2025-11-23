"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, AlertCircle, CheckCircle, Clock, Phone, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type TicketResponse = {
  id: string;
  sender: "business" | "admin";
  message: string;
  createdAt: string;
};

type BusinessTicket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  date: string;
  lastUpdate: string;
  responses: TicketResponse[];
};

export default function BusinessSupport() {
  const { business, loading } = useBusinessContext();
  const [formData, setFormData] = useState({ subject: "", message: "", priority: "medium" });
  const [tickets, setTickets] = useState<BusinessTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const handleOpenConversation = useCallback((ticketId: string) => {
    setOpenTicketId(ticketId);
  }, []);

  const fetchTickets = useCallback(async (): Promise<BusinessTicket[]> => {
    const res = await fetch("/api/business/support");
    const json = await res.json();
    if (res.ok && json.success) {
      return (json.tickets as any[]).map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status as "open" | "in_progress" | "resolved",
        priority: t.priority as "low" | "medium" | "high",
        date: t.createdAt,
        lastUpdate: t.lastUpdate,
        responses: (t.responses as any[] | undefined)?.map((r) => ({
          id: r.id as string,
          sender: r.sender as "business" | "admin",
          message: r.message as string,
          createdAt: r.createdAt as string,
        })) ?? [],
      }));
    }
    throw new Error(json.error ?? "Failed to load support tickets");
  }, []);

  const refreshTickets = useCallback(async () => {
    const latest = await fetchTickets();
    setTickets(latest);
  }, [fetchTickets]);

  useEffect(() => {
    if (loading) return;
    let active = true;
    setIsLoading(true);
    fetchTickets()
      .then((data) => {
        if (active) setTickets(data);
      })
      .catch(() => {
        if (active) setTickets([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loading, fetchTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/business/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject,
          priority: formData.priority,
          message: formData.message,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to submit ticket");
      toast.success("Support ticket submitted successfully!");
      setFormData({ subject: "", message: "", priority: "medium" });
      await refreshTickets();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = useCallback(
    async (ticketId: string, message: string) => {
      const res = await fetch("/api/business/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to send reply");
      await refreshTickets();
    },
    [refreshTickets],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Business profile unavailable</h2>
          <p className="text-muted-foreground">
            We could not fetch your business details. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      resolved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "text-gray-600 dark:text-gray-400",
      medium: "text-yellow-600 dark:text-yellow-400",
      high: "text-red-600 dark:text-red-400"
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const openTickets = tickets.filter(t => t.status === "open").length;
  const inProgressTickets = tickets.filter(t => t.status === "in_progress").length;

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Support Center</h2>
          <p className="text-muted-foreground">Get help and submit support tickets</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inProgressTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">Being handled</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="submit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="submit">
              <Send className="h-4 w-4 mr-2" />
              Submit Ticket
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <MessageSquare className="h-4 w-4 mr-2" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Phone className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Support Ticket</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Describe your issue and we&apos;ll get back to you as soon as possible
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject *</label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority *</label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - General question</SelectItem>
                        <SelectItem value="medium">Medium - Issue affecting work</SelectItem>
                        <SelectItem value="high">High - Critical issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message *</label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe your issue in detail..."
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    You haven&apos;t created any support tickets yet.
                  </CardContent>
                </Card>
              ) : (
                tickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {ticket.id}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status === "open" && <Clock className="h-3 w-3 mr-1" />}
                                {ticket.status === "in_progress" && <AlertCircle className="h-3 w-3 mr-1" />}
                                {ticket.status === "resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {ticket.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {ticket.responses.length > 0
                                ? ticket.responses[ticket.responses.length - 1].message
                                : "No messages yet."}
                            </p>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end gap-2">
                            <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-3 border-t">
                          <span>Created: {new Date(ticket.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Updated: {new Date(ticket.lastUpdate).toLocaleString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {ticket.responses.length} {ticket.responses.length === 1 ? "response" : "responses"}
                          </span>
                        </div>
                        <Dialog
                          open={openTicketId === ticket.id}
                          onOpenChange={(isOpen) => {
                            if (isOpen) {
                              handleOpenConversation(ticket.id);
                            } else {
                              setOpenTicketId(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => handleOpenConversation(ticket.id)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              View Conversation
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{ticket.subject}</DialogTitle>
                              <p className="text-sm text-muted-foreground">
                                Created {new Date(ticket.date).toLocaleString()}
                              </p>
                            </DialogHeader>
                            <TicketConversationDialog
                              ticketId={ticket.id}
                              open={openTicketId === ticket.id}
                              initialMessages={ticket.responses}
                              onSend={handleReply}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reach out to us directly
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email Support</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Get help via email
                    </p>
                    <a href="mailto:business@turistpass.com" className="text-sm text-primary hover:underline">
                      business@turistpass.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Phone Support</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Monday - Friday, 9:00 AM - 6:00 PM
                    </p>
                    <a href="tel:+902121234567" className="text-sm text-primary hover:underline">
                      +90 (212) 123-4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Live Chat</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Chat with our support team
                    </p>
                    <Button variant="outline" size="sm">
                      Start Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Business Hours</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Monday - Friday:</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Saturday:</span>
                    <span className="font-medium">10:00 AM - 4:00 PM</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Sunday:</span>
                    <span className="font-medium">Closed</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

type TicketConversationDialogProps = {
  ticketId: string;
  open: boolean;
  initialMessages: TicketResponse[];
  onSend: (ticketId: string, message: string) => Promise<void>;
};

function TicketConversationDialog({ ticketId, open, initialMessages, onSend }: TicketConversationDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<TicketResponse[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Keep the latest message visible when content grows (mobile-friendly).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const fetchConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/business/support/${ticketId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load conversation");
      setMessages((json.messages ?? []) as TicketResponse[]);
    } catch (err: any) {
      setError(err.message ?? "Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!open) return;
    fetchConversation();
  }, [open, fetchConversation]);

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      setIsSending(true);
      await onSend(ticketId, message.trim());
      setMessage("");
      toast.success("Reply sent to support");
      await fetchConversation();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <ScrollArea className="max-h-[60vh] md:max-h-[420px] pr-2 border rounded-lg">
        <div className="space-y-3">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading conversation...</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No replies yet.</p>
          ) : (
            messages.map((response) => (
              <div
                key={response.id}
                className={`rounded-lg border p-3 text-sm ${
                  response.sender === "business" ? "bg-primary/5 border-primary/20" : "bg-muted"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold capitalize">{response.sender}</span>
                  <span>{new Date(response.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{response.message}</p>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      <div className="space-y-2">
        <label className="text-sm font-medium">Reply</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Share an update with the TuristPass support team..."
        />
      </div>
      <Button onClick={handleSend} disabled={isSending || !message.trim()} className="w-full">
        {isSending ? "Sending..." : "Send Reply"}
      </Button>
    </div>
  );
}
