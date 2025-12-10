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
  Loader2
} from "lucide-react";
import Link from "next/link";
import { getUserMessages, markMessageAsRead, type Message } from "@/lib/services/messageService";

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

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
  useEffect(() => {
    if (!isAuthed) return;

    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const fetchedMessages = await getUserMessages();
        if (mounted) {
          setMessages(fetchedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
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
      console.error('Failed to mark message as read in database');
      // Optionally revert the optimistic update
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

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
            <p className="text-muted-foreground">Your notifications and updates</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-lg px-3 py-1">
              {unreadCount} new
            </Badge>
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
          <div className="space-y-4">
            {messages.map((message) => {
              const Icon = getMessageIcon(message.type);
              const colorClass = getMessageColor(message.type);

              return (
                <Card
                  key={message.id}
                  className={`${!message.read ? 'border-primary/50 shadow-md' : ''} hover:shadow-lg transition-shadow cursor-pointer`}
                  onClick={() => !message.read && handleMarkAsRead(message.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-lg ${colorClass} h-fit`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-semibold ${!message.read ? 'text-primary' : ''}`}>
                            {message.title}
                          </h3>
                          {!message.read && (
                            <Badge variant="default" className="shrink-0">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(message.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
