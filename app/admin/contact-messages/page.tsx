'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, Phone, Calendar, User, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  customer_id: string | null;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  assigned_at: string | null;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  assigned_admin?: {
    name: string;
    email: string;
  } | null;
  responded_admin?: {
    name: string;
    email: string;
  } | null;
}

interface ContactStats {
  total_messages: number;
  new_messages: number;
  in_progress_messages: number;
  resolved_messages: number;
  avg_response_time: string | null;
}

function ContactMessagesContent() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    fetchMessages();
  }, [statusFilter, priorityFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/admin/contact-messages?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (messageId: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'assign',
          status: 'in_progress',
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error assigning message:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedMessage || !response.trim()) return;

    try {
      setUpdating(true);
      const res = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMessage.id,
          action: 'respond',
          response: response.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsDialogOpen(false);
        setResponse('');
        setSelectedMessage(null);
        fetchMessages();
      }
    } catch (error) {
      console.error('Error responding to message:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (messageId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'update',
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (messageId: string, newPriority: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          action: 'update',
          priority: newPriority,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setUpdating(false);
    }
  };

  const openRespondDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setResponse('');
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      new: { variant: 'default', label: 'New' },
      in_progress: { variant: 'secondary', label: 'In Progress' },
      resolved: { variant: 'success', label: 'Resolved' },
      closed: { variant: 'outline', label: 'Closed' },
    };
    const config = variants[status] || variants.new;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      low: { variant: 'outline', label: 'Low' },
      normal: { variant: 'secondary', label: 'Normal' },
      high: { variant: 'default', label: 'High' },
      urgent: { variant: 'destructive', label: 'Urgent' },
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contact Messages</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer requests and inquiries
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_messages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Messages</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.new_messages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.in_progress_messages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved_messages}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Total {messages.length} messages found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Select
                          value={message.status}
                          onValueChange={(value) => handleUpdateStatus(message.id, value)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={message.priority}
                          onValueChange={(value) => handleUpdatePriority(message.id, value)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{message.name}</div>
                          <div className="text-sm text-muted-foreground">{message.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">{message.subject}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {message.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(message.created_at), 'dd MMM yyyy HH:mm', { locale: enUS })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!message.assigned_to && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssign(message.id)}
                              disabled={updating}
                            >
                              Assign
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openRespondDialog(message)}
                            disabled={updating}
                          >
                            Reply
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              {selectedMessage?.name} write a reply for
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{selectedMessage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{selectedMessage.email}</span>
                </div>
                {selectedMessage.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{selectedMessage.phone}</span>
                  </div>
                )}
                <div className="pt-2">
                  <div className="font-medium mb-1">Subject: {selectedMessage.subject}</div>
                  <div className="text-sm">{selectedMessage.message}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Reply</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Write a reply to the customer..."
                  rows={6}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRespond} disabled={updating || !response.trim()}>
              {updating ? 'Sending...' : 'Send Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ContactMessagesPage() {
  return (
    <AdminLayout>
      <ContactMessagesContent />
    </AdminLayout>
  );
}
