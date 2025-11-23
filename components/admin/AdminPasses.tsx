"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import AdminLayout from "./AdminLayout";
import { Plus, Search, Edit, Trash2, Eye, X, MapPin, DollarSign, Calendar, Users, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PricingOption {
  days: number;
  ageGroup: string;
  price: number;
}

interface Business {
  id: string;
  name: string;
  category: string;
  discount: number;
  usageType: string;
  maxUsage?: number;
}

interface Pass {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  status: string;
  featured: boolean;
  popular: boolean;
  features: string[];
  pricing: PricingOption[];
  businesses: number;
  totalSold: number;
  revenue: number;
}

export default function AdminPasses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPass, setEditingPass] = useState<string | null>(null);

  // Data states
  const [passes, setPasses] = useState<Pass[]>([]);
  const [stats, setStats] = useState({ totalPasses: 0, active: 0, totalSold: 0, revenue: 0 });
  const [allBusinesses, setAllBusinesses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDesc: "",
    status: "active",
    featured: false,
    popular: false,
    features: [""],
    heroTitle: "",
    heroSubtitle: "",
    aboutContent: "",
    benefits: [""],
    cancellationPolicy: "",
  });

  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([
    { days: 1, ageGroup: "adult", price: 0 }
  ]);

  const [selectedBusinesses, setSelectedBusinesses] = useState<Business[]>([]);
  const [businessSearch, setBusinessSearch] = useState("");

  // Fetch data on mount
  useEffect(() => {
    fetchPasses();
    fetchBusinesses();
  }, []);

  const fetchPasses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/passes');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPasses(data.passes);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load passes:', err);
      toast.error('Failed to load passes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      // Fetch only active businesses for pass creation
      const response = await fetch('/api/admin/businesses?status=active');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      console.log('Fetched businesses:', data.businesses?.length || 0);
      setAllBusinesses(data.businesses || []);
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setAllBusinesses([]);
    }
  };

  const filteredPasses = passes.filter(pass =>
    pass.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter businesses: only show if search is active AND not already selected
  const filteredBusinesses = allBusinesses.filter(business => {
    // Don't show if no search query
    if (!businessSearch || businessSearch.trim() === "") return false;

    // Don't show if already selected
    if (selectedBusinesses.find(v => v.id === business.id)) return false;

    // Show if matches search
    const searchLower = businessSearch.toLowerCase();
    return business.name.toLowerCase().includes(searchLower) ||
           business.category.toLowerCase().includes(searchLower);
  });

  const handleAddPricing = () => {
    setPricingOptions([...pricingOptions, { days: 1, ageGroup: "adult", price: 0 }]);
  };

  const handleRemovePricing = (index: number) => {
    if (pricingOptions.length > 1) {
      setPricingOptions(pricingOptions.filter((_, i) => i !== index));
    }
  };

  const handlePricingChange = (index: number, field: keyof PricingOption, value: string | number) => {
    const updated = [...pricingOptions];
    updated[index] = { ...updated[index], [field]: value };
    setPricingOptions(updated);
  };

  const handleAddBusiness = (business: typeof allBusinesses[0]) => {
    if (selectedBusinesses.find(v => v.id === business.id)) {
      toast.error("Business already added");
      return;
    }
    setSelectedBusinesses([...selectedBusinesses, {
      id: business.id,
      name: business.name,
      category: business.category,
      discount: 10,
      usageType: "once",
    }]);
    setBusinessSearch("");
  };

  const handleRemoveBusiness = (businessId: string) => {
    setSelectedBusinesses(selectedBusinesses.filter(v => v.id !== businessId));
  };

  const handleBusinessChange = (businessId: string, field: string, value: string | number) => {
    setSelectedBusinesses(selectedBusinesses.map(v =>
      v.id === businessId ? { ...v, [field]: value } : v
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

  const handleSavePass = async () => {
    // Validation
    if (!formData.name || !formData.description) {
      toast.error("Please fill name and description");
      return;
    }

    if (pricingOptions.length === 0 || pricingOptions.some(p => !p.days || !p.price)) {
      toast.error("Please add at least one complete pricing option");
      return;
    }

    if (selectedBusinesses.length === 0) {
      toast.error("Please add at least one business");
      return;
    }

    // Filter out empty features and benefits
    const cleanFeatures = formData.features.filter(f => f.trim() !== "");
    const cleanBenefits = formData.benefits.filter(b => b.trim() !== "");

    try {
      setIsSaving(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDesc,
        status: formData.status,
        featured: formData.featured,
        popular: formData.popular,
        features: cleanFeatures,
        benefits: cleanBenefits,
        heroTitle: formData.heroTitle,
        heroSubtitle: formData.heroSubtitle,
        aboutContent: formData.aboutContent,
        cancellationPolicy: formData.cancellationPolicy,
        pricing: pricingOptions,
        businesses: selectedBusinesses.map(v => ({
          businessId: v.id,
          discount: v.discount,
          usageType: v.usageType,
          maxUsage: v.maxUsage
        }))
      };

      const url = editingPass ? `/api/admin/passes/${editingPass}` : '/api/admin/passes';
      const method = editingPass ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(editingPass ? 'Pass updated successfully!' : 'Pass created successfully!');
      setIsDialogOpen(false);
      resetForm();
      fetchPasses(); // Refresh list
    } catch (err) {
      toast.error('Failed to save pass');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPass = async (passId: string) => {
    try {
      // Fetch full pass details
      const response = await fetch(`/api/admin/passes/${passId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const { pass: passDetails } = await response.json();

      const passData = passDetails.pass;
      const pricing = passDetails.pricing || [];
      const businesses = passDetails.businesses || [];

      // Populate form
      setFormData({
        name: passData.name || "",
        description: passData.description || "",
        shortDesc: passData.short_description || "",
        status: passData.status || "active",
        featured: passData.featured || false,
        popular: passData.popular || false,
        features: passData.features && passData.features.length > 0 ? passData.features : [""],
        heroTitle: passData.hero_title || "",
        heroSubtitle: passData.hero_subtitle || "",
        aboutContent: passData.about_content || "",
        benefits: passData.benefits && passData.benefits.length > 0 ? passData.benefits : [""],
        cancellationPolicy: passData.cancellation_policy || "",
      });

      setPricingOptions(pricing.map((p: any) => ({
        days: p.days,
        ageGroup: p.age_group,
        price: p.price
      })));

      setSelectedBusinesses(businesses.map((v: any) => ({
        id: v.business.id,
        name: v.business.name,
        category: v.business.category,
        discount: v.discount,
        usageType: v.usage_type,
        maxUsage: v.max_usage
      })));

      setEditingPass(passId);
      setIsDialogOpen(true);
    } catch (err) {
      toast.error('Failed to load pass details');
    }
  };

  const handleDeletePass = async (passId: string, passName: string) => {
    if (!confirm(`Are you sure you want to delete "${passName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/passes/${passId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Pass deleted successfully');
      fetchPasses(); // Refresh list
    } catch (err) {
      toast.error('Failed to delete pass');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      shortDesc: "",
      status: "active",
      featured: false,
      popular: false,
      features: [""],
      heroTitle: "",
      heroSubtitle: "",
      aboutContent: "",
      benefits: [""],
      cancellationPolicy: "",
    });
    setPricingOptions([{ days: 1, ageGroup: "adult", price: 0 }]);
    setSelectedBusinesses([]);
    setCurrentTab("basic");
    setEditingPass(null);
  };

  const statsCards = [
    { label: "Total Passes", value: stats.totalPasses, icon: DollarSign },
    { label: "Active", value: stats.active, icon: Users },
    { label: "Total Sold", value: stats.totalSold, icon: Calendar },
    { label: "Revenue", value: `₺${stats.revenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Pass Management</h2>
            <p className="text-muted-foreground">Create and manage TuristPass products with detailed options</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="h-4 w-4 mr-2" />Create New Pass</Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{editingPass ? 'Edit Pass' : 'Create New Pass'}</DialogTitle>
                <p className="text-sm text-muted-foreground">Configure all pass settings, pricing, businesses, and content</p>
              </DialogHeader>

              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing & Duration</TabsTrigger>
                  <TabsTrigger value="businesses">Businesses & Usage</TabsTrigger>
                  <TabsTrigger value="content">Homepage & Content</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid gap-6">
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
                        <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
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
                      <Label htmlFor="shortDesc">Short Description (for cards)</Label>
                      <Input
                        id="shortDesc"
                        placeholder="Brief one-liner description"
                        value={formData.shortDesc}
                        onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Full Description *</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        placeholder="Detailed description of the pass, benefits, and what's included..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <Separator />

                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="featured"
                          checked={formData.featured}
                          onCheckedChange={(val) => setFormData({ ...formData, featured: val })}
                        />
                        <Label htmlFor="featured" className="cursor-pointer">Show on Homepage</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="popular"
                          checked={formData.popular}
                          onCheckedChange={(val) => setFormData({ ...formData, popular: val })}
                        />
                        <Label htmlFor="popular" className="cursor-pointer">Mark as Popular</Label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Key Features *</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                          <Plus className="h-3 w-3 mr-1" />Add Feature
                        </Button>
                      </div>
                      {formData.features.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="e.g., Skip the line access"
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
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="text-lg">Pricing Options *</Label>
                          <p className="text-sm text-muted-foreground">Add different durations and age groups</p>
                        </div>
                        <Button type="button" variant="outline" onClick={handleAddPricing}>
                          <Plus className="h-4 w-4 mr-2" />Add Pricing
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {pricingOptions.map((option, index) => (
                          <Card key={index} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                <div className="flex-1 grid gap-4 sm:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Duration (Days)</Label>
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
                                        <SelectItem value="adult">Adult (18+)</SelectItem>
                                        <SelectItem value="child">Child (5-17)</SelectItem>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="senior">Senior (65+)</SelectItem>
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
                    </div>

                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Base Price</p>
                            <p className="text-3xl font-bold mt-1">₺{calculateTotalPrice()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{pricingOptions.length} pricing option(s)</p>
                            <p className="text-xs text-muted-foreground mt-1">Configured</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="businesses" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Manage Businesses *</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select businesses from the left list and configure their settings on the right
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* LEFT: Available Businesses */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">All Businesses ({allBusinesses.filter(v => !selectedBusinesses.find(sv => sv.id === v.id)).length})</CardTitle>
                          <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search businesses..."
                              value={businessSearch}
                              onChange={(e) => setBusinessSearch(e.target.value)}
                              className="pl-10 h-9"
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="max-h-96 overflow-y-auto">
                            {allBusinesses
                              .filter(business => {
                                // Hide if already selected
                                if (selectedBusinesses.find(v => v.id === business.id)) return false;
                                // Filter by search
                                if (businessSearch) {
                                  const searchLower = businessSearch.toLowerCase();
                                  return business.name.toLowerCase().includes(searchLower) ||
                                         business.category.toLowerCase().includes(searchLower);
                                }
                                return true;
                              })
                              .map((business) => (
                                <button
                                  key={business.id}
                                  type="button"
                                  className="w-full p-3 hover:bg-muted transition-colors flex items-center justify-between text-left border-b last:border-0"
                                  onClick={() => handleAddBusiness(business)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{business.name}</p>
                                    <p className="text-sm text-muted-foreground">{business.category}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                                </button>
                              ))}
                            {allBusinesses.filter(v => !selectedBusinesses.find(sv => sv.id === v.id)).length === 0 && (
                              <div className="py-12 text-center text-muted-foreground">
                                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">All businesses selected</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* RIGHT: Selected Businesses */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Selected Businesses ({selectedBusinesses.length})</CardTitle>
                          <p className="text-sm text-muted-foreground">Configure discount and usage for each business</p>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="max-h-96 overflow-y-auto">
                            {selectedBusinesses.length === 0 ? (
                              <div className="py-12 text-center text-muted-foreground">
                                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No businesses selected</p>
                                <p className="text-xs mt-1">Click businesses from the left to add</p>
                              </div>
                            ) : (
                              <div className="divide-y">
                                {selectedBusinesses.map((business) => (
                                  <div key={business.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{business.name}</p>
                                        <p className="text-sm text-muted-foreground">{business.category}</p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 flex-shrink-0"
                                        onClick={() => handleRemoveBusiness(business.id)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="grid gap-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                          <Label className="text-xs">Discount %</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={business.discount}
                                            onChange={(e) => handleBusinessChange(business.id, "discount", parseInt(e.target.value) || 0)}
                                            className="h-9"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs">Usage Type</Label>
                                          <Select
                                            value={business.usageType}
                                            onValueChange={(val) => handleBusinessChange(business.id, "usageType", val)}
                                          >
                                            <SelectTrigger className="h-9">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="once">Once</SelectItem>
                                              <SelectItem value="unlimited">Unlimited</SelectItem>
                                              <SelectItem value="limited">Limited</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      {business.usageType === "limited" && (
                                        <div className="space-y-1.5">
                                          <Label className="text-xs">Max Usage Count</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={business.maxUsage || 1}
                                            onChange={(e) => handleBusinessChange(business.id, "maxUsage", parseInt(e.target.value) || 1)}
                                            className="h-9"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg mb-3 block">Homepage Content</Label>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="heroTitle">Hero Title</Label>
                          <Input
                            id="heroTitle"
                            placeholder="e.g., Explore Istanbul Like Never Before"
                            value={formData.heroTitle}
                            onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                          <Input
                            id="heroSubtitle"
                            placeholder="e.g., Get access to 50+ attractions with one pass"
                            value={formData.heroSubtitle}
                            onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="aboutContent">About Content</Label>
                      <Textarea
                        id="aboutContent"
                        rows={5}
                        placeholder="Detailed information about this pass, what makes it special, and what customers can expect..."
                        value={formData.aboutContent}
                        onChange={(e) => setFormData({ ...formData, aboutContent: e.target.value })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Pass Benefits</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddBenefit}>
                          <Plus className="h-3 w-3 mr-1" />Add Benefit
                        </Button>
                      </div>
                      {formData.benefits.map((benefit, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="e.g., Free entry to all museums"
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
                      <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                      <Textarea
                        id="cancellationPolicy"
                        rows={3}
                        placeholder="Free cancellation up to 24 hours before first use. Full refund guaranteed..."
                        value={formData.cancellationPolicy}
                        onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-initial" disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSavePass} className="flex-1 sm:flex-initial" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingPass ? 'Update Pass' : 'Create Pass'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {statsCards.map((stat) => (
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
          </>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search passes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No passes found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Create your first pass to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPasses.map((pass) => (
                  <Card key={pass.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex flex-wrap items-start gap-2 mb-3">
                            <h3 className="font-bold text-lg">{pass.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={pass.status === "active" ? "default" : pass.status === "draft" ? "secondary" : "outline"}>{pass.status}</Badge>
                              {pass.featured && <Badge variant="outline">Featured</Badge>}
                              {pass.popular && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Popular</Badge>}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{pass.description}</p>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                              <div className="space-y-1">
                                {pass.pricing.slice(0, 2).map((price, idx) => (
                                  <p key={idx} className="text-sm font-medium">{price.days}d / ₺{price.price}</p>
                                ))}
                                {pass.pricing.length > 2 && (
                                  <p className="text-xs text-muted-foreground">+{pass.pricing.length - 2} more</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Businesses</p>
                              <p className="text-2xl font-bold">{pass.businesses}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Total Sold</p>
                              <p className="text-2xl font-bold">{pass.totalSold}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                              <p className="text-2xl font-bold">₺{pass.revenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex lg:flex-col gap-2 p-4 lg:p-6 bg-muted/30 border-t lg:border-t-0 lg:border-l">
                          <Button variant="ghost" size="sm" className="flex-1 lg:w-full" onClick={() => toast.info('Preview feature coming soon')}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 lg:w-full" onClick={() => handleEditPass(pass.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 lg:w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => handleDeletePass(pass.id, pass.name)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
