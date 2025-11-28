"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Building2,
  Calendar, Percent, DollarSign, Target, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Campaign {
  id: string;
  business_id: string;
  title: string;
  description: string;
  campaign_type: string;
  discount_type: string;
  discount_value: number;
  minimum_purchase_amount: number;
  maximum_discount_amount: number | null;
  start_date: string;
  end_date: string;
  total_budget: number | null;
  max_redemptions: number | null;
  max_redemptions_per_customer: number;
  status: string;
  visibility: string;
  image_url: string | null;
  terms_and_conditions: string | null;
  promo_code: string | null;
  admin_approved: boolean;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  businesses?: {
    name: string;
    email: string;
  };
}

interface ReviewFormData {
  action: 'approve' | 'reject';
  notes: string;
  rejection_reason?: string;
}

export default function AdminCampaignApprovalsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending_approval');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>({
    action: 'approve',
    notes: '',
    rejection_reason: ''
  });

  useEffect(() => {
    loadCampaigns();
  }, [filterStatus]);

  const loadCampaigns = async () => {
    try {
      const url = filterStatus === 'all'
        ? '/api/admin/campaigns?type=business'
        : `/api/admin/campaigns?type=business&status=${filterStatus}`;

      const response = await fetch(url);
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

  const handleReviewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setReviewForm({
      action: 'approve',
      notes: campaign.admin_notes || '',
      rejection_reason: campaign.rejection_reason || ''
    });
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedCampaign) return;

    if (reviewForm.action === 'reject' && !reviewForm.rejection_reason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch(`/api/admin/campaigns/${selectedCampaign.id}/${reviewForm.action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reviewForm.notes,
          rejection_reason: reviewForm.rejection_reason
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Campaign ${reviewForm.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setIsReviewDialogOpen(false);
        setSelectedCampaign(null);
        setReviewForm({ action: 'approve', notes: '', rejection_reason: '' });
        loadCampaigns();
      } else {
        toast.error(data.error || 'Failed to review campaign');
      }
    } catch (error) {
      console.error('Error reviewing campaign:', error);
      toast.error('Failed to review campaign');
    }
  };

  const getStatusBadge = (status: string, adminApproved: boolean) => {
    const badges: Record<string, { variant: any; icon: any; label: string; className?: string }> = {
      pending_approval: { variant: 'secondary', icon: Clock, label: 'Pending', className: 'bg-yellow-600 text-white' },
      active: { variant: 'default', icon: CheckCircle, label: 'Active', className: 'bg-green-600' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      completed: { variant: 'outline', icon: CheckCircle, label: 'Completed' },
      draft: { variant: 'outline', icon: AlertCircle, label: 'Draft' }
    };

    const badge = badges[status] || { variant: 'outline', icon: AlertCircle, label: status };
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className={badge.className}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      discount: 'Discount',
      special_offer: 'Special Offer',
      event: 'Event',
      limited_time: 'Limited Time',
      seasonal: 'Seasonal'
    };
    return labels[type] || type;
  };

  const getDiscountDisplay = (campaign: Campaign) => {
    if (campaign.discount_type === 'percentage') {
      return `${campaign.discount_value}% off`;
    } else if (campaign.discount_type === 'fixed_amount') {
      return `₺${campaign.discount_value} off`;
    } else if (campaign.discount_type === 'buy_x_get_y') {
      return 'Buy X Get Y';
    } else if (campaign.discount_type === 'free_item') {
      return 'Free Item';
    }
    return 'N/A';
  };

  const pendingCount = campaigns.filter(c => c.status === 'pending_approval').length;
  const approvedCount = campaigns.filter(c => c.admin_approved).length;
  const rejectedCount = campaigns.filter(c => c.status === 'rejected').length;

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
    <AdminLayout>
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Approvals</h1>
        <p className="text-gray-500 mt-1">Review and approve business campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Total approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Total rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Label>Filter by status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No campaigns to review</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Campaign Image */}
                  {campaign.image_url && (
                    <div className="w-full lg:w-48 h-32 flex-shrink-0">
                      <img
                        src={campaign.image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Campaign Details */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{campaign.title}</h3>
                          {getStatusBadge(campaign.status, campaign.admin_approved)}
                          <Badge variant="outline">{getCampaignTypeLabel(campaign.campaign_type)}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4" />
                          {campaign.businesses?.name} ({campaign.businesses?.email})
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-700">{campaign.description}</p>

                    {/* Campaign Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Discount</div>
                        <div className="font-semibold flex items-center gap-1">
                          <Percent className="w-4 h-4 text-blue-600" />
                          {getDiscountDisplay(campaign)}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-500 mb-1">Duration</div>
                        <div className="font-semibold flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-green-600" />
                          {format(new Date(campaign.start_date), 'MMM d')} - {format(new Date(campaign.end_date), 'MMM d')}
                        </div>
                      </div>

                      {campaign.total_budget && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Budget</div>
                          <div className="font-semibold flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-yellow-600" />
                            ₺{campaign.total_budget.toFixed(2)}
                          </div>
                        </div>
                      )}

                      {campaign.max_redemptions && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Max Redemptions</div>
                          <div className="font-semibold flex items-center gap-1">
                            <Target className="w-4 h-4 text-purple-600" />
                            {campaign.max_redemptions}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    {campaign.minimum_purchase_amount > 0 && (
                      <div className="text-sm text-gray-600">
                        Minimum purchase: ₺{campaign.minimum_purchase_amount}
                      </div>
                    )}

                    {campaign.promo_code && (
                      <div className="text-sm">
                        <span className="text-gray-600">Promo code: </span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{campaign.promo_code}</code>
                      </div>
                    )}

                    {/* Admin Review Info */}
                    {campaign.admin_reviewed_at && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                          <div className="text-sm">
                            <div className="font-semibold text-gray-700">Admin Review</div>
                            {campaign.admin_notes && (
                              <div className="text-gray-600 mt-1">Notes: {campaign.admin_notes}</div>
                            )}
                            {campaign.rejection_reason && (
                              <div className="text-red-600 mt-1">Reason: {campaign.rejection_reason}</div>
                            )}
                            <div className="text-gray-400 text-xs mt-1">
                              Reviewed on {format(new Date(campaign.admin_reviewed_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {campaign.status === 'pending_approval' && (
                        <>
                          <Button
                            onClick={() => handleReviewCampaign(campaign)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Review Campaign
                          </Button>
                        </>
                      )}
                      {campaign.status === 'rejected' && !campaign.admin_approved && (
                        <Button
                          onClick={() => handleReviewCampaign(campaign)}
                          variant="outline"
                          className="text-blue-600"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Re-review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Campaign</DialogTitle>
            <DialogDescription>
              {selectedCampaign?.title} by {selectedCampaign?.businesses?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Action</Label>
              <Select
                value={reviewForm.action}
                onValueChange={(value: 'approve' | 'reject') => setReviewForm({ ...reviewForm, action: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve Campaign</SelectItem>
                  <SelectItem value="reject">Reject Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reviewForm.action === 'reject' && (
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection_reason"
                  value={reviewForm.rejection_reason}
                  onChange={(e) => setReviewForm({ ...reviewForm, rejection_reason: e.target.value })}
                  placeholder="Explain why this campaign is being rejected..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                placeholder="Add internal notes about this review..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmitReview}
                className={reviewForm.action === 'approve' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'bg-red-600 hover:bg-red-700 flex-1'}
              >
                {reviewForm.action === 'approve' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Campaign
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Campaign
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
