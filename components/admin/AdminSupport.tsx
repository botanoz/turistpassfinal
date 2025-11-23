"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdminLayout from "./AdminLayout";
import { Search, Filter, Eye, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TicketResponse = {
  id: string;
  sender: "business" | "admin";
  message: string;
  createdAt: string;
};

type AdminTicket = {
  id: string;
  from: string;
  type: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  date: string;
  lastUpdate: string;
  responses: TicketResponse[];
};

export default function AdminSupport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadTickets = useCallback(async (): Promise<AdminTicket[]> => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    const res = await fetch(`/api/admin/support?${params.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch support tickets");
    }
    return (json.tickets as any[]).map((t) => ({
      id: t.id as string,
      from: t.from as string,
      type: t.type as string,
      subject: t.subject as string,
      status: t.status as "open" | "in_progress" | "resolved",
      priority: t.priority as "low" | "medium" | "high",
      date: t.date as string,
      lastUpdate: t.lastUpdate as string,
      responses:
        (t.responses as any[] | undefined)?.map((r) => ({
          id: r.id as string,
          sender: r.sender as "business" | "admin",
          message: r.message as string,
          createdAt: r.createdAt as string,
        })) ?? [],
    }));
  }, [statusFilter, searchQuery]);

  const refreshTickets = useCallback(async () => {
    const latest = await loadTickets();
    setTickets(latest);
  }, [loadTickets]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    loadTickets()
      .then((data) => {
        if (mounted) setTickets(data);
      })
      .catch((error) => {
        console.error(error);
        if (mounted) setTickets([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadTickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: "Total Tickets", value: tickets.length },
    { label: "Open", value: tickets.filter(t => t.status === "open").length },
    { label: "In Progress", value: tickets.filter(t => t.status === "in_progress").length },
    { label: "Resolved", value: tickets.filter(t => t.status === "resolved").length }
  ];

  const handleViewConversation = (ticket: AdminTicket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTicket(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Support Tickets</h2>
          <p className="text-muted-foreground">Manage customer and business support requests</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No support tickets found</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-colors gap-3 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{ticket.id}</Badge>
                        <Badge variant={ticket.status === "open" ? "default" : ticket.status === "in_progress" ? "secondary" : "outline"}>
                          {ticket.status === "open" && <Clock className="h-3 w-3 mr-1" />}
                          {ticket.status === "resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={ticket.priority === "high" ? "destructive" : "secondary"}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline">{ticket.type}</Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>From: <strong>{ticket.from}</strong></span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {ticket.responses.length} {ticket.responses.length === 1 ? "response" : "responses"}
                        </span>
                        <span>Date: {new Date(ticket.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewConversation(ticket)}
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Conversation
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {selectedTicket && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(selectedTicket.date).toLocaleString()}
                </p>
              </DialogHeader>
              <AdminConversationDialog
                ticketId={selectedTicket.id}
                open={isDialogOpen}
                initialMessages={selectedTicket.responses}
                initialStatus={selectedTicket.status}
                onUpdated={refreshTickets}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}

type AdminConversationDialogProps = {
  ticketId: string;
  open: boolean;
  initialMessages: TicketResponse[];
  initialStatus: "open" | "in_progress" | "resolved";
  onUpdated: () => Promise<void>;
};

function AdminConversationDialog({
  ticketId,
  open,
  initialMessages,
  initialStatus,
  onUpdated,
}: AdminConversationDialogProps) {
  const [messages, setMessages] = useState<TicketResponse[]>(initialMessages);
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved">(
    initialStatus === "resolved" ? "in_progress" : initialStatus,
  );
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setStatus(initialStatus === "resolved" ? "in_progress" : initialStatus);
  }, [initialStatus]);

  const fetchConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/support/${ticketId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load conversation");
      setMessages((json.messages ?? []) as TicketResponse[]);
      if (json.ticket?.status) {
        const nextStatus = json.ticket.status as "open" | "in_progress" | "resolved";
        setStatus(nextStatus === "resolved" ? "in_progress" : nextStatus);
      }
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
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to send response");
      setMessage("");
      toast.success("Response sent!");
      await fetchConversation();
      await onUpdated();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No responses yet. Be the first to reply!</p>
              </div>
            ) : (
              messages.map((response) => (
                <div
                  key={response.id}
                  className={`rounded-lg border p-4 shadow-sm ${
                    response.sender === "admin"
                      ? "bg-primary/5 border-primary/20 ml-8"
                      : "bg-muted/50 mr-8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={response.sender === "admin" ? "default" : "secondary"} className="text-xs">
                      {response.sender === "admin" ? "Admin" : "Business"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(response.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{response.message}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Reply</label>
          <Textarea
            rows={4}
            placeholder="Type your response here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="min-w-[140px]"
          >
            {isSending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Response
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
