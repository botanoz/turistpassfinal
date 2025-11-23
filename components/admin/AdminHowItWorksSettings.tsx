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
  PlayCircle,
  Film,
  ListOrdered,
  BarChart3,
  Star,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Shield,
  Heart,
  Sparkles
} from "lucide-react";
import {
  getAllSettings,
  updateSettings,
  type Setting
} from "@/lib/services/settingsService";

export default function AdminHowItWorksSettings() {
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

    if (setting.key.includes('description') || setting.key.includes('subtitle')) {
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
    <div key={setting.key} className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <Label htmlFor={setting.key} className="text-sm font-medium">
          {setting.label}
        </Label>
        {setting.is_required && (
          <Badge variant="destructive" className="text-xs">Required</Badge>
        )}
      </div>
      {setting.description && (
        <p className="text-xs text-muted-foreground">{setting.description}</p>
      )}
      {renderInput(setting)}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading How It Works settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">How It Works Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage How It Works section content, videos, and step information
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
      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hero">
            <PlayCircle className="h-4 w-4 mr-2" />
            Hero & Video
          </TabsTrigger>
          <TabsTrigger value="steps">
            <ListOrdered className="h-4 w-4 mr-2" />
            Steps
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="benefits">
            <Star className="h-4 w-4 mr-2" />
            Benefits
          </TabsTrigger>
          <TabsTrigger value="cta">
            <Zap className="h-4 w-4 mr-2" />
            CTA
          </TabsTrigger>
        </TabsList>

        {/* Hero & Video Tab */}
        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>
                Main title and subtitle for How It Works section on homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('howitworks_hero_').map(setting =>
                renderSettingCard(setting, <PlayCircle className="h-4 w-4 text-primary" />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Page Hero</CardTitle>
              <CardDescription>
                Title and subtitle for detailed How It Works page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('howitworks_detailed_').map(setting =>
                renderSettingCard(setting, <PlayCircle className="h-4 w-4 text-blue-500" />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overview Video</CardTitle>
              <CardDescription>
                Main overview video settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('howitworks_overview_').map(setting =>
                renderSettingCard(setting, <Film className="h-4 w-4 text-purple-500" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="space-y-4">
          {[1, 2, 3, 4].map(stepNum => (
            <Card key={stepNum}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {stepNum}
                  </div>
                  Step {stepNum}
                </CardTitle>
                <CardDescription>
                  Configure title, description, and video for step {stepNum}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {getSettingsByPrefix(`howitworks_step${stepNum}_`).map(setting =>
                  renderSettingCard(setting, <ListOrdered className="h-4 w-4 text-orange-500" />)
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Statistics</CardTitle>
              <CardDescription>
                Configure the 4 quick stats displayed on the detailed page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Locations */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Partner Locations
                  </h3>
                  {settings.filter(s => s.key.includes('stat_locations')).map(setting =>
                    renderSettingCard(setting, <BarChart3 className="h-4 w-4 text-blue-500" />)
                  )}
                </div>

                {/* Customers */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    Happy Customers
                  </h3>
                  {settings.filter(s => s.key.includes('stat_customers')).map(setting =>
                    renderSettingCard(setting, <BarChart3 className="h-4 w-4 text-green-500" />)
                  )}
                </div>

                {/* Savings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Total Savings
                  </h3>
                  {settings.filter(s => s.key.includes('stat_savings')).map(setting =>
                    renderSettingCard(setting, <BarChart3 className="h-4 w-4 text-purple-500" />)
                  )}
                </div>

                {/* Rating */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Customer Rating
                  </h3>
                  {settings.filter(s => s.key.includes('stat_rating')).map(setting =>
                    renderSettingCard(setting, <Star className="h-4 w-4 text-yellow-500" />)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benefits Section</CardTitle>
              <CardDescription>
                Configure the 4 benefits displayed on the detailed page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Benefit 1 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Benefit 1
                  </h3>
                  {settings.filter(s => s.key.includes('benefit1')).map(setting =>
                    renderSettingCard(setting, <Zap className="h-4 w-4 text-orange-500" />)
                  )}
                </div>

                {/* Benefit 2 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Benefit 2
                  </h3>
                  {settings.filter(s => s.key.includes('benefit2')).map(setting =>
                    renderSettingCard(setting, <Shield className="h-4 w-4 text-blue-500" />)
                  )}
                </div>

                {/* Benefit 3 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Benefit 3
                  </h3>
                  {settings.filter(s => s.key.includes('benefit3')).map(setting =>
                    renderSettingCard(setting, <Heart className="h-4 w-4 text-pink-500" />)
                  )}
                </div>

                {/* Benefit 4 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Benefit 4
                  </h3>
                  {settings.filter(s => s.key.includes('benefit4')).map(setting =>
                    renderSettingCard(setting, <Sparkles className="h-4 w-4 text-purple-500" />)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CTA Tab */}
        <TabsContent value="cta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call-to-Action Section</CardTitle>
              <CardDescription>
                Configure the CTA section at the bottom of the detailed page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByPrefix('howitworks_cta_').map(setting =>
                renderSettingCard(setting, <Zap className="h-4 w-4 text-primary" />)
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
