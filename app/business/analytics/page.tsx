"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, MousePointerClick, ShoppingCart, TrendingUp, TrendingDown,
  Calendar, DollarSign, Users, Target, BarChart3
} from "lucide-react";
import { format, subDays } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  campaign_type: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface CampaignStats {
  campaign_id: string;
  total_views: number;
  total_clicks: number;
  total_redemptions: number;
  total_unique_customers: number;
  total_discount_given: number;
  total_revenue_generated: number;
  avg_conversion_rate: number;
  daily_stats: {
    date: string;
    views: number;
    clicks: number;
    redemptions: number;
    conversion_rate: number;
  }[];
}

interface OverviewStats {
  total_campaigns: number;
  active_campaigns: number;
  total_views: number;
  total_clicks: number;
  total_redemptions: number;
  total_discount_given: number;
  total_revenue_generated: number;
  avg_conversion_rate: number;
}

export default function BusinessAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
    loadOverviewStats();
  }, []);

  useEffect(() => {
    if (selectedCampaignId && selectedCampaignId !== 'all') {
      loadCampaignStats(selectedCampaignId);
    } else {
      setCampaignStats(null);
    }
  }, [selectedCampaignId]);

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/business/campaigns');
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns || []);
        if (data.campaigns.length > 0) {
          setSelectedCampaignId(data.campaigns[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignStats = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/business/campaigns/${campaignId}/stats`);
      const data = await response.json();

      if (data.success) {
        setCampaignStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading campaign stats:', error);
    }
  };

  const loadOverviewStats = async () => {
    try {
      const response = await fetch('/api/business/analytics/overview');
      const data = await response.json();

      if (data.success) {
        setOverviewStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading overview stats:', error);
    }
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 10) return 'text-green-600';
    if (rate >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Analytics</h1>
        <p className="text-gray-500 mt-1">Track your campaign performance and customer engagement</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Select campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns Overview</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      {selectedCampaignId === 'all' && overviewStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_campaigns}</div>
                <p className="text-xs text-muted-foreground">
                  {overviewStats.active_campaigns} active
                </p>
              </CardContent>
            </Card>

            {/* Total Views */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_views.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Across all campaigns
                </p>
              </CardContent>
            </Card>

            {/* Total Clicks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_clicks.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Click-through rate: {overviewStats.total_views > 0 ? ((overviewStats.total_clicks / overviewStats.total_views) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>

            {/* Total Redemptions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.total_redemptions.toLocaleString()}</div>
                <p className={`text-xs ${getConversionColor(overviewStats.avg_conversion_rate)}`}>
                  Conversion rate: {overviewStats.avg_conversion_rate.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            {/* Total Discount Given */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Discount Given</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{overviewStats.total_discount_given.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Investment in campaigns
                </p>
              </CardContent>
            </Card>

            {/* Total Revenue Generated */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{overviewStats.total_revenue_generated.toFixed(2)}</div>
                <p className="text-xs text-green-600">
                  ROI: {overviewStats.total_discount_given > 0 ? ((overviewStats.total_revenue_generated / overviewStats.total_discount_given) * 100).toFixed(0) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Detailed breakdown of each campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Campaign</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Views</th>
                      <th className="text-right py-3 px-4 font-medium">Clicks</th>
                      <th className="text-right py-3 px-4 font-medium">Redemptions</th>
                      <th className="text-right py-3 px-4 font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No campaigns found
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{campaign.title}</div>
                            <div className="text-sm text-gray-500">{campaign.campaign_type}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-4">-</td>
                          <td className="text-right py-3 px-4">-</td>
                          <td className="text-right py-3 px-4">-</td>
                          <td className="text-right py-3 px-4">-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Campaign Stats */}
      {selectedCampaignId !== 'all' && campaignStats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignStats.total_views.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignStats.total_clicks.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  CTR: {campaignStats.total_views > 0 ? ((campaignStats.total_clicks / campaignStats.total_views) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignStats.total_redemptions.toLocaleString()}</div>
                <p className={`text-xs ${getConversionColor(campaignStats.avg_conversion_rate)}`}>
                  {campaignStats.avg_conversion_rate.toFixed(2)}% conversion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignStats.total_unique_customers.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Discount Given</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{campaignStats.total_discount_given.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg per redemption: ₺{campaignStats.total_redemptions > 0 ? (campaignStats.total_discount_given / campaignStats.total_redemptions).toFixed(2) : 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{campaignStats.total_revenue_generated.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Before discount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaignStats.total_discount_given > 0 ? ((campaignStats.total_revenue_generated / campaignStats.total_discount_given) * 100).toFixed(0) : 0}%
                </div>
                <p className="text-xs text-green-600">
                  Return on investment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Last {dateRange} days activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-right py-3 px-4 font-medium">Views</th>
                      <th className="text-right py-3 px-4 font-medium">Clicks</th>
                      <th className="text-right py-3 px-4 font-medium">Redemptions</th>
                      <th className="text-right py-3 px-4 font-medium">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignStats.daily_stats && campaignStats.daily_stats.length > 0 ? (
                      campaignStats.daily_stats.map((day, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{format(new Date(day.date), 'MMM d, yyyy')}</td>
                          <td className="text-right py-3 px-4">{day.views}</td>
                          <td className="text-right py-3 px-4">{day.clicks}</td>
                          <td className="text-right py-3 px-4">{day.redemptions}</td>
                          <td className={`text-right py-3 px-4 ${getConversionColor(day.conversion_rate || 0)}`}>
                            {(day.conversion_rate || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No daily stats available yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
