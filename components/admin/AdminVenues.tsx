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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Edit,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Types
interface Venue {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  galleryImages: string[];
  status: string;
  passCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalVenues: number;
  activeVenues: number;
  inactiveVenues: number;
  byCategory: Array<{ category: string; count: number }>;
}

const CATEGORIES = ['Historical', 'Restaurant', 'Museum', 'Shopping'];
const STATUSES = ['active', 'inactive'];

export default function AdminVenues() {
  // State
  const [venues, setVenues] = useState<Venue[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalVenues: 0,
    activeVenues: 0,
    inactiveVenues: 0,
    byCategory: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    category: "Historical",
    description: "",
    shortDescription: "",
    address: "",
    latitude: "",
    longitude: "",
    imageUrl: "",
    galleryImages: [] as string[],
    status: "active",
  });

  // Fetch venues
  const fetchVenues = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        search: searchQuery,
      });

      const response = await fetch(`/api/admin/venues?${params}`);
      if (!response.ok) throw new Error('Failed to fetch venues');

      const data = await response.json();
      setVenues(data.venues || []);
      setStats(data.stats || {
        totalVenues: 0,
        activeVenues: 0,
        inactiveVenues: 0,
        byCategory: [],
      });
    } catch (err) {
      console.error('Failed to fetch venues:', err);
      toast.error('Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchVenues();
  }, [statusFilter, categoryFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length === 0 || searchQuery.length >= 2) {
        fetchVenues();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      category: "Historical",
      description: "",
      shortDescription: "",
      address: "",
      latitude: "",
      longitude: "",
      imageUrl: "",
      galleryImages: [],
      status: "active",
    });
    setEditingVenue(null);
  };

  // Handle save (create or update)
  const handleSaveVenue = async () => {
    // Validation
    if (!formData.name || !formData.category) {
      toast.error("Please fill in name and category");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        shortDescription: formData.shortDescription,
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        imageUrl: formData.imageUrl || null,
        galleryImages: formData.galleryImages.filter(img => img.trim() !== ""),
        status: formData.status,
      };

      const url = editingVenue
        ? `/api/admin/venues/${editingVenue}`
        : '/api/admin/venues';
      const method = editingVenue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save venue');
      }

      toast.success(
        editingVenue
          ? 'Venue updated successfully!'
          : 'Venue created successfully!'
      );
      setIsDialogOpen(false);
      resetForm();
      fetchVenues();
    } catch (err: any) {
      console.error('Save venue error:', err);
      toast.error(err.message || 'Failed to save venue');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit
  const handleEditVenue = async (venueId: string) => {
    try {
      const response = await fetch(`/api/admin/venues/${venueId}`);
      if (!response.ok) throw new Error('Failed to fetch venue details');

      const { venue: venueDetails } = await response.json();
      const venueData = venueDetails.venue;

      setFormData({
        name: venueData.name || "",
        category: venueData.category || "Historical",
        description: venueData.description || "",
        shortDescription: venueData.short_description || "",
        address: venueData.address || "",
        latitude: venueData.latitude ? venueData.latitude.toString() : "",
        longitude: venueData.longitude ? venueData.longitude.toString() : "",
        imageUrl: venueData.image_url || "",
        galleryImages: venueData.gallery_images || [],
        status: venueData.status || "active",
      });

      setEditingVenue(venueId);
      setIsDialogOpen(true);
    } catch (err) {
      console.error('Edit venue error:', err);
      toast.error('Failed to load venue details');
    }
  };

  // Handle delete
  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!confirm(`Are you sure you want to delete "${venueName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to delete venue');
      }

      toast.success('Venue deleted successfully');
      fetchVenues();
    } catch (err: any) {
      console.error('Delete venue error:', err);
      toast.error(err.message || 'Failed to delete venue');
    }
  };

  // Filter venues client-side for real-time search
  const filteredVenues = venues.filter((venue) => {
    const matchesSearch =
      searchQuery.length < 2 ||
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.address?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
          <p className="text-muted-foreground">
            Manage venues and locations
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingVenue ? 'Edit Venue' : 'Create New Venue'}
              </DialogTitle>
              <DialogDescription>
                {editingVenue
                  ? 'Update venue information below'
                  : 'Add a new venue to the system'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Venue Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Hagia Sophia"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input
                    id="shortDescription"
                    placeholder="Brief one-liner description"
                    value={formData.shortDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shortDescription: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the venue..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., Sultanahmet, Fatih, Istanbul"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="e.g., 41.0082"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({ ...formData, latitude: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="e.g., 28.9784"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({ ...formData, longitude: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media</h3>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Main Image URL</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a URL to an image (future: upload to Supabase Storage)
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveVenue} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingVenue ? 'Update Venue' : 'Create Venue'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVenues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All venues in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVenues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.byCategory && stats.byCategory.length > 0 ? (
                stats.byCategory.slice(0, 2).map((cat) => (
                  <div
                    key={cat.category}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{cat.category}</span>
                    <span className="font-medium">{cat.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Venue List */}
      <Card>
        <CardHeader>
          <CardTitle>Venues ({filteredVenues.length})</CardTitle>
          <CardDescription>
            Manage your venue listings and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No venues found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Create your first venue to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredVenues.map((venue) => (
                <Card key={venue.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{venue.name}</h3>
                          <Badge
                            variant={
                              venue.status === 'active' ? 'default' : 'secondary'
                            }
                          >
                            {venue.status === 'active' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {venue.status.charAt(0).toUpperCase() + venue.status.slice(1)}
                          </Badge>
                          <Badge variant="outline">{venue.category}</Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {venue.shortDescription || venue.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {venue.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{venue.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>Used in {venue.passCount} passes</span>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEditVenue(venue.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteVenue(venue.id, venue.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
