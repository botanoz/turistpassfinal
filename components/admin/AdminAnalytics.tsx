"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from './AdminLayout';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Users,
  Download,
  Calendar,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencySelector } from '@/components/currency/CurrencySelector';
import { formatCurrency as formatWithCurrency } from '@/lib/utils/currency';

interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalPassesSold: number;
  averageOrderValue: number;
  revenueChange: number;
}

interface RevenueDataPoint {
  period: string;
  revenue: number;
  orders: number;
}

interface TopPass {
  pass_id: string;
  pass_name: string;
  total_sold: number;
  total_revenue: number;
  average_price: number;
}

interface TopBusiness {
  business_id: string;
  business_name: string;
  pass_count: number;
  category: string;
}

interface CustomerInsights {
  newCustomers: number;
  repeatCustomers: number;
  topCustomers: Array<{
    customer_id: string;
    customer_name: string;
    total_spent: number;
    order_count: number;
  }>;
}

interface PassCategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  salesAnalytics: SalesAnalytics;
  topPasses: TopPass[];
  topBusinesses: TopBusiness[];
  customerInsights: CustomerInsights;
  passCategoryDistribution: PassCategoryDistribution[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

type DateRangeOption = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_365_days', label: 'Last Year' },
];

export default function AdminAnalytics() {
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('last_30_days');
  const [chartInterval, setChartInterval] = useState<'day' | 'week' | 'month'>('day');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [revenueChartData, setRevenueChartData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [adminCurrency, setAdminCurrency] = useState<any>(null);
  const { currency: selectedCurrency, changeCurrency, loading: currencyLoading } = useCurrency();
  
  // Use admin display currency if available, otherwise fall back to selected currency
  const displayCurrency = adminCurrency || selectedCurrency;

  const getDateRange = (option: DateRangeOption): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (option) {
      case 'this_week':
        // Start from Monday of current week
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0); // Last day of previous month
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_3_months':
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last_90_days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'last_365_days':
        startDate.setDate(endDate.getDate() - 365);
        break;
    }

    return { startDate, endDate };
  };

  const getDateRangeLabel = (option: DateRangeOption): string => {
    const found = DATE_RANGE_OPTIONS.find(opt => opt.value === option);
    return found ? found.label : 'selected period';
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRevenueChart();
  }, [dateRangeOption, chartInterval, selectedCurrency?.currency_code]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(dateRangeOption);

      // If no currency selected, let API use admin display currency
      const currencyParam = selectedCurrency?.currency_code || '';
      const response = await fetch(
        `/api/admin/analytics?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&currency=${currencyParam}`
      );

      if (!response.ok) {
        console.error('Analytics API error:', response.status, response.statusText);
        return;
      }

      const data = await response.json();

      // Set admin currency from API response if available
      if (data.currencyInfo) {
        setAdminCurrency({
          currency_code: data.currencyInfo.code,
          currency_symbol: data.currencyInfo.symbol,
          symbol_position: data.currencyInfo.symbolPosition,
          decimal_places: data.currencyInfo.decimalPlaces,
          exchange_rate: data.currencyInfo.exchangeRate
        });
      }

      if (data.analytics) {
        // If analytics is a JSON string, parse it
        const analytics = typeof data.analytics === 'string'
          ? JSON.parse(data.analytics)
          : data.analytics;

        setAnalyticsData({
          salesAnalytics: analytics.sales_analytics,
          topPasses: analytics.top_passes || [],
          topBusinesses: analytics.top_businesses || [],
          customerInsights: analytics.customer_insights || { newCustomers: 0, repeatCustomers: 0, topCustomers: [] },
          passCategoryDistribution: analytics.pass_category_distribution || []
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueChart = async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRangeOption);

      const response = await fetch(
        `/api/admin/analytics/revenue-chart?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&interval=${chartInterval}&currency=${selectedCurrency?.currency_code || ''}`
      );
      const data = await response.json();

      if (data.revenueData) {
        setRevenueChartData(data.revenueData);
      }
    } catch (error) {
      console.error('Error fetching revenue chart:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'json', type: 'sales' | 'passes' | 'businesses') => {
    setExporting(true);
    try {
      const { startDate, endDate } = getDateRange(dateRangeOption);

      const response = await fetch(
        `/api/admin/analytics/export?format=${format}&type=${type}&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&currency=${selectedCurrency?.currency_code || ''}`
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (displayCurrency) {
      return formatWithCurrency(amount, displayCurrency);
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  if (loading || currencyLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-500">Loading analytics data...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!analyticsData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-500">No data found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-gray-500 mt-1">Detailed sales and performance analytics</p>
          </div>

          <div className="flex gap-2 items-center">
            <CurrencySelector onCurrencyChange={(c) => changeCurrency(c.currency_code)} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv', 'sales')}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json', 'sales')}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2 flex-wrap">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={dateRangeOption === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRangeOption(option.value)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {option.label}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analyticsData.salesAnalytics.totalRevenue)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {analyticsData.salesAnalytics.revenueChange >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={analyticsData.salesAnalytics.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(analyticsData.salesAnalytics.revenueChange).toFixed(1)}%
                </span>
                <span className="ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(analyticsData.salesAnalytics.totalOrders)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average: {formatCurrency(analyticsData.salesAnalytics.averageOrderValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passes Sold</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(analyticsData.salesAnalytics.totalPassesSold)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total pass sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(analyticsData.customerInsights.newCustomers + analyticsData.customerInsights.repeatCustomers)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analyticsData.customerInsights.newCustomers} new, {analyticsData.customerInsights.repeatCustomers} returning
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="passes">Pass Performance</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>{getDateRangeLabel(dateRangeOption)} revenue chart</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {['day', 'week', 'month'].map((interval) => (
                      <Button
                        key={interval}
                        variant={chartInterval === interval ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartInterval(interval as 'day' | 'week' | 'month')}
                      >
                        {interval === 'day' ? 'Daily' : interval === 'week' ? 'Weekly' : 'Monthly'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                        return [value, 'Orders'];
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'revenue' ? 'Revenue' : 'Order Count'}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Passes */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Passes</CardTitle>
                  <CardDescription>By sales performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topPasses.slice(0, 5).map((pass, index) => (
                      <div key={pass.pass_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{pass.pass_name}</p>
                            <p className="text-sm text-gray-500">
                              {pass.total_sold} sales • Avg: {formatCurrency(pass.average_price)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(pass.total_revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Businesses */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Businesses</CardTitle>
                  <CardDescription>Most included in passes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topBusinesses.slice(0, 5).map((business, index) => (
                      <div key={business.business_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{business.business_name}</p>
                            <p className="text-sm text-gray-500">{business.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{business.pass_count} Pass</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Comparison</CardTitle>
                <CardDescription>Periodic revenue and order analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                        return [value, 'Orders'];
                      }}
                    />
                    <Legend
                      formatter={(value) => value === 'revenue' ? 'Revenue (TRY)' : 'Order Count'}
                    />
                    <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Passes Tab */}
          <TabsContent value="passes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pass Category Distribution</CardTitle>
                  <CardDescription>Pass count by categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.passCategoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.passCategoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>All Passes</CardTitle>
                      <CardDescription>Performance details</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv', 'passes')}
                      disabled={exporting}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {analyticsData.topPasses.map((pass) => (
                      <div key={pass.pass_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{pass.pass_name}</p>
                          <p className="text-sm text-gray-500">{pass.total_sold} sales</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(pass.total_revenue)}</p>
                          <p className="text-sm text-gray-500">Avg: {formatCurrency(pass.average_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Business Performance</CardTitle>
                    <CardDescription>Ranked by pass inclusions</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv', 'businesses')}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.topBusinesses.map((business, index) => (
                    <div key={business.business_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{business.business_name}</p>
                          <p className="text-sm text-gray-500">{business.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{business.pass_count}</p>
                        <p className="text-sm text-gray-500">Included in passes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {formatNumber(analyticsData.customerInsights.newCustomers)}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{getDateRangeLabel(dateRangeOption)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Returning Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">
                    {formatNumber(analyticsData.customerInsights.repeatCustomers)}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{getDateRangeLabel(dateRangeOption)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Repeat Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-purple-600">
                    {analyticsData.customerInsights.newCustomers + analyticsData.customerInsights.repeatCustomers > 0
                      ? ((analyticsData.customerInsights.repeatCustomers /
                          (analyticsData.customerInsights.newCustomers + analyticsData.customerInsights.repeatCustomers)) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Customer loyalty</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.customerInsights.topCustomers.slice(0, 10).map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{customer.customer_name}</p>
                          <p className="text-sm text-gray-500">{customer.order_count} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatCurrency(customer.total_spent)}</p>
                        <p className="text-sm text-gray-500">Total spending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
