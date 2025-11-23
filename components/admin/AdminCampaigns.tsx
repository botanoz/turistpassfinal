"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "./AdminLayout";
import { Plus, Search, Edit, Trash2, Eye, Loader2, Megaphone, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  banner_text: string;
  banner_type: string;
  show_banner: boolean;
  start_date: string;
  end_date: string;
  discount_type?: string;
  discount_value?: number;
  status: string;
  priority: number;
}

interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  max_uses_per_customer: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_until: string;
  status: string;
  campaign?: {
    id: string;
    title: string;
  };
}

export default function AdminCampaigns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    banner_text: "",
    banner_type: "promotion",
    show_banner: true,
    start_date: "",
    end_date: "",
    discount_type: "none",
    discount_value: 0,
    status: "draft",
    priority: 0,
  });

  const [discountCodeData, setDiscountCodeData] = useState({
    enabled: false,
    code: "",
    code_description: "",
    max_uses: "",
    max_uses_per_customer: "1",
    min_purchase_amount: "0",
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/campaigns');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingCampaign
        ? `/api/admin/campaigns/${editingCampaign}`
        : '/api/admin/campaigns';

      const method = editingCampaign ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save campaign');
      }

      const result = await response.json();
      const campaignId = result.campaign?.id;

      // Create discount code if enabled
      if (discountCodeData.enabled && discountCodeData.code && !editingCampaign && campaignId) {
        try {
          const codeResponse = await fetch('/api/admin/discount-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: campaignId,
              code: discountCodeData.code,
              description: discountCodeData.code_description || null,
              discount_type: formData.discount_type,
              discount_value: formData.discount_value,
              max_uses: discountCodeData.max_uses ? parseInt(discountCodeData.max_uses) : null,
              max_uses_per_customer: parseInt(discountCodeData.max_uses_per_customer),
              min_purchase_amount: parseFloat(discountCodeData.min_purchase_amount),
              valid_from: formData.start_date,
              valid_until: formData.end_date,
              status: 'active',
            }),
          });

          if (!codeResponse.ok) {
            throw new Error('Campaign created but discount code failed');
          }
        } catch (codeErr: any) {
          toast.warning('Campaign created but discount code failed: ' + codeErr.message);
        }
      }

      toast.success(editingCampaign ? 'Campaign updated!' : 'Campaign created!');
      setIsDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (err: any) {
      console.error('Failed to save campaign:', err);
      toast.error(err.message || 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign.id);
    setFormData({
      title: campaign.title,
      subtitle: campaign.subtitle || "",
      description: campaign.description || "",
      banner_text: campaign.banner_text,
      banner_type: campaign.banner_type,
      show_banner: campaign.show_banner,
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      discount_type: campaign.discount_type || "none",
      discount_value: campaign.discount_value || 0,
      status: campaign.status,
      priority: campaign.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Campaign deleted!');
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      toast.error('Failed to delete campaign');
    }
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      banner_text: "",
      banner_type: "promotion",
      show_banner: true,
      start_date: "",
      end_date: "",
      discount_type: "none",
      discount_value: 0,
      status: "draft",
      priority: 0,
    });
    setDiscountCodeData({
      enabled: false,
      code: "",
      code_description: "",
      max_uses: "",
      max_uses_per_customer: "1",
      min_purchase_amount: "0",
    });
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.banner_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500",
      draft: "bg-gray-500",
      scheduled: "bg-blue-500",
      expired: "bg-red-500",
      cancelled: "bg-orange-500",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">Manage promotional campaigns and banners</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Summer Promotion 2025"
                      required
                    />
                  </div>

                  <div>
                    <Label>Subtitle</Label>
                    <Input
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Save 15% on all passes"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed campaign description..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Banner Text *</Label>
                    <Input
                      value={formData.banner_text}
                      onChange={(e) => setFormData({ ...formData, banner_text: e.target.value })}
                      placeholder="Limited Time Offer: 15% OFF - Don't Miss Out!"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Banner Type</Label>
                      <Select value={formData.banner_type} onValueChange={(value) => setFormData({ ...formData, banner_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        checked={formData.show_banner}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_banner: checked })}
                      />
                      <Label>Show Banner</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label>End Date *</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount Type</Label>
                      <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Discount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.discount_type !== 'none' && (
                      <div>
                        <Label>Discount Value</Label>
                        <Input
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                          placeholder="15"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Discount Code Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        checked={discountCodeData.enabled}
                        onCheckedChange={(checked) => setDiscountCodeData({ ...discountCodeData, enabled: checked })}
                        disabled={Boolean(editingCampaign)}
                      />
                      <Label className="font-semibold">Create Discount Code for this Campaign</Label>
                      {editingCampaign && (
                        <span className="text-xs text-muted-foreground">(Only available when creating a new campaign)</span>
                      )}
                    </div>

                    {discountCodeData.enabled && (
                      <div className="space-y-4 pl-6">
                        <div>
                          <Label>Discount Code *</Label>
                          <Input
                            value={discountCodeData.code}
                            onChange={(e) => setDiscountCodeData({ ...discountCodeData, code: e.target.value.toUpperCase() })}
                            placeholder="SUMMER2025"
                            required={discountCodeData.enabled}
                            disabled={Boolean(editingCampaign)}
                          />
                        </div>

                        <div>
                          <Label>Code Description</Label>
                          <Input
                            value={discountCodeData.code_description}
                            onChange={(e) => setDiscountCodeData({ ...discountCodeData, code_description: e.target.value })}
                            placeholder="Summer promotion discount code"
                            disabled={Boolean(editingCampaign)}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Max Uses</Label>
                            <Input
                              type="number"
                              value={discountCodeData.max_uses}
                              onChange={(e) => setDiscountCodeData({ ...discountCodeData, max_uses: e.target.value })}
                              placeholder="Unlimited"
                              disabled={Boolean(editingCampaign)}
                            />
                          </div>

                          <div>
                            <Label>Max Uses Per Customer</Label>
                            <Input
                              type="number"
                              value={discountCodeData.max_uses_per_customer}
                              onChange={(e) => setDiscountCodeData({ ...discountCodeData, max_uses_per_customer: e.target.value })}
                              placeholder="1"
                              disabled={Boolean(editingCampaign)}
                            />
                          </div>

                          <div>
                            <Label>Min Purchase Amount</Label>
                            <Input
                              type="number"
                              value={discountCodeData.min_purchase_amount}
                              onChange={(e) => setDiscountCodeData({ ...discountCodeData, min_purchase_amount: e.target.value })}
                              placeholder="0"
                              disabled={Boolean(editingCampaign)}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          The discount code will use the same discount type, value, and dates as the campaign.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Campaign'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Campaigns List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{campaign.title}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{campaign.banner_text}</p>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                        </div>
                        {campaign.discount_type && campaign.discount_type !== 'none' && (
                          <Badge variant="outline">
                            {campaign.discount_type === 'percentage' ? `${campaign.discount_value}%` : `₺${campaign.discount_value}`} OFF
                          </Badge>
                        )}
                        <Badge variant="outline">Priority: {campaign.priority}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredCampaigns.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No campaigns found</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
