"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  User as UserIcon,
  Mail,
  Calendar,
  Ticket,
  Heart,
  DollarSign,
  ArrowLeft,
  Edit2,
  Save,
  X,
  Key,
  Settings
} from "lucide-react";
import Link from "next/link";
import type { User as LocalUser } from "@/lib/types/user";
import { toast } from "sonner";
import { authService } from "@/lib/services/authService";
import FavoritesSection from "./FavoritesSection";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const mapLocalPasses = (user: LocalUser) => {
  return (user.passes || []).map((pass) => ({
    id: pass.id,
    passId: pass.id,
    passName: pass.name,
    passType: "local",
    activationCode: `LOCAL-${pass.id}`,
    pinCode: "000000",
    expiryDate: pass.expiryDate,
    status: pass.status,
    purchasedAt: user.joinedDate,
    order: null
  }));
};

const hydrateFromLocalUser = (user: LocalUser) => {
    const stats = {
      totalPasses: user.passes?.length ?? 0,
      activePasses: user.passes?.filter((p) => p.status === "active").length ?? 0,
      totalSavings: user.totalSavings ?? 0
    };

    setProfile({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      avatar_url: user.avatar,
      joined_date: user.joinedDate,
      created_at: user.joinedDate,
      stats
    });

    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: ""
    });

    setPasses(mapLocalPasses(user));

    setFavoritesCount(user.favorites?.length ?? 0);
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);

        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;

        // Fetch profile
        const profileResponse = await fetch('/api/customer/profile');
        const profileResult = await profileResponse.json();

        if (profileResponse.status === 401) {
          if (localUser) {
            hydrateFromLocalUser(localUser);
            return;
          }
          router.push("/login?redirect=/profile");
          return;
        }

        if (!profileResult.success || !profileResult.profile) {
          if (localUser) {
            hydrateFromLocalUser(localUser);
            return;
          }
          throw new Error(profileResult.error || 'Failed to load profile');
        }

        setProfile(profileResult.profile);
        setFormData({
          firstName: profileResult.profile.first_name || "",
          lastName: profileResult.profile.last_name || "",
          email: profileResult.profile.email || "",
          phone: profileResult.profile.phone || ""
        });

        // Fetch recent passes
        const passesResponse = await fetch('/api/customer/passes');
        const passesResult = await passesResponse.json();
        if (passesResult.success) {
          setPasses(passesResult.passes || []);
        } else if (localUser) {
          setPasses(mapLocalPasses(localUser));
        }

        // Fetch favorites count
        const favoritesResponse = await fetch('/api/customer/favorites');
        if (favoritesResponse.ok) {
          const favoritesResult = await favoritesResponse.json();
          if (favoritesResult.success) {
            setFavoritesCount(favoritesResult.favorites?.length || 0);
          }
        } else if (localUser) {
          setFavoritesCount(localUser.favorites?.length ?? 0);
        }

      } catch (err: any) {
        console.error('Error loading profile:', err);
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        if (localUser) {
          hydrateFromLocalUser(localUser);
        } else {
          toast.error(err.message || 'Failed to load profile');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      email: profile.email || "",
      phone: profile.phone || ""
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email
        })
      });

      if (response.status === 401) {
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        if (localUser) {
          const updateResult = await authService.updateProfile({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email
          });
          if (updateResult.success && updateResult.user) {
            hydrateFromLocalUser(updateResult.user);
            toast.success("Profile updated locally");
            setIsEditing(false);
          } else {
            toast.error(updateResult.error || "Failed to update profile");
          }
          return;
        }
      }

      const result = await response.json();

      if (result.success && result.profile) {
        setProfile(result.profile);
        if (result.emailChangePending) {
          toast.info("Check your inbox to confirm the new email address.");
        }
        toast.success("Profile updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error("Failed to update profile");
    }
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

      const response = await fetch('/api/customer/change-password', {
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

  const getInitials = () => {
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    return firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : "U";
  };

  const stats = [
    {
      icon: Ticket,
      label: "Active Passes",
      value: profile.stats?.activePasses || 0,
      color: "text-blue-600"
    },
    {
      icon: Heart,
      label: "Favorites",
      value: favoritesCount,
      color: "text-red-600"
    },
    {
      icon: DollarSign,
      label: "Total Savings",
      value: `$${Number(profile.stats?.totalSavings || 0).toFixed(2)}`,
      color: "text-green-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} alt={`${profile.first_name} ${profile.last_name}`} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Member since {new Date(profile.joined_date || profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  <Link href="/profile/settings">
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Ayarlar
                    </Button>
                  </Link>
                  <Button onClick={handleEdit} variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
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
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isEditing ? (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.first_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.last_name}</span>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {passes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {passes.slice(0, 3).map((pass) => (
                  <div
                    key={pass.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{pass.passName}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(pass.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={pass.status === "active" ? "default" : "secondary"}>
                      {pass.status}
                    </Badge>
                  </div>
                ))}
                {passes.length > 3 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/my-passes">View All Passes</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorites Section */}
        <FavoritesSection />
      </div>
    </div>
  );
}
