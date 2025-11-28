"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, Calendar
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  currency: string;
  features: Record<string, boolean>;
  limits: {
    max_campaigns: number;
    monthly_redemptions: number;
    staff_accounts: number;
    api_calls: number;
  };
  is_active: boolean;
  trial_days: number;
  created_at: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  billing_period: string;
  currency: string;
  max_campaigns: number;
  monthly_redemptions: number;
  staff_accounts: number;
  api_calls: number;
  basic_analytics: boolean;
  campaign_creation: boolean;
  pass_validation: boolean;
  customer_support: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  api_access: boolean;
  advanced_analytics: boolean;
  is_active: boolean;
  trial_days: number;
}

interface PlanFormProps {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  buttonText: string;
  onCancel: () => void;
}

// Keep form rendering outside the main component so inputs don't lose focus on each re-render.
const PlanForm = ({
  formData,
  setFormData,
  onSubmit,
  buttonText,
  onCancel
}: PlanFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>Plan Name *</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
      </div>
      <div>
        <Label>Price *</Label>
        <Input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} required />
      </div>
      <div>
        <Label>Currency</Label>
        <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TRY">TRY (�'�)</SelectItem>
            <SelectItem value="USD">USD ($)</SelectItem>
            <SelectItem value="EUR">EUR (�'�)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Billing Period</Label>
        <Select value={formData.billing_period} onValueChange={(value) => setFormData({ ...formData, billing_period: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Trial Days</Label>
        <Input type="number" min="0" value={formData.trial_days} onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })} />
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-2">Limits (-1 = unlimited)</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Max Campaigns</Label>
          <Input type="number" value={formData.max_campaigns} onChange={(e) => setFormData({ ...formData, max_campaigns: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Redemptions/mo</Label>
          <Input type="number" value={formData.monthly_redemptions} onChange={(e) => setFormData({ ...formData, monthly_redemptions: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Staff</Label>
          <Input type="number" value={formData.staff_accounts} onChange={(e) => setFormData({ ...formData, staff_accounts: parseInt(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">API Calls/mo</Label>
          <Input type="number" value={formData.api_calls} onChange={(e) => setFormData({ ...formData, api_calls: parseInt(e.target.value) })} />
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-2">Features</h4>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'basic_analytics', label: 'Basic Analytics' },
          { key: 'campaign_creation', label: 'Campaigns' },
          { key: 'pass_validation', label: 'Pass Validation' },
          { key: 'customer_support', label: 'Support' },
          { key: 'priority_support', label: 'Priority Support' },
          { key: 'custom_branding', label: 'Branding' },
          { key: 'api_access', label: 'API Access' },
          { key: 'advanced_analytics', label: 'Adv. Analytics' }
        ].map((feature) => (
          <div key={feature.key} className="flex items-center justify-between text-sm">
            <Label className="text-xs">{feature.label}</Label>
            <Switch
              checked={formData[feature.key as keyof PlanFormData] as boolean}
              onCheckedChange={(checked) => setFormData({ ...formData, [feature.key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>

    <div className="flex items-center justify-between pt-2">
      <Label>Active</Label>
      <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
    </div>

    <div className="flex gap-2 pt-4 sticky bottom-0 bg-white">
      <Button type="submit" className="flex-1">{buttonText}</Button>
      <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
    </div>
  </form>
);

export default function SubscriptionPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    price: 0,
    billing_period: 'monthly',
    currency: 'TRY',
    max_campaigns: 5,
    monthly_redemptions: 100,
    staff_accounts: 2,
    api_calls: 1000,
    basic_analytics: true,
    campaign_creation: true,
    pass_validation: true,
    customer_support: false,
    priority_support: false,
    custom_branding: false,
    api_access: false,
    advanced_analytics: false,
    is_active: true,
    trial_days: 0
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/admin/subscription-plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans || []);
      } else {
        toast.error(data.error || 'Failed to load plans');
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          billing_period: formData.billing_period,
          currency: formData.currency,
          features: {
            basic_analytics: formData.basic_analytics,
            campaign_creation: formData.campaign_creation,
            pass_validation: formData.pass_validation,
            customer_support: formData.customer_support,
            priority_support: formData.priority_support,
            custom_branding: formData.custom_branding,
            api_access: formData.api_access,
            advanced_analytics: formData.advanced_analytics
          },
          limits: {
            max_campaigns: formData.max_campaigns,
            monthly_redemptions: formData.monthly_redemptions,
            staff_accounts: formData.staff_accounts,
            api_calls: formData.api_calls
          },
          is_active: formData.is_active,
          trial_days: formData.trial_days
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plan created successfully!');
        setIsCreateDialogOpen(false);
        resetForm();
        loadPlans();
      } else {
        toast.error(data.error || 'Failed to create plan');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create plan');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${selectedPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          billing_period: formData.billing_period,
          currency: formData.currency,
          features: {
            basic_analytics: formData.basic_analytics,
            campaign_creation: formData.campaign_creation,
            pass_validation: formData.pass_validation,
            customer_support: formData.customer_support,
            priority_support: formData.priority_support,
            custom_branding: formData.custom_branding,
            api_access: formData.api_access,
            advanced_analytics: formData.advanced_analytics
          },
          limits: {
            max_campaigns: formData.max_campaigns,
            monthly_redemptions: formData.monthly_redemptions,
            staff_accounts: formData.staff_accounts,
            api_calls: formData.api_calls
          },
          is_active: formData.is_active,
          trial_days: formData.trial_days
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plan updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedPlan(null);
        resetForm();
        loadPlans();
      } else {
        toast.error(data.error || 'Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plan deleted!');
        loadPlans();
      } else {
        toast.error(data.error || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '', // Ensure never null
      price: plan.price || 0,
      billing_period: plan.billing_cycle || 'monthly',
      currency: plan.currency || 'TRY',
      max_campaigns: plan.limits?.max_campaigns ?? 5,
      monthly_redemptions: plan.limits?.monthly_redemptions ?? 100,
      staff_accounts: plan.limits?.staff_accounts ?? 2,
      api_calls: plan.limits?.api_calls ?? 1000,
      basic_analytics: plan.features?.basic_analytics ?? true,
      campaign_creation: plan.features?.campaign_creation ?? true,
      pass_validation: plan.features?.pass_validation ?? true,
      customer_support: plan.features?.customer_support ?? false,
      priority_support: plan.features?.priority_support ?? false,
      custom_branding: plan.features?.custom_branding ?? false,
      api_access: plan.features?.api_access ?? false,
      advanced_analytics: plan.features?.advanced_analytics ?? false,
      is_active: plan.is_active ?? true,
      trial_days: plan.trial_days ?? 0
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      billing_period: 'monthly',
      currency: 'TRY',
      max_campaigns: 5,
      monthly_redemptions: 100,
      staff_accounts: 2,
      api_calls: 1000,
      basic_analytics: true,
      campaign_creation: true,
      pass_validation: true,
      customer_support: false,
      priority_support: false,
      custom_branding: false,
      api_access: false,
      advanced_analytics: false,
      is_active: true,
      trial_days: 0
    });
  };


  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-sm text-gray-500">Manage pricing tiers and features</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} modal={true}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Create Plan</Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-2xl"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Create Subscription Plan</DialogTitle>
              <DialogDescription>Add a new pricing tier</DialogDescription>
            </DialogHeader>
            <PlanForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreatePlan}
              buttonText="Create"
              onCancel={() => {
                setIsCreateDialogOpen(false);
                setSelectedPlan(null);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {plan.name}
                    {!plan.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {plan.currency === 'TRY' ? '₺' : plan.currency === 'USD' ? '$' : '€'}{plan.price.toFixed(2)}
                <span className="text-xs font-normal text-muted-foreground">/{plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle === 'yearly' ? 'yr' : plan.billing_cycle}</span>
              </div>

              {plan.trial_days > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />{plan.trial_days}d trial
                </Badge>
              )}

              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Campaigns</span><span>{plan.limits.max_campaigns === -1 ? '∞' : plan.limits.max_campaigns}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Redemptions</span><span>{plan.limits.monthly_redemptions === -1 ? '∞' : plan.limits.monthly_redemptions}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span>{plan.limits.staff_accounts === -1 ? '∞' : plan.limits.staff_accounts}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">API</span><span>{plan.limits.api_calls === -1 ? '∞' : plan.limits.api_calls}</span></div>
              </div>

              <div className="space-y-1 text-xs pt-2">
                {Object.entries(plan.features).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    {value ? <CheckCircle className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-gray-300" />}
                    <span className={value ? '' : 'text-muted-foreground'}>{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)} className="flex-1"><Edit className="w-3 h-3 mr-1" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => handleDeletePlan(plan.id)} className="flex-1 text-red-600"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {plans.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No plans found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} modal={true}>
        <DialogContent
          className="max-w-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>Update plan details</DialogDescription>
          </DialogHeader>
          <PlanForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdatePlan}
            buttonText="Update"
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedPlan(null);
              resetForm();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
