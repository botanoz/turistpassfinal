"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminLayout from "./AdminLayout";
import { Plus, Search, Edit, Trash2, Eye, X, MapPin, DollarSign, Calendar, Users, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminPassesData, getAdminPassById, adminPassesStats } from "@/lib/mockData/adminPassesData";
import { AdminPass } from "@/lib/types/adminPass";
import { ImageUpload } from "@/components/ui/image-upload";

export default function AdminPassesWorking() {  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic");
  const [editingPass, setEditingPass] = useState<AdminPass | null>(null);
  const [previewPass, setPreviewPass] = useState<AdminPass | null>(null);
  const [deletePassId, setDeletePassId] = useState<string | null>(null);
  const [passes, setPasses] = useState<AdminPass[]>(adminPassesData);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDesc: "",
    status: "active" as "active" | "inactive" | "draft",
    featured: false,
    popular: false,
    color: "#3b82f6",
    features: [""],
    heroTitle: "",
    heroSubtitle: "",
    aboutContent: "",
    benefits: [""],
    cancellationPolicy: "",
    card_image_url: "",
    hero_image_url: "",
  });

  const [pricingOptions, setPricingOptions] = useState([
    { days: 1, ageGroup: "adult", price: 0 }
  ]);

  const [selectedVenues, setSelectedVenues] = useState<Array<{
    id: string;
    name: string;
    category: string;
    discount: number;
    usageType: string;
    maxUsage?: number;
  }>>([]);

  const [venueSearch, setVenueSearch] = useState("");
  // Auth is handled by AdminLayout wrapper
  const allVenues = [
    { id: "hagia-sophia", name: "Hagia Sophia", category: "Historical" },
    { id: "topkapi-palace", name: "Topkapi Palace", category: "Historical" },
    { id: "blue-mosque", name: "Blue Mosque", category: "Historical" },
    { id: "basilica-cistern", name: "Basilica Cistern", category: "Historical" },
    { id: "galata-tower", name: "Galata Tower", category: "Historical" },
    { id: "dolmabahce-palace", name: "Dolmabahce Palace", category: "Historical" },
    { id: "istanbul-modern", name: "Istanbul Modern", category: "Museum" },
    { id: "pera-museum", name: "Pera Museum", category: "Museum" },
    { id: "mikla-restaurant", name: "Mikla Restaurant", category: "Restaurant" },
    { id: "ciya-sofrasi", name: "Ciya Sofrasi", category: "Restaurant" },
    { id: "nusr-et", name: "Nusr-Et Steakhouse", category: "Restaurant" },
    { id: "karakoy-lokantasi", name: "Karakoy Lokantasi", category: "Restaurant" },
    { id: "mandabatmaz", name: "Mandabatmaz", category: "Cafe" },
    { id: "kronotrop", name: "Kronotrop", category: "Cafe" },
    { id: "hafiz-mustafa", name: "Hafiz Mustafa", category: "Cafe" },
    { id: "grand-bazaar", name: "Grand Bazaar", category: "Shopping" },
    { id: "spice-bazaar", name: "Spice Bazaar", category: "Shopping" },
  ];

  const filteredPasses = passes.filter(pass =>
    pass.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pass.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVenues = allVenues.filter(venue =>
    venueSearch === "" ||
    venue.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    venue.category.toLowerCase().includes(venueSearch.toLowerCase())
  );

  const loadPassToForm = (pass: AdminPass) => {
    setFormData({
      name: pass.name,
      description: pass.description,
      shortDesc: pass.shortDescription,
      status: pass.status,
      featured: pass.featured,
      popular: pass.popular,
      color: pass.color,
      features: pass.features.length > 0 ? pass.features : [""],
      heroTitle: pass.homepageContent.title,
      heroSubtitle: pass.homepageContent.subtitle,
      aboutContent: pass.detailsPage.aboutContent,
      benefits: pass.detailsPage.benefits.length > 0 ? pass.detailsPage.benefits : [""],
      cancellationPolicy: pass.cancellationPolicy,
      card_image_url: "",
      hero_image_url: "",
    });

    setPricingOptions(pass.pricingOptions.map(opt => ({
      days: opt.days,
      ageGroup: opt.ageGroup,
      price: opt.basePrice
    })));

    setSelectedVenues(pass.venues.map(v => ({
      id: v.venueId,
      name: v.venueName,
      category: v.category,
      discount: v.discountPercent,
      usageType: v.usageRule.usageType,
      maxUsage: v.usageRule.maxUsagePerVenue
    })));
  };

  const handleEdit = (pass: AdminPass) => {
    setEditingPass(pass);
    loadPassToForm(pass);
    setIsDialogOpen(true);
  };

  const handlePreview = (pass: AdminPass) => {
    setPreviewPass(pass);
    setIsPreviewOpen(true);
  };

  const handleDeleteClick = (passId: string) => {
    setDeletePassId(passId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletePassId) {
      setPasses(passes.filter(p => p.id !== deletePassId));
      toast.success("Pass deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletePassId(null);
    }
  };

  const handleAddPricing = () => {
    setPricingOptions([...pricingOptions, { days: 1, ageGroup: "adult", price: 0 }]);
  };

  const handleRemovePricing = (index: number) => {
    if (pricingOptions.length > 1) {
      setPricingOptions(pricingOptions.filter((_, i) => i !== index));
    }
  };

  const handlePricingChange = (index: number, field: string, value: string | number) => {
    const updated = [...pricingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setPricingOptions(updated);
  };

  const handleAddVenue = (venue: typeof allVenues[0]) => {
    if (selectedVenues.find(v => v.id === venue.id)) {
      toast.error("Venue already added");
      return;
    }
    setSelectedVenues([...selectedVenues, {
      id: venue.id,
      name: venue.name,
      category: venue.category,
      discount: 10,
      usageType: "once",
    }]);
    setVenueSearch("");
  };

  const handleRemoveVenue = (venueId: string) => {
    setSelectedVenues(selectedVenues.filter(v => v.id !== venueId));
  };

  const handleVenueChange = (venueId: string, field: string, value: string | number) => {
    setSelectedVenues(selectedVenues.map(v =>
      v.id === venueId ? { ...v, [field]: value } : v
    ));
  };

  const handleAddFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const handleRemoveFeature = (index: number) => {
    if (formData.features.length > 1) {
      setFormData({
        ...formData,
        features: formData.features.filter((_, i) => i !== index)
      });
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...formData.features];
    updated[index] = value;
    setFormData({ ...formData, features: updated });
  };

  const handleAddBenefit = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, ""] });
  };

  const handleRemoveBenefit = (index: number) => {
    if (formData.benefits.length > 1) {
      setFormData({
        ...formData,
        benefits: formData.benefits.filter((_, i) => i !== index)
      });
    }
  };

  const handleBenefitChange = (index: number, value: string) => {
    const updated = [...formData.benefits];
    updated[index] = value;
    setFormData({ ...formData, benefits: updated });
  };

  const calculateTotalPrice = () => {
    return pricingOptions.reduce((sum, opt) => sum + opt.price, 0);
  };

  const handleSavePass = () => {
    if (!formData.name || pricingOptions.length === 0 || selectedVenues.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    const newPass: AdminPass = {
      id: editingPass?.id || `pass-${Date.now()}`,
      slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
      name: formData.name,
      description: formData.description,
      shortDescription: formData.shortDesc,
      status: formData.status,
      featured: formData.featured,
      popular: formData.popular,
      color: formData.color,
      backgroundColor: `bg-blue-50 dark:bg-blue-950/20`,
      pricingOptions: pricingOptions.map((opt, idx) => ({
        id: `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${opt.days}d-${opt.ageGroup}-${idx}`,
        days: opt.days,
        ageGroup: opt.ageGroup as any,
        basePrice: opt.price,
        discountPercent: 0
      })),
      venues: selectedVenues.map(v => ({
        venueId: v.id,
        venueName: v.name,
        category: v.category,
        discountPercent: v.discount,
        usageRule: {
          usageType: v.usageType as any,
          maxUsagePerVenue: v.maxUsage,
        }
      })),
      features: formData.features.filter(f => f.trim() !== ""),
      homepageContent: {
        title: formData.heroTitle,
        subtitle: formData.heroSubtitle,
        highlights: []
      },
      detailsPage: {
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        aboutContent: formData.aboutContent,
        benefits: formData.benefits.filter(b => b.trim() !== ""),
        included: [],
        notIncluded: [],
        termsAndConditions: []
      },
      validityDays: Array.from(new Set(pricingOptions.map(p => p.days))),
      cancellationPolicy: formData.cancellationPolicy,
      totalSold: editingPass?.totalSold || 0,
      revenue: editingPass?.revenue || 0,
      createdAt: editingPass?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingPass) {
      setPasses(passes.map(p => p.id === editingPass.id ? newPass : p));
      toast.success("Pass updated successfully!");
    } else {
      setPasses([...passes, newPass]);
      toast.success("Pass created successfully!");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      shortDesc: "",
      status: "active",
      featured: false,
      popular: false,
      color: "#3b82f6",
      features: [""],
      heroTitle: "",
      heroSubtitle: "",
      aboutContent: "",
      benefits: [""],
      cancellationPolicy: "",
      card_image_url: "",
      hero_image_url: "",
    });
    setPricingOptions([{ days: 1, ageGroup: "adult", price: 0 }]);
    setSelectedVenues([]);
    setEditingPass(null);
    setCurrentTab("basic");
  };

  const stats = [
    { label: "Total Passes", value: passes.length, icon: DollarSign },
    { label: "Active", value: passes.filter(p => p.status === "active").length, icon: Users },
    { label: "Total Sold", value: adminPassesStats.totalSold, icon: Calendar },
    { label: "Revenue", value: `₺${adminPassesStats.totalRevenue.toLocaleString()}`, icon: DollarSign }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Pass Management</h2>
            <p className="text-muted-foreground">Create and manage TuristPass products</p>
          </div>
          <Button size="lg" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Create New Pass
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search passes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPasses.map((pass) => (
                <Card key={pass.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      <div className="flex-1 p-6">
                        <div className="flex flex-wrap items-start gap-2 mb-3">
                          <h3 className="font-bold text-lg">{pass.name}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={pass.status === "active" ? "default" : "secondary"}>{pass.status}</Badge>
                            {pass.featured && <Badge variant="outline">Featured</Badge>}
                            {pass.popular && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Popular</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{pass.shortDescription}</p>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Pricing Options</p>
                            <p className="text-sm font-medium">{pass.pricingOptions.length} options</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Venues</p>
                            <p className="text-2xl font-bold">{pass.venues.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Sold</p>
                            <p className="text-2xl font-bold">{pass.totalSold}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                            <p className="text-2xl font-bold">₺{pass.revenue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex lg:flex-col gap-2 p-4 lg:p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l">
                        <Button variant="ghost" size="sm" className="flex-1 lg:w-full" onClick={() => handlePreview(pass)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 lg:w-full" onClick={() => handleEdit(pass)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 lg:w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDeleteClick(pass.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingPass ? "Edit Pass" : "Create New Pass"}</DialogTitle>
              <p className="text-sm text-muted-foreground">Configure all pass settings, pricing, venues, and content</p>
            </DialogHeader>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="venues">Venues</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="passName">Pass Name *</Label>
                      <Input
                        id="passName"
                        placeholder="e.g., Istanbul Welcome Pass"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortDesc">Short Description</Label>
                    <Input
                      id="shortDesc"
                      placeholder="Brief description for cards"
                      value={formData.shortDesc}
                      onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description *</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      placeholder="Detailed description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(val) => setFormData({ ...formData, featured: val })}
                      />
                      <Label htmlFor="featured" className="cursor-pointer">Featured</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="popular"
                        checked={formData.popular}
                        onCheckedChange={(val) => setFormData({ ...formData, popular: val })}
                      />
                      <Label htmlFor="popular" className="cursor-pointer">Popular</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Features</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                        <Plus className="h-3 w-3 mr-1" />Add
                      </Button>
                    </div>
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="e.g., Skip the line"
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFeature(index)}
                          disabled={formData.features.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">Pricing Options *</Label>
                    <Button type="button" variant="outline" onClick={handleAddPricing}>
                      <Plus className="h-4 w-4 mr-2" />Add Pricing
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {pricingOptions.map((option, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex-1 grid gap-4 sm:grid-cols-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Days</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={option.days}
                                  onChange={(e) => handlePricingChange(index, "days", parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Age Group</Label>
                                <Select
                                  value={option.ageGroup}
                                  onValueChange={(val) => handlePricingChange(index, "ageGroup", val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="adult">Adult</SelectItem>
                                    <SelectItem value="child">Child</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="senior">Senior</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Price (₺)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={option.price}
                                  onChange={(e) => handlePricingChange(index, "price", parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePricing(index)}
                              disabled={pricingOptions.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-3xl font-bold">₺{calculateTotalPrice()}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{pricingOptions.length} option(s)</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="venues" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Venues *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {venueSearch && filteredVenues.length > 0 && (
                      <Card>
                        <CardContent className="p-0 max-h-64 overflow-y-auto">
                          {filteredVenues.map((venue) => (
                            <button
                              key={venue.id}
                              type="button"
                              className="w-full p-3 hover:bg-muted transition-colors flex items-center justify-between text-left border-b last:border-0"
                              onClick={() => handleAddVenue(venue)}
                            >
                              <div>
                                <p className="font-medium">{venue.name}</p>
                                <p className="text-sm text-muted-foreground">{venue.category}</p>
                              </div>
                              <Plus className="h-4 w-4" />
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Selected Venues ({selectedVenues.length})</Label>
                    {selectedVenues.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No venues selected</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {selectedVenues.map((venue) => (
                          <Card key={venue.id}>
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold">{venue.name}</p>
                                    <p className="text-sm text-muted-foreground">{venue.category}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveVenue(venue.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Discount %</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={venue.discount}
                                      onChange={(e) => handleVenueChange(venue.id, "discount", parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Usage Type</Label>
                                    <Select
                                      value={venue.usageType}
                                      onValueChange={(val) => handleVenueChange(venue.id, "usageType", val)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="once">Once</SelectItem>
                                        <SelectItem value="unlimited">Unlimited</SelectItem>
                                        <SelectItem value="limited">Limited</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {venue.usageType === "limited" && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">Max Usage</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={venue.maxUsage || 1}
                                        onChange={(e) => handleVenueChange(venue.id, "maxUsage", parseInt(e.target.value) || 1)}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Homepage Title</Label>
                      <Input
                        placeholder="e.g., Explore Istanbul"
                        value={formData.heroTitle}
                        onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Homepage Subtitle</Label>
                      <Input
                        placeholder="e.g., Get access to 50+ attractions"
                        value={formData.heroSubtitle}
                        onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>About Content</Label>
                    <Textarea
                      rows={4}
                      placeholder="Detailed information..."
                      value={formData.aboutContent}
                      onChange={(e) => setFormData({ ...formData, aboutContent: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Benefits</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddBenefit}>
                        <Plus className="h-3 w-3 mr-1" />Add
                      </Button>
                    </div>
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="e.g., Free entry"
                          value={benefit}
                          onChange={(e) => handleBenefitChange(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBenefit(index)}
                          disabled={formData.benefits.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Cancellation Policy</Label>
                    <Textarea
                      rows={3}
                      placeholder="Free cancellation up to..."
                      value={formData.cancellationPolicy}
                      onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <ImageUpload
                    label="Pass Card Image (Optional)"
                    value={formData.card_image_url}
                    onChange={(url) => setFormData({ ...formData, card_image_url: url })}
                    bucket="banners"
                    folder="passes/cards"
                    maxSize={5}
                    previewHeight="150px"
                  />

                  <ImageUpload
                    label="Pass Hero Image (Optional)"
                    value={formData.hero_image_url}
                    onChange={(url) => setFormData({ ...formData, hero_image_url: url })}
                    bucket="banners"
                    folder="passes/heroes"
                    maxSize={10}
                    previewHeight="200px"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePass}>
                <Save className="h-4 w-4 mr-2" />
                {editingPass ? "Update Pass" : "Create Pass"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pass Preview</DialogTitle>
            </DialogHeader>
            {previewPass && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{previewPass.name}</h3>
                  <p className="text-muted-foreground">{previewPass.description}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Pricing Options</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {previewPass.pricingOptions.map((opt, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{opt.days} Day{opt.days > 1 ? 's' : ''} - {opt.ageGroup}</p>
                        <p className="text-lg font-bold">₺{opt.basePrice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Included Venues ({previewPass.venues.length})</h4>
                  <div className="space-y-2">
                    {previewPass.venues.map((venue, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium">{venue.venueName}</p>
                          <p className="text-xs text-muted-foreground">{venue.category}</p>
                        </div>
                        <Badge>{venue.discountPercent}% off</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {previewPass.features.map((feature, idx) => (
                      <li key={idx} className="text-sm">{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Delete Pass
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this pass? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
