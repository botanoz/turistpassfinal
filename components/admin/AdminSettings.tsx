"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Globe,
  Mail,
  CreditCard,
  Settings as SettingsIcon,
  Loader2,
  Save,
  Info,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Types
interface Setting {
  id: string;
  key: string;
  value: string;
  dataType: string;
  label: string;
  description: string;
  placeholder: string;
  isRequired: boolean;
  isPublic: boolean;
  category: string;
}

interface SettingsData {
  site?: Setting[];
  email?: Setting[];
  payment?: Setting[];
  general?: Setting[];
}

interface Stats {
  total: number;
  byCategory: {
    site: number;
    email: number;
    payment: number;
    general: number;
  };
}

export default function AdminSettings() {
  // State
  const [settings, setSettings] = useState<SettingsData>({});
  const [stats, setStats] = useState<Stats>({
    total: 0,
    byCategory: { site: 0, email: 0, payment: 0, general: 0 },
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("site");

  // Form state (current values)
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.settings || {});
      setStats(data.stats || { total: 0, byCategory: { site: 0, email: 0, payment: 0, general: 0 } });
      setIsSuperAdmin(data.isSuperAdmin || false);

      // Initialize form values
      const initialValues: Record<string, string> = {};
      Object.values(data.settings || {}).flat().forEach((setting: any) => {
        initialValues[setting.key] = setting.value || '';
      });
      setFormValues(initialValues);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle input change
  const handleChange = (key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can modify settings');
      return;
    }

    // Collect all changed settings
    const changedSettings: Array<{ key: string; value: string }> = [];

    Object.keys(formValues).forEach(key => {
      const allSettings = [
        ...(settings.site || []),
        ...(settings.email || []),
        ...(settings.payment || []),
        ...(settings.general || [])
      ];

      const originalSetting = allSettings.find(s => s.key === key);
      if (originalSetting && formValues[key] !== originalSetting.value) {
        changedSettings.push({
          key,
          value: formValues[key]
        });
      }
    });

    if (changedSettings.length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changedSettings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success(`Successfully updated ${changedSettings.length} settings`);
      setHasChanges(false);
      fetchSettings(); // Refresh
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Render setting input based on data type
  const renderSettingInput = (setting: Setting) => {
    const value = formValues[setting.key] || '';

    switch (setting.dataType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={value === 'true'}
              onCheckedChange={(checked) =>
                handleChange(setting.key, checked ? 'true' : 'false')
              }
              disabled={!isSuperAdmin}
            />
            <Label htmlFor={setting.key} className="cursor-pointer">
              {value === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );

      case 'number':
        return (
          <Input
            id={setting.key}
            type="number"
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            disabled={!isSuperAdmin}
          />
        );

      case 'json':
        return (
          <Textarea
            id={setting.key}
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            rows={6}
            disabled={!isSuperAdmin}
            className="font-mono text-sm"
          />
        );

      default: // string
        // Check if it's a sensitive field (password)
        const isSensitive = setting.key.includes('password') || setting.key.includes('secret') || setting.key.includes('key');
        const isLongText = setting.key.includes('message') || setting.key.includes('description');

        if (isLongText) {
          return (
            <Textarea
              id={setting.key}
              value={value}
              onChange={(e) => handleChange(setting.key, e.target.value)}
              placeholder={setting.placeholder}
              rows={3}
              disabled={!isSuperAdmin}
            />
          );
        }

        return (
          <Input
            id={setting.key}
            type={isSensitive ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            disabled={!isSuperAdmin}
          />
        );
    }
  };

  // Render settings group
  const renderSettingsGroup = (settingsArray: Setting[]) => {
    if (!settingsArray || settingsArray.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No settings in this category</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {settingsArray.map((setting) => (
          <div key={setting.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={setting.key}>
                {setting.label}
                {setting.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {setting.isPublic && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>

            {setting.description && (
              <p className="text-sm text-muted-foreground">
                {setting.description}
              </p>
            )}

            {renderSettingInput(setting)}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system-wide configuration and preferences
          </p>
        </div>

        {hasChanges && isSuperAdmin && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Permission Alert */}
      {!isSuperAdmin && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You are viewing settings in read-only mode. Only super administrators can modify settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Settings</CardTitle>
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Settings</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.site}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Settings</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Settings</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byCategory.payment}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Manage settings by category. Changes are saved when you click "Save Changes".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="site" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Site</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payment</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="site" className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">Site Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure your website's basic information, contact details, and social media links.
                      Settings marked as "Public" are visible to all visitors.
                    </p>
                  </div>
                </div>
                {renderSettingsGroup(settings.site || [])}
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">Email Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure SMTP settings for sending transactional emails. These settings are kept private.
                      Make sure to use valid SMTP credentials.
                    </p>
                  </div>
                </div>
                {renderSettingsGroup(settings.email || [])}
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">Payment Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure payment gateway settings. Always use test mode during development.
                      API keys and secrets are encrypted and kept secure.
                    </p>
                  </div>
                </div>
                {renderSettingsGroup(settings.payment || [])}
              </TabsContent>

              <TabsContent value="general" className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">General Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure general application settings like timezone, date formats, and maintenance mode.
                    </p>
                  </div>
                </div>
                {renderSettingsGroup(settings.general || [])}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Floating save button for mobile */}
      {hasChanges && isSuperAdmin && (
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button size="lg" onClick={handleSave} disabled={isSaving} className="rounded-full shadow-lg">
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
