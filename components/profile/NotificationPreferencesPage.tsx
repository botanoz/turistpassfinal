"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bell, Mail, MessageSquare, Smartphone, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface NotificationPreferences {
  id?: string;
  customer_id?: string;
  // Email Notifications
  email_marketing: boolean;
  email_pass_updates: boolean;
  email_order_updates: boolean;
  email_venue_recommendations: boolean;
  email_special_offers: boolean;
  // Push Notifications
  push_enabled: boolean;
  push_pass_reminders: boolean;
  push_nearby_venues: boolean;
  push_special_offers: boolean;
  // SMS Notifications
  sms_enabled: boolean;
  sms_pass_expiry: boolean;
  sms_special_offers: boolean;
  // In-App Notifications
  inapp_enabled: boolean;
  inapp_messages: boolean;
  inapp_announcements: boolean;
  // Frequency
  digest_frequency: 'realtime' | 'daily' | 'weekly' | 'never';
}

const defaultPreferences: NotificationPreferences = {
  email_marketing: true,
  email_pass_updates: true,
  email_order_updates: true,
  email_venue_recommendations: true,
  email_special_offers: true,
  push_enabled: false,
  push_pass_reminders: true,
  push_nearby_venues: false,
  push_special_offers: true,
  sms_enabled: false,
  sms_pass_expiry: false,
  sms_special_offers: false,
  inapp_enabled: true,
  inapp_messages: true,
  inapp_announcements: true,
  digest_frequency: 'weekly',
};

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setIsAuthed(true);
          await loadPreferences();
        } else {
          router.replace("/login?redirect=/profile/notifications");
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

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/notification-preferences');
      const data = await response.json();

      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/customer/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Notification preferences saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences({ ...preferences, [key]: value });
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground">Manage how you receive updates from TuristPass</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Receive updates via email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_marketing">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Promotional content and newsletters</p>
                  </div>
                  <Switch
                    id="email_marketing"
                    checked={preferences.email_marketing}
                    onCheckedChange={(checked) => updatePreference('email_marketing', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_pass_updates">Pass Updates</Label>
                    <p className="text-sm text-muted-foreground">Expiration reminders and renewals</p>
                  </div>
                  <Switch
                    id="email_pass_updates"
                    checked={preferences.email_pass_updates}
                    onCheckedChange={(checked) => updatePreference('email_pass_updates', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_order_updates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Order confirmations and receipts</p>
                  </div>
                  <Switch
                    id="email_order_updates"
                    checked={preferences.email_order_updates}
                    onCheckedChange={(checked) => updatePreference('email_order_updates', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_venue_recommendations">Venue Recommendations</Label>
                    <p className="text-sm text-muted-foreground">Personalized venue suggestions</p>
                  </div>
                  <Switch
                    id="email_venue_recommendations"
                    checked={preferences.email_venue_recommendations}
                    onCheckedChange={(checked) => updatePreference('email_venue_recommendations', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_special_offers">Special Offers</Label>
                    <p className="text-sm text-muted-foreground">Exclusive discounts and deals</p>
                  </div>
                  <Switch
                    id="email_special_offers"
                    checked={preferences.email_special_offers}
                    onCheckedChange={(checked) => updatePreference('email_special_offers', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <CardDescription>Mobile app notifications (when available)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_enabled">Enable Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Allow push notifications on your device</p>
                  </div>
                  <Switch
                    id="push_enabled"
                    checked={preferences.push_enabled}
                    onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_pass_reminders">Pass Reminders</Label>
                    <p className="text-sm text-muted-foreground">Notifications about your passes</p>
                  </div>
                  <Switch
                    id="push_pass_reminders"
                    checked={preferences.push_pass_reminders}
                    onCheckedChange={(checked) => updatePreference('push_pass_reminders', checked)}
                    disabled={!preferences.push_enabled}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_nearby_venues">Nearby Venues</Label>
                    <p className="text-sm text-muted-foreground">Alerts when near partner venues</p>
                  </div>
                  <Switch
                    id="push_nearby_venues"
                    checked={preferences.push_nearby_venues}
                    onCheckedChange={(checked) => updatePreference('push_nearby_venues', checked)}
                    disabled={!preferences.push_enabled}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_special_offers">Special Offers</Label>
                    <p className="text-sm text-muted-foreground">Flash sales and limited-time deals</p>
                  </div>
                  <Switch
                    id="push_special_offers"
                    checked={preferences.push_special_offers}
                    onCheckedChange={(checked) => updatePreference('push_special_offers', checked)}
                    disabled={!preferences.push_enabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  In-App Notifications
                </CardTitle>
                <CardDescription>Notifications within the TuristPass platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp_enabled">Enable In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show notifications in the app</p>
                  </div>
                  <Switch
                    id="inapp_enabled"
                    checked={preferences.inapp_enabled}
                    onCheckedChange={(checked) => updatePreference('inapp_enabled', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp_messages">Messages</Label>
                    <p className="text-sm text-muted-foreground">New messages and replies</p>
                  </div>
                  <Switch
                    id="inapp_messages"
                    checked={preferences.inapp_messages}
                    onCheckedChange={(checked) => updatePreference('inapp_messages', checked)}
                    disabled={!preferences.inapp_enabled}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp_announcements">Announcements</Label>
                    <p className="text-sm text-muted-foreground">Platform updates and news</p>
                  </div>
                  <Switch
                    id="inapp_announcements"
                    checked={preferences.inapp_announcements}
                    onCheckedChange={(checked) => updatePreference('inapp_announcements', checked)}
                    disabled={!preferences.inapp_enabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Digest Frequency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Email Digest Frequency
                </CardTitle>
                <CardDescription>How often to receive email summaries</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={(value) => updatePreference('digest_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time (as they happen)</SelectItem>
                    <SelectItem value="daily">Daily digest</SelectItem>
                    <SelectItem value="weekly">Weekly digest</SelectItem>
                    <SelectItem value="never">Never send digests</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
