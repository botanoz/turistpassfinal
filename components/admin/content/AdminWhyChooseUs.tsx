"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface WhyFeature {
  id: string;
  feature_text: string;
  display_order: number;
}

interface WhyBenefit {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  color_gradient: string;
  display_order: number;
}

export default function AdminWhyChooseUs() {
  const supabase = createClient();
  const [features, setFeatures] = useState<WhyFeature[]>([]);
  const [benefits, setBenefits] = useState<WhyBenefit[]>([]);
  const [loading, setLoading] = useState(true);

  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<WhyFeature | null>(null);
  const [editingBenefit, setEditingBenefit] = useState<WhyBenefit | null>(null);
  const [featureForm, setFeatureForm] = useState({ feature_text: "", display_order: 0 });
  const [benefitForm, setBenefitForm] = useState({
    title: "",
    description: "",
    icon_name: "",
    color_gradient: "",
    display_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: f } = await supabase
        .from("content_why_choose_us_features")
        .select("*")
        .order("display_order");
      const { data: b } = await supabase
        .from("content_why_choose_us_benefits")
        .select("*")
        .order("display_order");
      setFeatures(f || []);
      setBenefits(b || []);
    } catch (error) {
      console.error("Failed to load Why Choose content", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const resetFeatureForm = () => {
    setEditingFeature(null);
    setFeatureForm({ feature_text: "", display_order: features.length + 1 });
  };

  const resetBenefitForm = () => {
    setEditingBenefit(null);
    setBenefitForm({
      title: "",
      description: "",
      icon_name: "",
      color_gradient: "",
      display_order: benefits.length + 1,
    });
  };

  const saveFeature = async () => {
    try {
      if (editingFeature) {
        const { error } = await supabase
          .from("content_why_choose_us_features")
          .update(featureForm)
          .eq("id", editingFeature.id);
        if (error) throw error;
        toast.success("Feature updated");
      } else {
        const { error } = await supabase.from("content_why_choose_us_features").insert([featureForm]);
        if (error) throw error;
        toast.success("Feature created");
      }
      setFeatureDialogOpen(false);
      resetFeatureForm();
      fetchData();
    } catch (error) {
      console.error("Save feature error", error);
      toast.error("Failed to save feature");
    }
  };

  const deleteFeature = async (id: string) => {
    if (!confirm("Delete this feature?")) return;
    try {
      const { error } = await supabase.from("content_why_choose_us_features").delete().eq("id", id);
      if (error) throw error;
      toast.success("Feature deleted");
      fetchData();
    } catch (error) {
      console.error("Delete feature error", error);
      toast.error("Failed to delete feature");
    }
  };

  const saveBenefit = async () => {
    try {
      if (editingBenefit) {
        const { error } = await supabase
          .from("content_why_choose_us_benefits")
          .update(benefitForm)
          .eq("id", editingBenefit.id);
        if (error) throw error;
        toast.success("Benefit updated");
      } else {
        const { error } = await supabase.from("content_why_choose_us_benefits").insert([benefitForm]);
        if (error) throw error;
        toast.success("Benefit created");
      }
      setBenefitDialogOpen(false);
      resetBenefitForm();
      fetchData();
    } catch (error) {
      console.error("Save benefit error", error);
      toast.error("Failed to save benefit");
    }
  };

  const deleteBenefit = async (id: string) => {
    if (!confirm("Delete this benefit?")) return;
    try {
      const { error } = await supabase.from("content_why_choose_us_benefits").delete().eq("id", id);
      if (error) throw error;
      toast.success("Benefit deleted");
      fetchData();
    } catch (error) {
      console.error("Delete benefit error", error);
      toast.error("Failed to delete benefit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Why Choose Us Content</h1>
          <p className="text-sm text-muted-foreground">Manage checklist features and benefit cards</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetFeatureForm(); setFeatureDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
          <Button variant="outline" onClick={() => { resetBenefitForm(); setBenefitDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Benefit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist Features</CardTitle>
            <CardDescription>Shown as bullet list on homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.map((f) => (
              <div key={f.id} className="p-3 border rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{f.feature_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Order: {f.display_order}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFeature(f);
                      setFeatureForm({ feature_text: f.feature_text, display_order: f.display_order });
                      setFeatureDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteFeature(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {features.length === 0 && <p className="text-sm text-muted-foreground">No features yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benefits (Cards)</CardTitle>
            <CardDescription>Shown as colored cards on homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {benefits.map((b) => (
              <div key={b.id} className="p-3 border rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Icon: {b.icon_name} • Gradient: {b.color_gradient} • Order: {b.display_order}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingBenefit(b);
                      setBenefitForm({
                        title: b.title,
                        description: b.description,
                        icon_name: b.icon_name,
                        color_gradient: b.color_gradient,
                        display_order: b.display_order,
                      });
                      setBenefitDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteBenefit(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {benefits.length === 0 && <p className="text-sm text-muted-foreground">No benefits yet.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Feature dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Add Feature"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Feature Text</Label>
              <Textarea
                value={featureForm.feature_text}
                onChange={(e) => setFeatureForm({ ...featureForm, feature_text: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={featureForm.display_order}
                onChange={(e) => setFeatureForm({ ...featureForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveFeature}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBenefit ? "Edit Benefit" : "Add Benefit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={benefitForm.title} onChange={(e) => setBenefitForm({ ...benefitForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={benefitForm.description}
                onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Icon Name</Label>
              <Input
                value={benefitForm.icon_name}
                onChange={(e) => setBenefitForm({ ...benefitForm, icon_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Color Gradient</Label>
              <Input
                value={benefitForm.color_gradient}
                onChange={(e) => setBenefitForm({ ...benefitForm, color_gradient: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={benefitForm.display_order}
                onChange={(e) => setBenefitForm({ ...benefitForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBenefit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
