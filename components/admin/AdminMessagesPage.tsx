"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Send,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import { getMessageTemplates, type MessageTemplate } from "@/lib/services/messageService";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default function AdminMessagesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New message form
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("none");
  const [messageType, setMessageType] = useState<"notification" | "offer" | "alert" | "success">("notification");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");

  // Template editor
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const fetchedTemplates = await getMessageTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle || !messageContent) {
      setSaveStatus({ type: 'error', message: 'Title and content are required' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer === "all" ? null : selectedCustomer,
          type: messageType,
          title: messageTitle,
          content: messageContent
        })
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Announcement sent successfully!' });
        setMessageTitle("");
        setMessageContent("");
        setSelectedCustomer("all");
        setSelectedTemplate("none");
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to send message' });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSaveStatus({ type: 'error', message: 'An error occurred while sending the message' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async (template: MessageTemplate) => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/admin/message-templates/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Template updated successfully!' });
        await loadTemplates();
        setEditingTemplate(null);
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to update template' });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setSaveStatus({ type: 'error', message: 'An error occurred while saving the template' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTemplate = async (templateId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/message-templates/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, enabled })
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Announcements & Notifications</h2>
          <p className="text-muted-foreground">
            Send announcements to all customers or create targeted notifications
          </p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {saveStatus && (
        <Card className={`border-2 ${saveStatus.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <CardContent className="pt-6 flex items-center gap-3">
            {saveStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={saveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}>
              {saveStatus.message}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Create Announcement
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Announcement</CardTitle>
              <CardDescription>
                Create an announcement for all customers or send a notification to a specific customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Recipient</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers (Broadcast)</SelectItem>
                      {/* In a real app, you'd load customer list here */}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select "All Customers" to broadcast to everyone
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Announcement Type</Label>
                  <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification">📢 Announcement</SelectItem>
                      <SelectItem value="offer">🎁 Special Offer</SelectItem>
                      <SelectItem value="alert">⚠️ Important Alert</SelectItem>
                      <SelectItem value="success">✅ Good News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-select">Quick Templates (Optional)</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={(value) => {
                    setSelectedTemplate(value);
                    if (value === "none") {
                      // Reset form
                      setMessageTitle("");
                      setMessageContent("");
                      return;
                    }
                    const template = templates.find(t => t.id === value);
                    if (template) {
                      setMessageTitle(template.title_template);
                      setMessageContent(template.content_template);
                      setMessageType(template.type);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Custom Message)</SelectItem>
                    {templates.filter(t => t.enabled).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Templates contain placeholders like {`{{pass_name}}`} that you can replace manually
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Announcement Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., New Pass Added: Istanbul Museum Pass"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Announcement Content</Label>
                <Textarea
                  id="content"
                  placeholder="e.g., We just added a new pass! Check out our Istanbul Museum Pass for exclusive access to 15+ museums."
                  rows={6}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">Preview</h4>
                <div className="space-y-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">{messageTitle || "Your announcement title"}</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{messageContent || "Your announcement content will appear here..."}</p>
                </div>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isSaving || !messageTitle || !messageContent}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending to {selectedCustomer === "all" ? "all customers" : "1 customer"}...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {selectedCustomer === "all" ? "Broadcast to All Customers" : "Send to Customer"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                Manage reusable message templates with variable placeholders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <p className="text-muted-foreground mt-2">Loading templates...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {template.variables.map((variable, idx) => (
                              <code key={idx} className="text-xs bg-muted px-1 rounded">
                                {`{{${variable}}}`}
                              </code>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={template.enabled}
                            onCheckedChange={(checked) => handleToggleTemplate(template.id, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTemplate(template)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {editingTemplate && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Edit Template: {editingTemplate.name}</CardTitle>
                <CardDescription>{editingTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title Template</Label>
                  <Input
                    value={editingTemplate.title_template}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      title_template: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content Template</Label>
                  <Textarea
                    value={editingTemplate.content_template}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      content_template: e.target.value
                    })}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveTemplate(editingTemplate)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
