"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Edit, Trash2, TrendingUp, Users, DollarSign, Calendar, CheckCircle, Clock, XCircle, Pause } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_type: string;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  status: string;
  admin_approved: boolean;
  redemptions_count: number;
  max_redemptions: number | null;
  budget_spent: number;
  total_budget: number | null;
  views_count: number;
  clicks_count: number;
  promo_code: string | null;
  created_at: string;
}

export default function BusinessCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    campaign_type: "discount",
    discount_type: "percentage",
    discount_value: "",
    minimum_purchase_amount: "",
    maximum_discount_amount: "",
    start_date: "",
    end_date: "",
    total_budget: "",
    max_redemptions: "",
    max_redemptions_per_customer: "1",
    promo_code: "",
    terms_and_conditions: ""
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/business/campaigns');
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns || []);
      } else {
        toast.error(data.error || 'Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const response = await fetch('/api/business/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value),
          minimum_purchase_amount: formData.minimum_purchase_amount ? parseFloat(formData.minimum_purchase_amount) : 0,
          maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
          total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
          max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : null,
          max_redemptions_per_customer: parseInt(formData.max_redemptions_per_customer)
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Campaign created successfully! Waiting for admin approval.');
        setIsCreateDialogOpen(false);
        loadCampaigns();
        // Reset form
        setFormData({
          title: "",
          description: "",
          campaign_type: "discount",
          discount_type: "percentage",
          discount_value: "",
          minimum_purchase_amount: "",
          maximum_discount_amount: "",
          start_date: "",
          end_date: "",
          total_budget: "",
          max_redemptions: "",
          max_redemptions_per_customer: "1",
          promo_code: "",
          terms_and_conditions: ""
        });
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const getStatusBadge = (status: string, adminApproved: boolean) => {
    if (status === 'draft') {
      return <Badge variant="secondary"><Edit className="w-3 h-3 mr-1" />Draft</Badge>;
    }
    if (status === 'pending_approval') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />Pending Approval
      </Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    if (status === 'active' && adminApproved) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    }
    if (status === 'paused') {
      return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
    }
    if (status === 'completed') {
      return <Badge variant="outline">Completed</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const getDiscountDisplay = (campaign: Campaign) => {
    if (campaign.discount_type === 'percentage') {
      return `${campaign.discount_value}% Off`;
    } else if (campaign.discount_type === 'fixed_amount') {
      return `₺${campaign.discount_value} Off`;
    } else {
      return campaign.discount_type.replace('_', ' ').toUpperCase();
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return campaign.status === 'active' && campaign.admin_approved;
    if (activeTab === 'pending') return campaign.status === 'pending_approval';
    if (activeTab === 'completed') return campaign.status === 'completed';
    return true;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active' && c.admin_approved).length,
    pending: campaigns.filter(c => c.status === 'pending_approval').length,
    totalRedemptions: campaigns.reduce((sum, c) => sum + c.redemptions_count, 0),
    totalBudgetSpent: campaigns.reduce((sum, c) => sum + (c.budget_spent || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-500 mt-1">Create and manage your promotional campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new promotional campaign. It will be sent for admin approval.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Summer Sale 2025"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your campaign..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign_type">Campaign Type *</Label>
                    <Select
                      value={formData.campaign_type}
                      onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="special_offer">Special Offer</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="limited_time">Limited Time</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="discount_type">Discount Type *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                        <SelectItem value="free_item">Free Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_value">
                      Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(₺)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '50'}
                      required
                    />
                  </div>

                  {formData.discount_type === 'percentage' && (
                    <div>
                      <Label htmlFor="maximum_discount_amount">Max Discount (₺)</Label>
                      <Input
                        id="maximum_discount_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maximum_discount_amount}
                        onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_budget">Total Budget (₺)</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.total_budget}
                      onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                      placeholder="1000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_redemptions">Max Redemptions</Label>
                    <Input
                      id="max_redemptions"
                      type="number"
                      min="1"
                      value={formData.max_redemptions}
                      onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="promo_code">Promo Code (Optional)</Label>
                  <Input
                    id="promo_code"
                    value={formData.promo_code}
                    onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2025"
                  />
                </div>

                <div>
                  <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
                  <Textarea
                    id="terms_and_conditions"
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    placeholder="Campaign terms and conditions..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Campaign
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalRedemptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Budget Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{stats.totalBudgetSpent.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-4">Create your first campaign to start promoting your business</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
                        {getStatusBadge(campaign.status, campaign.admin_approved)}
                        <Badge variant="outline" className="bg-blue-50">
                          {getDiscountDisplay(campaign)}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-gray-600 text-sm mb-2">{campaign.description}</p>
                      )}
                      {campaign.promo_code && (
                        <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm font-mono">
                          Code: {campaign.promo_code}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-500">Duration</div>
                        <div className="font-medium">
                          {format(new Date(campaign.start_date), 'MMM d')} - {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-500">Redemptions</div>
                        <div className="font-medium">
                          {campaign.redemptions_count}
                          {campaign.max_redemptions && ` / ${campaign.max_redemptions}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-500">Views</div>
                        <div className="font-medium">{campaign.views_count}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-500">Budget Spent</div>
                        <div className="font-medium">
                          ₺{campaign.budget_spent.toFixed(2)}
                          {campaign.total_budget && ` / ₺${campaign.total_budget}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/business/campaigns/${campaign.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
