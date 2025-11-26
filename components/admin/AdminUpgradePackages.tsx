"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  DollarSign,
} from "lucide-react";

interface Pass {
  id: string;
  name: string;
  status: string;
}

interface UpgradePackage {
  id: string;
  name: string;
  description: string;
  short_description: string;
  from_pass_id: string | null;
  to_pass_id: string;
  upgrade_price: number;
  discount_percentage: number;
  additional_days: number;
  features: string[];
  status: "active" | "inactive" | "draft";
  featured: boolean;
  display_order: number;
  badge_text: string | null;
  created_at: string;
  from_pass?: Pass;
  to_pass?: Pass;
}

const statusFilters = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Taslak" },
];

const createDefaultFormState = () => ({
  name: "",
  description: "",
  short_description: "",
  from_pass_id: "",
  to_pass_id: "",
  upgrade_price: "0",
  discount_percentage: "0",
  additional_days: "0",
  features: "",
  status: "draft" as "active" | "inactive" | "draft",
  featured: false,
  display_order: "0",
  badge_text: "",
});

export default function AdminUpgradePackages() {
  const [packages, setPackages] = useState<UpgradePackage[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPackage, setEditingPackage] = useState<UpgradePackage | null>(
    null
  );
  const [formData, setFormData] = useState(createDefaultFormState);

  useEffect(() => {
    fetchPasses();
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchPasses = async () => {
    try {
      const response = await fetch("/api/admin/passes", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch passes");
      const data = await response.json();
      setPasses(data.passes ?? []);
    } catch (error) {
      console.error("Failed to load passes:", error);
      toast.error("Failed to load passes");
    }
  };

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const query = params.toString();
      const response = await fetch(
        query
          ? `/api/admin/upgrade-packages?${query}`
          : `/api/admin/upgrade-packages`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch upgrade packages");
      }

      const data = await response.json();
      setPackages(data.packages ?? []);
    } catch (error) {
      console.error("Failed to load upgrade packages:", error);
      toast.error("Failed to load upgrade packages");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPackages = useMemo(() => {
    if (!searchQuery) {
      return packages;
    }

    const q = searchQuery.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description?.toLowerCase().includes(q) ||
        pkg.to_pass?.name.toLowerCase().includes(q)
    );
  }, [packages, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: packages.length,
      active: packages.filter((p) => p.status === "active").length,
      featured: packages.filter((p) => p.featured).length,
      avgPrice:
        packages.length > 0
          ? packages.reduce((sum, p) => sum + Number(p.upgrade_price), 0) /
            packages.length
          : 0,
    };
  }, [packages]);

  const handleCreate = () => {
    setEditingPackage(null);
    setFormData(createDefaultFormState());
    setIsDialogOpen(true);
  };

  const handleEdit = (pkg: UpgradePackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      short_description: pkg.short_description,
      from_pass_id: pkg.from_pass_id || "",
      to_pass_id: pkg.to_pass_id,
      upgrade_price: pkg.upgrade_price.toString(),
      discount_percentage: pkg.discount_percentage.toString(),
      additional_days: pkg.additional_days.toString(),
      features: pkg.features.join("\n"),
      status: pkg.status,
      featured: pkg.featured,
      display_order: pkg.display_order.toString(),
      badge_text: pkg.badge_text || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!formData.name || !formData.to_pass_id) {
        toast.error("Please fill in required fields");
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        short_description: formData.short_description,
        from_pass_id: formData.from_pass_id || null,
        to_pass_id: formData.to_pass_id,
        upgrade_price: parseFloat(formData.upgrade_price),
        discount_percentage: parseInt(formData.discount_percentage),
        additional_days: parseInt(formData.additional_days),
        features: formData.features
          .split("\n")
          .map((f) => f.trim())
          .filter((f) => f),
        status: formData.status,
        featured: formData.featured,
        display_order: parseInt(formData.display_order),
        badge_text: formData.badge_text || null,
      };

      const url = editingPackage
        ? `/api/admin/upgrade-packages/${editingPackage.id}`
        : `/api/admin/upgrade-packages`;

      const response = await fetch(url, {
        method: editingPackage ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save package");
      }

      toast.success(
        editingPackage
          ? "Paket successfully updated"
          : "Paket successfully created"
      );
      setIsDialogOpen(false);
      fetchPackages();
    } catch (error) {
      console.error("Failed to save package:", error);
      toast.error("Paket kaydedilemedi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;

    try {
      const response = await fetch(`/api/admin/upgrade-packages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete package");
      }

      toast.success("Paket successfully deleted");
      fetchPackages();
    } catch (error) {
      console.error("Failed to delete package:", error);
      toast.error("Paket silinemedi");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      draft: "outline",
    } as const;

    const labels = {
      active: "Active",
      inactive: "Inactive",
      draft: "Taslak",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const calculateFinalPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Upgrade Packages
            </h1>
            <p className="text-muted-foreground">
              Manage customer pass upgrades
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Paket Add
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Paket
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Paketler
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Featured
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.featured}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ortalama Fiyat
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₺{stats.avgPrice.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Paket ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={fetchPackages}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No packages found matching search criteria"
                  : "No upgrade packages added yet"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Kaynak Pas</TableHead>
                    <TableHead>Hedef Pas</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Extra Days</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          {pkg.badge_text && (
                            <Badge variant="secondary" className="mt-1">
                              {pkg.badge_text}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pkg.from_pass?.name || (
                          <span className="text-muted-foreground italic">
                            All Passes
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{pkg.to_pass?.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            ₺
                            {calculateFinalPrice(
                              pkg.upgrade_price,
                              pkg.discount_percentage
                            ).toFixed(2)}
                          </div>
                          {pkg.discount_percentage > 0 && (
                            <div className="text-sm text-muted-foreground line-through">
                              ₺{pkg.upgrade_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pkg.discount_percentage > 0 ? (
                          <Badge variant="secondary">
                            %{pkg.discount_percentage}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {pkg.additional_days > 0 ? (
                          <Badge variant="outline">
                            +{pkg.additional_days} days
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                      <TableCell>
                        {pkg.featured ? (
                          <Badge variant="default">Evet</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pkg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? "Edit Package" : "Create New Package"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Upgrade to Premium"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      short_description: e.target.value,
                    })
                  }
                  placeholder="Brief description"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed information about the package"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="from_pass_id">Kaynak Pas (Opsiyonel)</Label>
                  <Select
                    value={formData.from_pass_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, from_pass_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Valid for all passes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Passes</SelectItem>
                      {passes
                        .filter((p) => p.status === "active")
                        .map((pass) => (
                          <SelectItem key={pass.id} value={pass.id}>
                            {pass.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="to_pass_id">Hedef Pas *</Label>
                  <Select
                    value={formData.to_pass_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, to_pass_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pass" />
                    </SelectTrigger>
                    <SelectContent>
                      {passes
                        .filter((p) => p.status === "active")
                        .map((pass) => (
                          <SelectItem key={pass.id} value={pass.id}>
                            {pass.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="upgrade_price">Upgrade Price (₺)</Label>
                  <Input
                    id="upgrade_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.upgrade_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        upgrade_price: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount_percentage">Discount (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_percentage: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="additional_days">Extra Days</Label>
                  <Input
                    id="additional_days"
                    type="number"
                    min="0"
                    value={formData.additional_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additional_days: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="features">
                  Features (one per line)
                </Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  placeholder="VIP customer support&#10;Priority access&#10;Extra discounts"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Durum</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(
                      value: "active" | "inactive" | "draft"
                    ) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="badge_text">Rozet Metni</Label>
                  <Input
                    id="badge_text"
                    value={formData.badge_text}
                    onChange={(e) =>
                      setFormData({ ...formData, badge_text: e.target.value })
                    }
                    placeholder="e.g., BEST VALUE"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, featured: checked })
                  }
                />
                <Label htmlFor="featured">Featured package</Label>
              </div>

              {formData.upgrade_price &&
                formData.discount_percentage &&
                parseFloat(formData.discount_percentage) > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Final Fiyat:
                    </p>
                    <p className="text-2xl font-bold">
                      ₺
                      {calculateFinalPrice(
                        parseFloat(formData.upgrade_price),
                        parseInt(formData.discount_percentage)
                      ).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground line-through">
                      ₺{parseFloat(formData.upgrade_price).toFixed(2)}
                    </p>
                  </div>
                )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPackage ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
