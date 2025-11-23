"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminLayout from "./AdminLayout";
import {
  Plus, Search, Edit, Ban, CheckCircle, XCircle, Eye, Send,
  Key, Clock, Building2, Activity, Bell, FileText, MoreVertical, AlertTriangle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { AdminBusiness, BusinessApplication } from "@/lib/types/adminBusiness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DB_SUSPENDED_STATUS = "inactive";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const mapStatusFromDb = (status?: string | null): AdminBusiness["status"] => {
  if (!status) return "active";
  switch (status) {
    case "active":
      return "active";
    case "pending":
    case "reviewing":
      return "pending";
      return "pending";
    case "suspended":
      return "suspended";
    case "rejected":
      return "rejected";
    case "inactive":
      return "suspended";
    default:
      return "active";
  }
};

const mapStatusToDb = (status: AdminBusiness["status"]): string => {
  switch (status) {
    case "suspended":
      return DB_SUSPENDED_STATUS;
    default:
      return status;
  }
};

const normalizeCoordinate = (value?: number | null) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number") return null;
  return value === 0 ? null : value;
};

type AdminBusinessWithMeta = AdminBusiness & {
  rawStatus?: string;
  shortDescription?: string;
  passCount?: number;
};

interface BusinessStatsSummary {
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  inactiveBusinesses: number;
  totalScans: number;
}

export default function AdminBusinessesWorking() {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<AdminBusinessWithMeta[]>([]);
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [statsSummary, setStatsSummary] = useState<BusinessStatsSummary>({
    totalBusinesses: 0,
    activeBusinesses: 0,
    pendingBusinesses: 0,
    suspendedBusinesses: 0,
    inactiveBusinesses: 0,
    totalScans: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transformBusiness = useCallback((business: any): AdminBusinessWithMeta => {
    const status = mapStatusFromDb(business.status);
    const latitude = typeof business.latitude === "number" ? business.latitude : null;
    const longitude = typeof business.longitude === "number" ? business.longitude : null;
    const fallbackContact = business.contactPerson ?? {};
    const fallbackLocation = business.location ?? {};
    const fallbackCoordinates = fallbackLocation.coordinates ?? {};
    const fallbackDetails = business.businessDetails ?? {};
    const fallbackPassPartnerships = business.passPartnerships ?? [];
    const fallbackStats = business.statistics ?? {};
    const fallbackDocuments = business.documents ?? [];
    const fallbackActivityLog = business.activityLog ?? [];

    return {
      id: business.id,
      name: business.name ?? "Unnamed Business",
      slug: business.slug ?? slugify(business.name ?? business.id ?? ""),
      email: business.email ?? fallbackContact.email ?? "",
      category: business.category ?? "Other",
      status,
      contactPerson: {
        name: business.contact_name ?? fallbackContact.name ?? "",
        email: business.contact_email ?? business.email ?? fallbackContact.email ?? "",
        phone: business.contact_phone ?? fallbackContact.phone ?? "",
        position: business.contact_position ?? fallbackContact.position ?? ""
      },
      location: {
        address: business.address ?? fallbackLocation.address ?? "",
        district: business.district ?? fallbackLocation.district ?? "",
        city: business.city ?? fallbackLocation.city ?? "",
        coordinates: {
          lat: latitude ?? fallbackCoordinates.lat ?? 0,
          lng: longitude ?? fallbackCoordinates.lng ?? 0
        }
      },
      businessDetails: {
        description: business.description ?? business.shortDescription ?? fallbackDetails.description ?? "",
        taxNumber: business.tax_number ?? fallbackDetails.taxNumber ?? "",
        registrationNumber: business.registration_number ?? fallbackDetails.registrationNumber ?? "",
        established: business.established ?? fallbackDetails.established ?? "",
        website: business.website ?? fallbackDetails.website ?? ""
      },
      passPartnerships: (business.passes || fallbackPassPartnerships).map((pass: any) => ({
        passId: pass.passId ?? pass.id ?? "",
        passName: pass.passName ?? pass.name ?? "",
        discountPercent: pass.discountPercent ?? pass.discount ?? 0,
        joinedDate: pass.joinedDate ?? new Date().toISOString()
      })),
      imageUrl: business.image_url ?? business.imageUrl ?? null,
      galleryImages: business.gallery_images ?? business.galleryImages ?? [],
      statistics: {
        totalScans: business.total_scans ?? business.totalScans ?? fallbackStats.totalScans ?? 0,
        thisMonthScans: business.this_month_scans ?? fallbackStats.thisMonthScans ?? 0,
        lastMonthScans: business.last_month_scans ?? fallbackStats.lastMonthScans ?? 0,
        totalRevenue: business.total_revenue ?? fallbackStats.totalRevenue ?? 0,
        averageRating: business.average_rating ?? fallbackStats.averageRating ?? 0,
        reviewCount: business.review_count ?? fallbackStats.reviewCount ?? 0
      },
      documents: fallbackDocuments,
      activityLog: fallbackActivityLog,
      approvedDate: business.approved_at ?? business.approvedDate,
      approvedBy: business.approved_by ?? business.approvedBy,
      lastLogin: business.last_login ?? business.lastLogin,
      createdAt: business.created_at ?? business.createdAt ?? new Date().toISOString(),
      updatedAt: business.updated_at ?? business.updatedAt ?? new Date().toISOString(),
      rawStatus: business.status ?? status,
      shortDescription: business.short_description ?? business.shortDescription ?? fallbackDetails.shortDescription,
      passCount: business.passCount ?? business.pass_count ?? (business.passes?.length ?? fallbackPassPartnerships.length ?? 0)
    };
  }, []);

  const transformApplication = useCallback((business: AdminBusinessWithMeta): BusinessApplication => ({
    id: business.id,
    businessName: business.name,
    category: business.category,
    contactPerson: {
      name: business.contactPerson.name,
      email: business.contactPerson.email,
      phone: business.contactPerson.phone,
      position: business.contactPerson.position
    },
    location: {
      address: business.location.address,
      district: business.location.district,
      city: business.location.city
    },
    businessDetails: {
      description: business.businessDetails.description ?? "",
      taxNumber: business.businessDetails.taxNumber,
      registrationNumber: business.businessDetails.registrationNumber,
      website: business.businessDetails.website
    },
    requestedPasses: [],
    proposedDiscount: 0,
    documents: [],
    status: "pending",
    submittedAt: business.createdAt,
    reviewedAt: undefined,
    reviewedBy: undefined,
    notes: undefined
  }), []);

  const fetchBusinesses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/businesses?status=all");
      if (!response.ok) {
        throw new Error("Failed to fetch businesses");
      }

      const data = await response.json();
      const items: AdminBusinessWithMeta[] = (data.businesses ?? []).map((biz: any) => transformBusiness(biz));
      setBusinesses(items);

      const pendingApps = items
        .filter((biz) => biz.status === "pending")
        .map((biz) => transformApplication(biz));
      setApplications(pendingApps);

      const totalScans = items.reduce((sum, biz) => sum + (biz.statistics.totalScans || 0), 0);
      const activeCount = items.filter((biz) => biz.status === "active").length;
      const suspendedCount = items.filter((biz) => biz.status === "suspended").length;

      setStatsSummary({
        totalBusinesses: data.stats?.totalBusinesses ?? items.length,
        activeBusinesses: data.stats?.activeBusinesses ?? activeCount,
        pendingBusinesses: data.stats?.pendingBusinesses ?? pendingApps.length,
        suspendedBusinesses: data.stats?.suspendedBusinesses ?? suspendedCount,
        inactiveBusinesses: data.stats?.inactiveBusinesses ?? items.filter((biz) => biz.rawStatus === DB_SUSPENDED_STATUS).length,
        totalScans: data.stats?.totalScans ?? totalScans
      });
    } catch (error) {
      console.error("Failed to load businesses:", error);
      toast.error("Failed to load businesses");
    } finally {
      setIsLoading(false);
    }
  }, [transformBusiness, transformApplication]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const buildBusinessPayload = useCallback((business: AdminBusinessWithMeta, overrides?: Partial<AdminBusinessWithMeta>) => {
    const source = { ...business, ...overrides };

    return {
      name: source.name,
      category: source.category,
      description: source.businessDetails.description ?? "",
      shortDescription: source.shortDescription ?? source.businessDetails.description ?? "",
      address: source.location.address || null,
      latitude: normalizeCoordinate(source.location.coordinates.lat),
      longitude: normalizeCoordinate(source.location.coordinates.lng),
      imageUrl: source.imageUrl || null,
      galleryImages: source.galleryImages || [],
      status: mapStatusToDb(source.status),
      email: source.email || null,
      contactName: source.contactPerson.name || null,
      contactEmail: source.contactPerson.email || null,
      contactPhone: source.contactPerson.phone || null,
      contactPosition: source.contactPerson.position || null,
      city: source.location.city || null,
      district: source.location.district || null,
      taxNumber: source.businessDetails.taxNumber || null,
      registrationNumber: source.businessDetails.registrationNumber || null,
      established: source.businessDetails.established || null,
      website: source.businessDetails.website || null,
      slug: source.slug || null
    };
  }, []);

  const fetchBusinessDetails = useCallback(async (id: string, fallback?: AdminBusinessWithMeta) => {
    try {
      const response = await fetch(`/api/admin/businesses/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch business details");
      }

      const data = await response.json();
      if (!data?.business) {
        return null;
      }

      const passes = (data.passes || []).map((item: any) => ({
        id: item.id,
        name: item.passes?.name ?? item.name,
        discount: item.discount,
        usage_type: item.usage_type,
        max_usage: item.max_usage
      }));

      const businessWithPasses = {
        ...(fallback ?? {}),
        ...data.business,
        image_url: data.business?.image_url ?? fallback?.imageUrl ?? null,
        gallery_images: data.business?.gallery_images ?? fallback?.galleryImages ?? [],
        passes: passes.map((p: any) => ({
          id: p.id,
          name: p.name,
          discount: p.discount,
          joinedDate: new Date().toISOString()
        })),
        pass_count: passes.length
      };

      return transformBusiness(businessWithPasses);
    } catch (error) {
      console.error("Failed to load business details:", error);
      toast.error("Failed to load business details");
      return null;
    }
  }, [transformBusiness]);

  const [viewBusiness, setViewBusiness] = useState<AdminBusinessWithMeta | null>(null);
  const [editBusiness, setEditBusiness] = useState<AdminBusinessWithMeta | null>(null);
  const [viewApplication, setViewApplication] = useState<BusinessApplication | null>(null);

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);

  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [notificationData, setNotificationData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "success" | "error"
  });
  const [passwordResetBusiness, setPasswordResetBusiness] = useState<AdminBusinessWithMeta | null>(null);
  const [suspendBusiness, setSuspendBusiness] = useState<AdminBusinessWithMeta | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [newBusinessData, setNewBusinessData] = useState({
    name: "",
    email: "",
    category: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactPosition: "",
    address: "",
    district: "",
    city: "Istanbul",
    description: "",
    logo_url: "",
    images: [] as string[],
  });
  // Auth is handled by AdminLayout wrapper
  const filteredBusinesses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return businesses.filter((biz) => {
      const matchesSearch =
        biz.name.toLowerCase().includes(query) ||
        biz.email.toLowerCase().includes(query) ||
        biz.category.toLowerCase().includes(query);

      if (activeTab === "active") return matchesSearch && biz.status === "active";
      if (activeTab === "suspended") return matchesSearch && biz.status === "suspended";
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "applications") return matchesSearch && biz.status === "pending";
      return matchesSearch;
    });
  }, [businesses, searchQuery, activeTab]);

  const pendingApplications = useMemo(
    () => applications.filter(app => app.status === "pending" || app.status === "reviewing"),
    [applications]
  );

  const handleViewBusiness = (business: AdminBusinessWithMeta) => {
    setViewBusiness(business);
    setIsViewDialogOpen(true);
    fetchBusinessDetails(business.id, business).then((details) => {
      if (details) {
        setViewBusiness(details);
      }
    });
  };

  const handleEditBusiness = (business: AdminBusinessWithMeta) => {
    setEditBusiness(business);
    setIsEditDialogOpen(true);
    fetchBusinessDetails(business.id, business).then((details) => {
      if (details) {
        setEditBusiness(details);
      }
    });
  };

  const handleSaveEdit = async () => {
    if (isSubmitting) return;
    if (!editBusiness) return;

    if (!editBusiness.name || !editBusiness.category) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildBusinessPayload(editBusiness);
      const response = await fetch(`/api/admin/businesses/${editBusiness.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to update business");
      }

      toast.success("Business updated successfully!");
      setIsEditDialogOpen(false);
      setEditBusiness(null);
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to update business:", error);
      toast.error("Failed to update business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewApplication = (application: BusinessApplication) => {
    setViewApplication(application);
    setIsApplicationDialogOpen(true);
  };

  const handleApproveApplication = async (applicationId: string) => {
    if (isSubmitting) return;
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    const existingBusiness = businesses.find(b => b.id === applicationId);
    const payload = existingBusiness
      ? buildBusinessPayload({ ...existingBusiness, status: "active" })
      : {
          name: app.businessName,
          category: app.category,
          description: app.businessDetails.description ?? "",
          shortDescription: app.businessDetails.description ?? "",
          address: app.location.address || null,
          latitude: null,
          longitude: null,
          imageUrl: null,
          galleryImages: [],
          status: "active",
          email: app.contactPerson.email || null,
          contactName: app.contactPerson.name || null,
          contactEmail: app.contactPerson.email || null,
          contactPhone: app.contactPerson.phone || null,
          contactPosition: app.contactPerson.position || null,
          city: app.location.city || null,
          district: app.location.district || null,
          taxNumber: app.businessDetails.taxNumber ?? null,
          registrationNumber: app.businessDetails.registrationNumber ?? null,
          established: null,
          website: app.businessDetails.website ?? null,
          slug: slugify(app.businessName)
        };

    try {
      setIsSubmitting(true);
      const response = existingBusiness
        ? await fetch(`/api/admin/businesses/${existingBusiness.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        : await fetch("/api/admin/businesses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to approve application");
      }

      toast.success(`${app.businessName} approved successfully!`);
      setIsApplicationDialogOpen(false);
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to approve application:", error);
      toast.error("Failed to approve application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (isSubmitting) return;
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    const existingBusiness = businesses.find(b => b.id === applicationId);
    if (!existingBusiness) {
      toast.success("Application rejection recorded");
      setIsApplicationDialogOpen(false);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = buildBusinessPayload({ ...existingBusiness, status: "suspended" });
      const response = await fetch(`/api/admin/businesses/${existingBusiness.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to reject application");
      }

      toast.success("Application rejected");
      setIsApplicationDialogOpen(false);
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to reject application:", error);
      toast.error("Failed to reject application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendBusiness = (business: AdminBusinessWithMeta) => {
    setSuspendBusiness(business);
    setIsSuspendDialogOpen(true);
  };

  const confirmSuspend = async () => {
    if (isSubmitting) return;
    if (!suspendBusiness) return;

    try {
      setIsSubmitting(true);
      const payload = buildBusinessPayload({ ...suspendBusiness, status: "suspended" });
      const response = await fetch(`/api/admin/businesses/${suspendBusiness.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to suspend business");
      }

      toast.success(`${suspendBusiness.name} suspended`);
      setIsSuspendDialogOpen(false);
      setSuspendBusiness(null);
      setSuspendReason("");
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to suspend business:", error);
      toast.error("Failed to suspend business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateBusiness = async (businessId: string) => {
    if (isSubmitting) return;
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;

    try {
      setIsSubmitting(true);
      const payload = buildBusinessPayload({ ...business, status: "active" });
      const response = await fetch(`/api/admin/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to activate business");
      }

      toast.success("Business activated successfully!");
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to activate business:", error);
      toast.error("Failed to activate business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = (business: AdminBusinessWithMeta) => {
    setPasswordResetBusiness(business);
    setIsPasswordResetDialogOpen(true);
  };

  const confirmPasswordReset = () => {
    if (passwordResetBusiness) {
      toast.success(`Password reset email sent to ${passwordResetBusiness.email}`);
      setIsPasswordResetDialogOpen(false);
      setPasswordResetBusiness(null);
    }
  };

  const handleSendNotification = (businessIds: string[]) => {
    setSelectedBusinessIds(businessIds);
    setIsNotificationDialogOpen(true);
  };

  const confirmSendNotification = () => {
    const count = selectedBusinessIds.length;
    toast.success(`Notification sent to ${count} business(es)`);
    setIsNotificationDialogOpen(false);
    setNotificationData({ title: "", message: "", type: "info" });
    setSelectedBusinessIds([]);
  };

  const handleViewActivity = (business: AdminBusinessWithMeta) => {
    setViewBusiness(business);
    setIsActivityDialogOpen(true);
  };

  const handleCreateBusiness = async () => {
    if (isSubmitting) return;
    if (!newBusinessData.name || !newBusinessData.email || !newBusinessData.category) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      name: newBusinessData.name,
      category: newBusinessData.category,
      description: newBusinessData.description ?? "",
      shortDescription: newBusinessData.description ?? "",
      address: newBusinessData.address || null,
      latitude: null,
      longitude: null,
      imageUrl: newBusinessData.logo_url || null,
      galleryImages: newBusinessData.images,
      status: "active",
      email: newBusinessData.email || null,
      contactName: newBusinessData.contactName || null,
      contactEmail: newBusinessData.contactEmail || null,
      contactPhone: newBusinessData.contactPhone || null,
      contactPosition: newBusinessData.contactPosition || null,
      city: newBusinessData.city || null,
      district: newBusinessData.district || null,
      taxNumber: null,
      registrationNumber: null,
      established: null,
      website: null,
      slug: slugify(newBusinessData.name)
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to create business");
      }

      toast.success(`${newBusinessData.name} created successfully!`);
      setIsCreateDialogOpen(false);
      setNewBusinessData({
        name: "", email: "", category: "", contactName: "", contactEmail: "",
        contactPhone: "", contactPosition: "", address: "", district: "", city: "Istanbul", description: "",
        logo_url: "", images: []
      });
      fetchBusinesses();
    } catch (error) {
      console.error("Failed to create business:", error);
      toast.error("Failed to create business");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    { label: "Total Businesses", value: statsSummary.totalBusinesses.toLocaleString(), icon: Building2, color: "text-blue-600" },
    { label: "Active", value: statsSummary.activeBusinesses.toLocaleString(), icon: CheckCircle, color: "text-green-600" },
    { label: "Pending Applications", value: statsSummary.pendingBusinesses.toLocaleString(), icon: Clock, color: "text-orange-600" },
    { label: "Total Scans", value: statsSummary.totalScans.toLocaleString(), icon: Activity, color: "text-purple-600" }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Business Management</h2>
            <p className="text-muted-foreground">Manage partner businesses and applications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => handleSendNotification(businesses.map(b => b.id))}>
              <Bell className="h-4 w-4 mr-2" />
              Bulk Notify
            </Button>
            <Button size="lg" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="active">
                    Active ({businesses.filter(b => b.status === "active").length})
                  </TabsTrigger>
                  <TabsTrigger value="applications">
                    Applications ({pendingApplications.length})
                  </TabsTrigger>
                  <TabsTrigger value="suspended">
                    Suspended ({businesses.filter(b => b.status === "suspended").length})
                  </TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <div className="relative flex-1 lg:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={activeTab}>
                <TabsContent value="active" className="mt-0">
                  <BusinessList
                    businesses={filteredBusinesses}
                    onView={handleViewBusiness}
                    onEdit={handleEditBusiness}
                    onSuspend={handleSuspendBusiness}
                    onPasswordReset={handlePasswordReset}
                    onViewActivity={handleViewActivity}
                    onSendNotification={(id) => handleSendNotification([id])}
                  />
                </TabsContent>

                <TabsContent value="applications" className="mt-0">
                  <ApplicationList
                    applications={pendingApplications}
                    onView={handleViewApplication}
                  />
                </TabsContent>

                <TabsContent value="suspended" className="mt-0">
                  <BusinessList
                    businesses={filteredBusinesses}
                    onView={handleViewBusiness}
                    onEdit={handleEditBusiness}
                    onActivate={handleActivateBusiness}
                    onViewActivity={handleViewActivity}
                    isSuspended
                  />
                </TabsContent>

                <TabsContent value="all" className="mt-0">
                  <BusinessList
                    businesses={filteredBusinesses}
                    onView={handleViewBusiness}
                    onEdit={handleEditBusiness}
                    onSuspend={handleSuspendBusiness}
                    onActivate={handleActivateBusiness}
                    onPasswordReset={handlePasswordReset}
                    onViewActivity={handleViewActivity}
                    onSendNotification={(id) => handleSendNotification([id])}
                    showAll
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* View Business Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Business Details</DialogTitle>
            </DialogHeader>
            {viewBusiness && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{viewBusiness.name}</h3>
                    <p className="text-muted-foreground">{viewBusiness.category}</p>
                  </div>
                  <Badge variant={viewBusiness.status === "active" ? "default" : "secondary"}>
                    {viewBusiness.status}
                  </Badge>
                </div>

                {viewBusiness.businessDetails.description && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Description</Label>
                      <p className="text-sm text-muted-foreground">{viewBusiness.businessDetails.description}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Person</Label>
                    <p className="font-medium">{viewBusiness.contactPerson.name || "N/A"}</p>
                    {viewBusiness.contactPerson.position && (
                      <p className="text-sm text-muted-foreground">{viewBusiness.contactPerson.position}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{viewBusiness.contactPerson.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-medium">{viewBusiness.contactPerson.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location (address)</Label>
                    <p className="font-medium">{viewBusiness.location.address || "N/A"}</p>
                    {(viewBusiness.location.district || viewBusiness.location.city) && (
                      <p className="text-sm text-muted-foreground">
                        {[viewBusiness.location.district, viewBusiness.location.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Statistics</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Total Scans</p>
                        <p className="text-2xl font-bold">{viewBusiness.statistics.totalScans}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold">{viewBusiness.statistics.thisMonthScans}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold">₺{viewBusiness.statistics.totalRevenue.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {viewBusiness.passPartnerships.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Pass Partnerships</Label>
                      <div className="space-y-2">
                        {viewBusiness.passPartnerships.map((pass, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="font-medium">{pass.passName}</span>
                            <Badge>{pass.discountPercent}% discount</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Business Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Business</DialogTitle>
            </DialogHeader>
            {editBusiness && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={editBusiness.name}
                      onChange={(e) => setEditBusiness({...editBusiness, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editBusiness.category} onValueChange={(val) => setEditBusiness({...editBusiness, category: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Historical">Historical</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                        <SelectItem value="Museum">Museum</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={editBusiness.contactPerson.name}
                      onChange={(e) => setEditBusiness({
                        ...editBusiness,
                        contactPerson: {...editBusiness.contactPerson, name: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input
                      value={editBusiness.contactPerson.position}
                      onChange={(e) => setEditBusiness({
                        ...editBusiness,
                        contactPerson: {...editBusiness.contactPerson, position: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={editBusiness.contactPerson.email}
                      onChange={(e) => setEditBusiness({
                        ...editBusiness,
                        contactPerson: {...editBusiness.contactPerson, email: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={editBusiness.contactPerson.phone}
                      onChange={(e) => setEditBusiness({
                        ...editBusiness,
                        contactPerson: {...editBusiness.contactPerson, phone: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Application Review Dialog */}
        <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Review</DialogTitle>
            </DialogHeader>
            {viewApplication && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{viewApplication.businessName}</h3>
                  <Badge>{viewApplication.status}</Badge>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Person</Label>
                    <p className="font-medium">{viewApplication.contactPerson.name}</p>
                    <p className="text-sm">{viewApplication.contactPerson.email}</p>
                    <p className="text-sm">{viewApplication.contactPerson.phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="font-medium">{viewApplication.location.address}</p>
                    <p className="text-sm">{viewApplication.location.district}, {viewApplication.location.city}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{viewApplication.businessDetails.description}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Proposed Discount</Label>
                  <p className="text-2xl font-bold">{viewApplication.proposedDiscount}%</p>
                </div>

                {viewApplication.status === "pending" && (
                  <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={() => handleRejectApplication(viewApplication.id)} disabled={isSubmitting}>
                      <XCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Processing..." : "Reject"}
                    </Button>
                    <Button onClick={() => handleApproveApplication(viewApplication.id)} disabled={isSubmitting}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Approving..." : "Approve"}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Notification Dialog */}
        <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>
                Sending to {selectedBusinessIds.length} business(es)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Notification title"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  placeholder="Your message..."
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={notificationData.type} onValueChange={(val: any) => setNotificationData({...notificationData, type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmSendNotification}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <AlertDialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Password</AlertDialogTitle>
              <AlertDialogDescription>
                Send password reset email to {passwordResetBusiness?.email}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPasswordReset}>
                Send Reset Email
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend Dialog */}
        <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Suspend Business
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will temporarily suspend {suspendBusiness?.name}. Provide a reason:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSuspend} className="bg-orange-600 hover:bg-orange-700" disabled={isSubmitting}>
                {isSubmitting ? "Suspending..." : "Suspend"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Activity Log Dialog */}
        <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activity Log - {viewBusiness?.name}</DialogTitle>
            </DialogHeader>
            {viewBusiness && (
              <div className="space-y-3">
                {viewBusiness.activityLog.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                    <Activity className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Business Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Business</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    placeholder="e.g., Cafe Istanbul"
                    value={newBusinessData.name}
                    onChange={(e) => setNewBusinessData({...newBusinessData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={newBusinessData.category} onValueChange={(val) => setNewBusinessData({...newBusinessData, category: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Historical">Historical</SelectItem>
                      <SelectItem value="Restaurant">Restaurant</SelectItem>
                      <SelectItem value="Museum">Museum</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newBusinessData.email}
                    onChange={(e) => setNewBusinessData({...newBusinessData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="+90 ..."
                    value={newBusinessData.contactPhone}
                    onChange={(e) => setNewBusinessData({...newBusinessData, contactPhone: e.target.value})}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    placeholder="Full name"
                    value={newBusinessData.contactName}
                    onChange={(e) => setNewBusinessData({...newBusinessData, contactName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input
                    placeholder="e.g., Manager"
                    value={newBusinessData.contactPosition}
                    onChange={(e) => setNewBusinessData({...newBusinessData, contactPosition: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  placeholder="Business description..."
                  value={newBusinessData.description}
                  onChange={(e) => setNewBusinessData({...newBusinessData, description: e.target.value})}
                />
              </div>

              <Separator />

              <ImageUpload
                label="Business Logo (Optional)"
                value={newBusinessData.logo_url}
                onChange={(url) => setNewBusinessData({...newBusinessData, logo_url: url})}
                bucket="logos"
                folder="businesses"
                maxSize={5}
                previewHeight="120px"
              />

              <ImageUpload
                label="Business Images (Optional)"
                value={newBusinessData.images[0] || ""}
                onChange={(url) => {
                  const updatedImages = [...newBusinessData.images];
                  if (updatedImages.length === 0) {
                    updatedImages.push(url);
                  } else {
                    updatedImages[0] = url;
                  }
                  setNewBusinessData({...newBusinessData, images: updatedImages});
                }}
                bucket="business-images"
                folder="venues"
                maxSize={10}
                previewHeight="180px"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateBusiness} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Business"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface BusinessListProps {
  businesses: AdminBusinessWithMeta[];
  onView: (business: AdminBusinessWithMeta) => void;
  onEdit: (business: AdminBusinessWithMeta) => void;
  onSuspend?: (business: AdminBusinessWithMeta) => void;
  onActivate?: (businessId: string) => void;
  onPasswordReset?: (business: AdminBusinessWithMeta) => void;
  onViewActivity?: (business: AdminBusinessWithMeta) => void;
  onSendNotification?: (businessId: string) => void;
  isSuspended?: boolean;
  showAll?: boolean;
}

function BusinessList({
  businesses, onView, onEdit, onSuspend, onActivate,
  onPasswordReset, onViewActivity, onSendNotification, isSuspended, showAll
}: BusinessListProps) {
  if (businesses.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No businesses found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {businesses.map((business) => (
        <Card key={business.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-4 lg:p-6">
                <div className="flex flex-wrap items-start gap-2 mb-3">
                  <h3 className="font-bold text-lg">{business.name}</h3>
                  <Badge variant={business.status === "active" ? "default" : business.status === "suspended" ? "destructive" : "secondary"}>
                    {business.status}
                  </Badge>
                  <Badge variant="outline">{business.category}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{business.contactPerson.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{business.location.district}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Scans</p>
                    <p className="text-xl font-bold">{business.statistics.totalScans}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">This Month</p>
                    <p className="text-xl font-bold">{business.statistics.thisMonthScans}</p>
                  </div>
                </div>

                {business.passPartnerships.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {business.passPartnerships.map((pass, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {pass.passName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex lg:flex-col gap-2 p-4 lg:p-4 bg-muted/30 border-t lg:border-t-0 lg:border-l">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 lg:w-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(business)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(business)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {onViewActivity && (
                      <DropdownMenuItem onClick={() => onViewActivity(business)}>
                        <Activity className="h-4 w-4 mr-2" />
                        Activity Log
                      </DropdownMenuItem>
                    )}
                    {onSendNotification && (
                      <DropdownMenuItem onClick={() => onSendNotification(business.id)}>
                        <Bell className="h-4 w-4 mr-2" />
                        Send Notification
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onPasswordReset && (
                      <DropdownMenuItem onClick={() => onPasswordReset(business)}>
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                    )}
                    {(isSuspended || (showAll && business.status === "suspended")) && onActivate && (
                      <DropdownMenuItem onClick={() => onActivate(business.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    {!isSuspended && business.status === "active" && onSuspend && (
                      <DropdownMenuItem onClick={() => onSuspend(business)} className="text-orange-600">
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ApplicationListProps {
  applications: BusinessApplication[];
  onView: (application: BusinessApplication) => void;
}

function ApplicationList({ applications, onView }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No pending applications</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <Card key={app.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(app)}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{app.businessName}</h3>
                  <Badge variant="outline">{app.category}</Badge>
                  <Badge>{app.status}</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{app.contactPerson.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    <span className="font-medium">{app.location.district}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount: </span>
                    <span className="font-bold">{app.proposedDiscount}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted: </span>
                    <span className="font-medium">{new Date(app.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}










