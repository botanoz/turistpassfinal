"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  ArrowLeft,
  Bell,
  Gift,
  AlertCircle,
  CheckCircle,
  Ticket,
  Calendar,
  Loader2,
  Trash2,
  CheckCheck,
  MoreVertical,
  Circle
} from "lucide-react";
import Link from "next/link";
import {
  getUserMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  deleteMessage,
  deleteAllMessages,
  deleteReadMessages,
  type Message
} from "@/lib/services/messageService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check authentication
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setIsAuthed(true);
        } else {
          router.replace("/login?redirect=/messages");
        }
      } finally {
        if (mounted) setIsChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // Fetch messages from database
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const fetchedMessages = await getUserMessages();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    loadMessages();
  }, [isAuthed]);

  if (isChecking || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getMessageIcon = (type: Message["type"]) => {
    switch (type) {
      case "offer":
        return Gift;
      case "alert":
        return AlertCircle;
      case "success":
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const getMessageColor = (type: Message["type"]) => {
    switch (type) {
      case "offer":
        return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
      case "alert":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
      case "success":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    // Optimistically update UI
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, read: true } : msg
    ));

    // Update in database
    const success = await markMessageAsRead(messageId);
    if (!success) {
      toast.error('Failed to mark message as read');
      // Revert optimistic update
      loadMessages();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isProcessing) return;

    const unreadCount = messages.filter(m => !m.read).length;
    if (unreadCount === 0) {
      toast.info("No unread messages");
      return;
    }

    setIsProcessing(true);
    const success = await markAllMessagesAsRead();

    if (success) {
      toast.success(`Marked ${unreadCount} message${unreadCount > 1 ? 's' : ''} as read`);
      await loadMessages();
    } else {
      toast.error("Failed to mark all messages as read");
    }
    setIsProcessing(false);
  };

  const handleDeleteAll = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const success = await deleteAllMessages();

    if (success) {
      toast.success("All messages deleted");
      setMessages([]);
    } else {
      toast.error("Failed to delete messages");
    }
    setIsProcessing(false);
  };

  const handleDeleteRead = async () => {
    if (isProcessing) return;

    const readCount = messages.filter(m => m.read).length;
    if (readCount === 0) {
      toast.info("No read messages to delete");
      return;
    }

    setIsProcessing(true);
    const success = await deleteReadMessages();

    if (success) {
      toast.success(`${readCount} read message${readCount > 1 ? 's' : ''} deleted`);
      await loadMessages();
    } else {
      toast.error("Failed to delete messages");
    }
    setIsProcessing(false);
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const readCount = messages.filter(m => m.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
                : "All caught up!"}
            </p>
          </div>

          {messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isProcessing}>
                  <MoreVertical className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || isProcessing}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Read
                  {unreadCount > 0 && (
                    <Badge className="ml-auto" variant="secondary">{unreadCount}</Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteRead}
                  disabled={readCount === 0 || isProcessing}
                  className="text-orange-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Read Messages
                  {readCount > 0 && (
                    <Badge className="ml-auto" variant="secondary">{readCount}</Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteAll}
                  disabled={isProcessing}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent>
              <Loader2 className="h-16 w-16 mx-auto text-primary mb-4 animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Loading Messages</h3>
              <p className="text-muted-foreground">
                Please wait while we fetch your messages...
              </p>
            </CardContent>
          </Card>
        ) : messages.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Messages</h3>
              <p className="text-muted-foreground">
                You&apos;re all caught up! Check back later for new updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const Icon = getMessageIcon(message.type);
              const colorClass = getMessageColor(message.type);

              return (
                <Card
                  key={message.id}
                  className={`${!message.read ? 'border-l-4 border-l-primary bg-primary/5' : 'opacity-70'} hover:shadow-md transition-all cursor-pointer`}
                  onClick={() => !message.read && handleMarkAsRead(message.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-lg ${colorClass} h-fit flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className={`font-semibold ${!message.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {message.title}
                          </h3>
                          {!message.read && (
                            <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {message.content}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(message.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: new Date(message.date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {messages.length > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>
              {unreadCount > 0
                ? `Tap a message to mark it as read`
                : `Use "Actions" menu to manage messages`}
            </p>
          </div>
        )}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-3">
            <Ticket className="h-10 w-10 mx-auto text-primary" />
            <h3 className="font-semibold">Want more benefits?</h3>
            <p className="text-sm text-muted-foreground">
              Explore our passes to get exclusive discounts and offers at 70+ locations
            </p>
            <Button asChild>
              <Link href="/#passes-section">
                Browse Passes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
