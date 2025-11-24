"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Save,
  Mail,
  Phone,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  ImageIcon,
  Wifi,
  CreditCard,
  Car,
  Calendar,
  Utensils,
  Building2,
  Key,
} from "lucide-react";
import Image from "next/image";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";

type ProfileResponse = {
  success: boolean;
  error?: string;
  account: {
    metadata?: Record<string, any>;
  };
  business: {
    id: string;
    name: string | null;
    category: string | null;
    description: string | null;
    short_description: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website: string | null;
  };
};

const defaultHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "10:00", close: "18:00", closed: false },
  sunday: { open: "10:00", close: "16:00", closed: true },
};

const defaultFeatures = {
  wifi: false,
  parking: false,
  creditCard: false,
  reservation: false,
  delivery: false,
  terrace: false,
};

export default function BusinessProfile() {
  const { loading } = useBusinessContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [businessName, setBusinessName] = useState<string>("My Venue");
  const [category, setCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    shortDescription: "",
    offerDescription: "",
    discount: "",
    priceRange: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    district: "",
    contactName: "",
  });

  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    facebook: "",
  });

  const [openHours, setOpenHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    defaultHours,
  );
  const [features, setFeatures] = useState<Record<string, boolean>>(defaultFeatures);
  const [tags, setTags] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const featuresList = useMemo(
    () => [
      { key: "wifi", label: "WiFi", icon: Wifi },
      { key: "parking", label: "Parking", icon: Car },
      { key: "creditCard", label: "Credit Card", icon: CreditCard },
      { key: "reservation", label: "Reservation", icon: Calendar },
      { key: "delivery", label: "Delivery", icon: Utensils },
      { key: "terrace", label: "Terrace", icon: Building2 },
    ],
    [],
  );

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/business/profile");
      const result: ProfileResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error || "Failed to load profile");
      }

      const { business, account } = result;
      const profileMeta = account.metadata?.profile ?? {};

      setBusinessId(business.id);
      setBusinessName(business.name ?? "My Venue");
      setCategory(business.category ?? null);
      setFormData({
        description: business.description ?? "",
        shortDescription: business.short_description ?? "",
        offerDescription: profileMeta.offerDescription ?? "",
        discount: profileMeta.discount ?? "",
        priceRange: profileMeta.priceRange ?? "",
        email: business.contact_email ?? "",
        phone: business.contact_phone ?? "",
        website: business.website ?? "",
        address: business.address ?? "",
        city: business.city ?? "",
        district: business.district ?? "",
        contactName: business.contact_name ?? "",
      });
      setSocialLinks({
        instagram: profileMeta.instagram ?? "",
        facebook: profileMeta.facebook ?? "",
      });
      setOpenHours(profileMeta.openHours ?? defaultHours);
      setFeatures({ ...defaultFeatures, ...(profileMeta.features ?? {}) });
      setTags(profileMeta.tags ?? []);
      setAmenities(profileMeta.amenities ?? []);
      setImages(profileMeta.images ?? []);
    } catch (error: any) {
      console.error("Failed to load profile", error);
      toast.error(error.message ?? "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      loadProfile();
    }
  }, [loading, loadProfile]);

  const updateHours = (day: string, field: "open" | "close", value: string) => {
    setOpenHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const toggleDay = (day: string) => {
    setOpenHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed },
    }));
  };

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleChangePassword = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    try {
      setIsChangingPassword(true);

      const response = await fetch('/api/business/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Password changed successfully");
        setIsPasswordDialogOpen(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (err: any) {
      console.error('Error changing password:', err);
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleMetadataSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/business/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          shortDescription: formData.shortDescription,
          contactName: formData.contactName,
          contactEmail: formData.email,
          contactPhone: formData.phone,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          website: formData.website,
          metadata: {
            offerDescription: formData.offerDescription,
            discount: formData.discount,
            priceRange: formData.priceRange,
            instagram: socialLinks.instagram,
            facebook: socialLinks.facebook,
            openHours,
            features,
            tags,
            amenities,
            images,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save profile");
      }

      toast.success("Profile updated successfully");
      await loadProfile();
    } catch (error: any) {
      console.error("Failed to save business profile", error);
      toast.error(error.message ?? "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Venue</h2>
          <p className="text-muted-foreground">Manage your venue information</p>
        </div>
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Venue Name</label>
                  <Input value={businessName} readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={category ?? "Uncategorised"} readOnly />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Short Description</label>
                <Textarea
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Offer Description</label>
                  <Textarea
                    value={formData.offerDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, offerDescription: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Discount</label>
                    <Input
                      value={formData.discount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discount: e.target.value }))}
                      placeholder="e.g., 20% off"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Price Range</label>
                    <Input
                      value={formData.priceRange}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, priceRange: e.target.value }))
                      }
                      placeholder="e.g., $$"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Contact Name</label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, website: e.target.value }))
                      }
                      className="pl-10"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">District</label>
                    <Input
                      value={formData.district}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, district: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({ ...prev, instagram: e.target.value }))
                    }
                    className="pl-10"
                    placeholder="@yourbusiness"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Facebook</label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={socialLinks.facebook}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({ ...prev, facebook: e.target.value }))
                    }
                    className="pl-10"
                    placeholder="/yourbusiness"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleMetadataSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gallery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {images.map((url, idx) => (
                  <ImageUpload
                    key={idx}
                    label={`Image ${idx + 1}`}
                    value={url}
                    onChange={(next) => {
                      setImages((prev) => {
                        const clone = [...prev];
                        clone[idx] = next;
                        return clone;
                      });
                    }}
                    bucket="business-images"
                    folder={businessId || undefined}
                    uploadEndpoint="/api/business/upload"
                    previewHeight="180px"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImages((prev) => [...prev, ""])}
                >
                  Add Image
                </Button>
                {images.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setImages((prev) => prev.slice(0, -1))}
                  >
                    Remove Last
                  </Button>
                )}
                <Button onClick={handleMetadataSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Gallery"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Opening Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map((day) => {
                const hours = openHours[day as keyof typeof openHours] ?? {
                  open: "09:00",
                  close: "18:00",
                  closed: false,
                };
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-32 capitalize font-medium">{day}</div>
                    <Switch checked={!hours.closed} onCheckedChange={() => toggleDay(day)} />
                    {!hours.closed ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateHours(day, "open", e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateHours(day, "close", e.target.value)}
                          className="w-32"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Closed</span>
                    )}
                  </div>
                );
              })}
              <Button onClick={handleMetadataSave} disabled={isSaving} className="w-full mt-4">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Hours"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {featuresList.map((feature) => (
                  <div key={feature.key} className="flex items-center gap-3 p-3 rounded-lg border">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="flex-1">{feature.label}</span>
                    <Switch
                      checked={features[feature.key as keyof typeof features]}
                      onCheckedChange={() => toggleFeature(feature.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Add tags separated by commas"
                value={tags.join(", ")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  )
                }
              />
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Badge key={`${tag}-${idx}`} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Add amenities separated by commas"
                value={amenities.join(", ")}
                onChange={(e) =>
                  setAmenities(
                    e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
              />
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, idx) => (
                  <Badge key={`${amenity}-${idx}`} variant="outline">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleMetadataSave} disabled={isSaving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Features"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
