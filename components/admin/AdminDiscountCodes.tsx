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
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  max_uses?: number | null;
  current_uses: number;
  max_uses_per_customer: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_until: string;
  status: "active" | "inactive" | "expired";
  campaign?: {
    id: string;
    title: string;
    status: string;
  };
}

const statusFilters = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
];

const discountTypes = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed_amount", label: "Sabit Tutar" },
];

const createDefaultFormState = () => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return {
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: "10",
    max_uses: "",
    max_uses_per_customer: "1",
    min_purchase_amount: "0",
    valid_from: toLocalInputValue(now),
    valid_until: toLocalInputValue(nextWeek),
    status: "active" as "active" | "inactive" | "expired",
  };
};

export default function AdminDiscountCodes() {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState(createDefaultFormState);

  useEffect(() => {
    fetchDiscountCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchDiscountCodes = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const query = params.toString();
      const response = await fetch(
        query ? `/api/admin/discount-codes?${query}` : `/api/admin/discount-codes`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch discount codes");
      }

      const data = await response.json();
      setDiscountCodes(data.discountCodes ?? []);
    } catch (error) {
      console.error("Failed to load discount codes:", error);
      toast.error("Failed to load discount codes");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCodes = useMemo(() => {
    if (!searchQuery) {
      return discountCodes;
    }

    const q = searchQuery.toLowerCase();
    return discountCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(q) ||
        (code.description?.toLowerCase().includes(q) ?? false)
    );
  }, [discountCodes, searchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    const soonThreshold = now.getTime() + 3 * 24 * 60 * 60 * 1000;

    return {
      total: discountCodes.length,
      active: discountCodes.filter((code) => code.status === "active").length,
      expiringSoon: discountCodes.filter((code) => {
        const expiry = new Date(code.valid_until).getTime();
        return expiry > now.getTime() && expiry < soonThreshold;
      }).length,
      expired: discountCodes.filter((code) => code.status === "expired").length,
    };
  }, [discountCodes]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormData(createDefaultFormState());
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getDiscountLabel = (code: DiscountCode) =>
    code.discount_type === "percentage"
      ? `%${code.discount_value}`
      : `₺${code.discount_value}`;

  const getStatusVariant = (status: DiscountCode["status"]) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses, 10) : null,
        max_uses_per_customer: parseInt(formData.max_uses_per_customer || "1", 10),
        min_purchase_amount: parseFloat(formData.min_purchase_amount || "0"),
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        status: formData.status,
      };

      if (!payload.code) {
        toast.error("Code field is required");
        return;
      }

      if (!payload.discount_value || Number.isNaN(payload.discount_value)) {
        toast.error("Enter a valid discount value");
        return;
      }

      const response = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Failed to create discount code");
      }

      toast.success("Discount code created");
      handleDialogChange(false);
      fetchDiscountCodes();
    } catch (error) {
      console.error("Failed to create discount code:", error);
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Discount Codes</h1>
            <p className="text-sm text-muted-foreground">
              Manage discount codes for active campaigns.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={fetchDiscountCodes}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Yenile
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Discount Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Discount Code</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleCreate}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="code">Kod</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(event) =>
                          setFormData({ ...formData, code: event.target.value.toUpperCase() })
                        }
                        required
                        maxLength={24}
                        placeholder="WINTER25"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount_type">Discount Type</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            discount_type: value as "percentage" | "fixed_amount",
                          })
                        }
                      >
                        <SelectTrigger id="discount_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {discountTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount_value">Discount Value</Label>
                      <Input
                        id="discount_value"
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.discount_value}
                        onChange={(event) =>
                          setFormData({ ...formData, discount_value: event.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Durum</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value as "active" | "inactive" })
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData({ ...formData, description: event.target.value })
                      }
                      placeholder="Brief information about summer campaign"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="max_uses">Max Uses (optional)</Label>
                      <Input
                        id="max_uses"
                        type="number"
                        min="1"
                        value={formData.max_uses}
                        onChange={(event) =>
                          setFormData({ ...formData, max_uses: event.target.value })
                        }
                        placeholder="Leave empty for unlimited"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_uses_per_customer">Per Customer</Label>
                      <Input
                        id="max_uses_per_customer"
                        type="number"
                        min="1"
                        value={formData.max_uses_per_customer}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            max_uses_per_customer: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_purchase_amount">Minimum Tutar (₺)</Label>
                      <Input
                        id="min_purchase_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_purchase_amount}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            min_purchase_amount: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="valid_from">Valid From</Label>
                      <Input
                        id="valid_from"
                        type="datetime-local"
                        value={formData.valid_from}
                        onChange={(event) =>
                          setFormData({ ...formData, valid_from: event.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valid_until">Valid Until</Label>
                      <Input
                        id="valid_until"
                        type="datetime-local"
                        value={formData.valid_until}
                        onChange={(event) =>
                          setFormData({ ...formData, valid_until: event.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Toplam Kod</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{stats.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{stats.active}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{stats.expiringSoon}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{stats.expired}</span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Discount Codes Listesi</CardTitle>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search by code..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Durum filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Kampanya</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">Min Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading discount codes...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoading && filteredCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No records found.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoading &&
                    filteredCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium">
                          {code.code}
                          {code.description && (
                            <p className="text-xs text-muted-foreground">{code.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {code.campaign ? (
                            <div className="flex flex-col">
                              <span>{code.campaign.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {code.campaign.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Independent</span>
                          )}
                        </TableCell>
                        <TableCell>{getDiscountLabel(code)}</TableCell>
                        <TableCell>
                          {code.current_uses}/{code.max_uses ?? "∞"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>Start: {formatDate(code.valid_from)}</span>
                            <span>End: {formatDate(code.valid_until)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(code.status)}>{code.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ₺{code.min_purchase_amount?.toLocaleString("tr-TR") ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
