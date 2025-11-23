"use client";

import { useMemo } from "react";
import { useBusinessContext, type BusinessNotification } from "./BusinessLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gift, AlertCircle, CheckCircle, Info } from "lucide-react";
import Link from "next/link";

export default function BusinessNotifications() {
  const {
    business,
    loading,
    notifications,
    notificationsLoading,
    refreshNotifications,
    markNotificationRead,
  } = useBusinessContext();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getIcon = (type: BusinessNotification["type"]) => {
    const icons = { success: CheckCircle, info: Info, alert: AlertCircle, offer: Gift };
    return icons[type] ?? Info;
  };

  const getColor = (type: BusinessNotification["type"]) => ({
    success: "text-green-600",
    info: "text-blue-600",
    alert: "text-orange-600",
    offer: "text-purple-600",
  })[type] ?? "text-blue-600";

  if (loading || notificationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-background">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/business/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">{business?.name ?? "Business Portal"}</p>
          </div>
          {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshNotifications}>
              Refresh
            </Button>
            <Button variant="default" size="sm" onClick={() => markNotificationRead()} disabled={unreadCount === 0}>
              Mark all read
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No notifications yet.</CardContent>
          </Card>
        ) : (
          notifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <Card key={notif.id} className={!notif.read ? "border-primary/50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className={`p-2 rounded-lg bg-muted ${getColor(notif.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{notif.title}</h3>
                        <div className="flex items-center gap-2">
                          {!notif.read && <Badge variant="default">New</Badge>}
                          {!notif.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => markNotificationRead(notif.id)}
                            >
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notif.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
