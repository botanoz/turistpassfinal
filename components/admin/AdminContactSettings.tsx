"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  Users,
  Star,
  Zap,
  Save,
  AlertCircle,
  CheckCircle2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Loader2
} from "lucide-react";
import {
  getAllSettings,
  updateSettings,
  type Setting
} from "@/lib/services/settingsService";

export default function AdminContactSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAllSettings();
      setSettings(data);

      // Initialize edited values with current values
      const initialValues: Record<string, string> = {};
      data.forEach(setting => {
        initialValues[setting.key] = setting.value;
      });
      setEditedValues(initialValues);
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Only send changed values
      const changedSettings: Record<string, string> = {};
      settings.forEach(setting => {
        if (editedValues[setting.key] !== setting.value) {
          changedSettings[setting.key] = editedValues[setting.key];
        }
      });

      if (Object.keys(changedSettings).length === 0) {
        setMessage({ type: 'success', text: 'No changes to save' });
        return;
      }

      await updateSettings(changedSettings);
      await loadSettings(); // Reload to get fresh data

      setMessage({
        type: 'success',
        text: `Successfully updated ${Object.keys(changedSettings).length} setting(s)`
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const getSettingsByPrefix = (prefix: string) => {
    return settings.filter(s => s.key.startsWith(prefix) && s.category === 'site');
  };

  const renderInput = (setting: Setting) => {
    const value = editedValues[setting.key] || '';

    if (setting.key.includes('description') || setting.key.includes('faq_')) {
      return (
        <Textarea
          id={setting.key}
          value={value}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          placeholder={setting.placeholder || ''}
          rows={3}
          className="resize-none"
        />
      );
    }

    return (
      <Input
        id={setting.key}
        type="text"
        value={value}
        onChange={(e) => handleChange(setting.key, e.target.value)}
        placeholder={setting.placeholder || ''}
      />
    );
  };

  const renderSettingCard = (setting: Setting, icon: React.ReactNode) => (
    <Card key={setting.key} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex-1">
            <CardTitle className="text-base">{setting.label}</CardTitle>
            {setting.description && (
              <CardDescription className="text-xs mt-1">
                {setting.description}
              </CardDescription>
            )}
          </div>
          {setting.is_required && (
            <Badge variant="destructive" className="text-xs">Required</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderInput(setting)}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading contact settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage contact information, office details, and support settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <Card className={message.type === 'success' ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {message.text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contact">
            <Phone className="h-4 w-4 mr-2" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="office">
            <MapPin className="h-4 w-4 mr-2" />
            Office
          </TabsTrigger>
          <TabsTrigger value="support">
            <Zap className="h-4 w-4 mr-2" />
            Support
          </TabsTrigger>
          <TabsTrigger value="social">
            <Users className="h-4 w-4 mr-2" />
            Social
          </TabsTrigger>
          <TabsTrigger value="other">
            <Star className="h-4 w-4 mr-2" />
            Other
          </TabsTrigger>
        </TabsList>

        {/* Contact Methods Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Methods</CardTitle>
              <CardDescription>
                Configure phone, email, and WhatsApp contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* WhatsApp Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  WhatsApp
                </h3>
                {getSettingsByPrefix('contact_whatsapp').map(setting =>
                  renderSettingCard(setting, <MessageCircle className="h-4 w-4 text-green-500" />)
                )}
                {settings.filter(s => s.key === 'social_whatsapp_url').map(setting =>
                  renderSettingCard(setting, <MessageCircle className="h-4 w-4 text-green-500" />)
                )}
              </div>

              {/* Phone Settings */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  Phone
                </h3>
                {getSettingsByPrefix('contact_phone').map(setting =>
                  renderSettingCard(setting, <Phone className="h-4 w-4 text-blue-500" />)
                )}
              </div>

              {/* Email Settings */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-500" />
                  Email
                </h3>
                {getSettingsByPrefix('contact_email').map(setting =>
                  renderSettingCard(setting, <Mail className="h-4 w-4 text-purple-500" />)
                )}
                {settings.filter(s => s.key === 'support_email').map(setting =>
                  renderSettingCard(setting, <Mail className="h-4 w-4 text-purple-500" />)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Office Information Tab */}
        <TabsContent value="office" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Office Information</CardTitle>
              <CardDescription>
                Configure office address, hours, and location details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('office_').map(setting =>
                renderSettingCard(setting, <MapPin className="h-4 w-4 text-primary" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Stats Tab */}
        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Statistics</CardTitle>
              <CardDescription>
                Configure support metrics and statistics displayed on the contact page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('support_').map(setting =>
                renderSettingCard(setting, <Zap className="h-4 w-4 text-orange-500" />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FAQ Answers</CardTitle>
              <CardDescription>
                Customize frequently asked questions answers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('faq_').map(setting =>
                renderSettingCard(setting, <AlertCircle className="h-4 w-4 text-blue-500" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Configure social media profile URLs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.filter(s => s.key.startsWith('social_') && s.key !== 'social_whatsapp_url').map(setting => {
                let icon = <Users className="h-4 w-4" />;
                if (setting.key.includes('facebook')) icon = <Facebook className="h-4 w-4 text-blue-600" />;
                else if (setting.key.includes('twitter')) icon = <Twitter className="h-4 w-4 text-sky-500" />;
                else if (setting.key.includes('instagram')) icon = <Instagram className="h-4 w-4 text-pink-500" />;
                else if (setting.key.includes('linkedin')) icon = <Linkedin className="h-4 w-4 text-blue-700" />;
                else if (setting.key.includes('youtube')) icon = <Youtube className="h-4 w-4 text-red-600" />;

                return renderSettingCard(setting, icon);
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Settings Tab */}
        <TabsContent value="other" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter Information</CardTitle>
              <CardDescription>
                Configure newsletter subscription section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('newsletter_').map(setting =>
                renderSettingCard(setting, <Mail className="h-4 w-4 text-indigo-500" />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
              <CardDescription>
                Configure brand tagline and description for footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('brand_').map(setting =>
                renderSettingCard(setting, <Star className="h-4 w-4 text-yellow-500" />)
              )}
              {settings.filter(s => s.key === 'site_name').map(setting =>
                renderSettingCard(setting, <Star className="h-4 w-4 text-yellow-500" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
