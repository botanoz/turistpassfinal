'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Globe,
  DollarSign,
  Bell,
  Lock,
  Smartphone,
  Mail,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getCurrencyFlag } from '@/lib/utils/currency';

interface Preferences {
  language: string;
  currency: string;
  notifications: {
    email_marketing: boolean;
    email_updates: boolean;
    email_offers: boolean;
    sms_marketing: boolean;
    sms_reminders: boolean;
    push_notifications: boolean;
  };
  phone: string;
}

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    language: 'tr',
    currency: 'TRY',
    notifications: {
      email_marketing: true,
      email_updates: true,
      email_offers: true,
      sms_marketing: false,
      sms_reminders: true,
      push_notifications: true,
    },
    phone: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/preferences');
      const data = await response.json();

      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ayarlar kaydedildi');

        // If currency changed, update localStorage and reload
        if (data.preferences.currency) {
          localStorage.setItem('selectedCurrency', data.preferences.currency);
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch('/api/customer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Şifre başarıyla değiştirildi');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(data.error || 'Şifre değiştirilemedi');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Şifre değiştirilemedi');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Profil'e Dön
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">
          Dil, para birimi ve bildirim tercihlerinizi yönetin
        </p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">
            <Settings className="w-4 h-4 mr-2" />
            Tercihler
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Bildirimler
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Güvenlik
          </TabsTrigger>
        </TabsList>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Dil Tercihi
              </CardTitle>
              <CardDescription>
                Uygulamada kullanılacak dili seçin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="language">Dil</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, language: value })
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Para Birimi
              </CardTitle>
              <CardDescription>
                Fiyatların gösterileceği para birimini seçin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="currency">Para Birimi</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, currency: value })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">{getCurrencyFlag('TRY')} Turkish Lira (₺)</SelectItem>
                    <SelectItem value="USD">{getCurrencyFlag('USD')} US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">{getCurrencyFlag('EUR')} Euro (€)</SelectItem>
                    <SelectItem value="GBP">{getCurrencyFlag('GBP')} British Pound (£)</SelectItem>
                    <SelectItem value="JPY">{getCurrencyFlag('JPY')} Japanese Yen (¥)</SelectItem>
                  </SelectContent>
                </Select>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Para birimi değiştirildiğinde sayfa yeniden yüklenecektir.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                İletişim Bilgileri
              </CardTitle>
              <CardDescription>
                SMS bildirimleri için telefon numaranızı güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon Numarası</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+90 5XX XXX XX XX"
                  value={preferences.phone}
                  onChange={(e) =>
                    setPreferences({ ...preferences, phone: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                E-posta Bildirimleri
              </CardTitle>
              <CardDescription>
                Hangi e-posta bildirimlerini almak istediğinizi seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Kampanya E-postaları</Label>
                  <p className="text-sm text-muted-foreground">
                    Özel indirimler ve kampanyalar hakkında bildirim alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.email_marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        email_marketing: checked,
                      },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sistem Güncellemeleri</Label>
                  <p className="text-sm text-muted-foreground">
                    Pass ve rezervasyon durumları hakkında bildirim alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.email_updates}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        email_updates: checked,
                      },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Özel Teklifler</Label>
                  <p className="text-sm text-muted-foreground">
                    Size özel hazırlanmış teklifler hakkında bildirim alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.email_offers}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        email_offers: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                SMS Bildirimleri
              </CardTitle>
              <CardDescription>
                SMS ile bildirim almak istediğiniz durumları seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pazarlama SMS'leri</Label>
                  <p className="text-sm text-muted-foreground">
                    Kampanya ve özel teklifler için SMS alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.sms_marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        sms_marketing: checked,
                      },
                    })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hatırlatma SMS'leri</Label>
                  <p className="text-sm text-muted-foreground">
                    Pass bitiş tarihi ve önemli hatırlatmalar için SMS alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.sms_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        sms_reminders: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Bildirimleri
              </CardTitle>
              <CardDescription>
                Mobil uygulama bildirimleri (yakında)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Bildirimleri</Label>
                  <p className="text-sm text-muted-foreground">
                    Mobil uygulama üzerinden bildirim alın
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.push_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        push_notifications: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Şifre Değiştir
              </CardTitle>
              <CardDescription>
                Hesap güvenliğiniz için güçlü bir şifre kullanın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Yeni Şifre</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  En az 8 karakter uzunluğunda olmalıdır
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Şifrenizi değiştirdikten sonra tüm cihazlardan çıkış yapmanız gerekebilir.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="w-full"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Değiştiriliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Şifreyi Değiştir
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
