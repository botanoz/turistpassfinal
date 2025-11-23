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

interface HowStep {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  color_gradient: string;
  step_number: number;
}

interface HowDetail {
  id: string;
  step_id: string;
  detail_text: string;
  display_order: number;
}

export default function AdminHowItWorks() {
  const supabase = createClient();
  const [steps, setSteps] = useState<HowStep[]>([]);
  const [details, setDetails] = useState<HowDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<HowStep | null>(null);
  const [editingDetail, setEditingDetail] = useState<HowDetail | null>(null);
  const [stepForm, setStepForm] = useState({
    title: "",
    description: "",
    icon_name: "",
    color_gradient: "",
    step_number: 1,
  });
  const [detailForm, setDetailForm] = useState({
    step_id: "",
    detail_text: "",
    display_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase
        .from("content_how_it_works_steps")
        .select("*")
        .order("step_number");
      const { data: d } = await supabase
        .from("content_how_it_works_details")
        .select("*")
        .order("display_order");
      setSteps(s || []);
      setDetails(d || []);
    } catch (error) {
      console.error("Failed to load How It Works", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const resetStepForm = () => {
    setEditingStep(null);
    setStepForm({
      title: "",
      description: "",
      icon_name: "",
      color_gradient: "",
      step_number: steps.length + 1,
    });
  };

  const resetDetailForm = () => {
    setEditingDetail(null);
    setDetailForm({
      step_id: steps[0]?.id || "",
      detail_text: "",
      display_order: 0,
    });
  };

  const saveStep = async () => {
    try {
      if (editingStep) {
        const { error } = await supabase
          .from("content_how_it_works_steps")
          .update(stepForm)
          .eq("id", editingStep.id);
        if (error) throw error;
        toast.success("Step updated");
      } else {
        const { error } = await supabase.from("content_how_it_works_steps").insert([stepForm]);
        if (error) throw error;
        toast.success("Step created");
      }
      setIsStepDialogOpen(false);
      resetStepForm();
      fetchData();
    } catch (error) {
      console.error("Save step error", error);
      toast.error("Failed to save step");
    }
  };

  const deleteStep = async (id: string) => {
    if (!confirm("Delete this step?")) return;
    try {
      const { error } = await supabase.from("content_how_it_works_steps").delete().eq("id", id);
      if (error) throw error;
      toast.success("Step deleted");
      fetchData();
    } catch (error) {
      console.error("Delete step error", error);
      toast.error("Failed to delete step");
    }
  };

  const saveDetail = async () => {
    if (!detailForm.step_id) {
      toast.error("Select a step");
      return;
    }
    try {
      if (editingDetail) {
        const { error } = await supabase
          .from("content_how_it_works_details")
          .update(detailForm)
          .eq("id", editingDetail.id);
        if (error) throw error;
        toast.success("Detail updated");
      } else {
        const { error } = await supabase.from("content_how_it_works_details").insert([detailForm]);
        if (error) throw error;
        toast.success("Detail created");
      }
      setIsDetailDialogOpen(false);
      resetDetailForm();
      fetchData();
    } catch (error) {
      console.error("Save detail error", error);
      toast.error("Failed to save detail");
    }
  };

  const deleteDetail = async (id: string) => {
    if (!confirm("Delete this detail?")) return;
    try {
      const { error } = await supabase.from("content_how_it_works_details").delete().eq("id", id);
      if (error) throw error;
      toast.success("Detail deleted");
      fetchData();
    } catch (error) {
      console.error("Delete detail error", error);
      toast.error("Failed to delete detail");
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
          <h1 className="text-2xl font-bold">How It Works Content</h1>
          <p className="text-sm text-muted-foreground">Manage steps and details shown on homepage</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetStepForm(); setIsStepDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
          <Button variant="outline" onClick={() => { resetDetailForm(); setIsDetailDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Detail
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {steps.map((step) => (
          <Card key={step.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{step.step_number}. {step.title}</CardTitle>
                <CardDescription>{step.icon_name} • {step.color_gradient}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingStep(step);
                    setStepForm({
                      title: step.title,
                      description: step.description,
                      icon_name: step.icon_name,
                      color_gradient: step.color_gradient,
                      step_number: step.step_number,
                    });
                    setIsStepDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteStep(step.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">{step.description}</p>
              <div className="space-y-2">
                {details.filter((d) => d.step_id === step.id).map((detail) => (
                  <div key={detail.id} className="p-3 border rounded-lg flex justify-between items-start">
                    <div>
                      <p className="text-sm">{detail.detail_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">Order: {detail.display_order}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDetail(detail);
                          setDetailForm({
                            step_id: detail.step_id,
                            detail_text: detail.detail_text,
                            display_order: detail.display_order,
                          });
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteDetail(detail.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {details.filter((d) => d.step_id === step.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No details yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Step dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Step" : "Add Step"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={stepForm.title} onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={stepForm.description} onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Icon Name</Label>
              <Input value={stepForm.icon_name} onChange={(e) => setStepForm({ ...stepForm, icon_name: e.target.value })} />
            </div>
            <div>
              <Label>Color Gradient</Label>
              <Input value={stepForm.color_gradient} onChange={(e) => setStepForm({ ...stepForm, color_gradient: e.target.value })} />
            </div>
            <div>
              <Label>Step Number</Label>
              <Input
                type="number"
                value={stepForm.step_number}
                onChange={(e) => setStepForm({ ...stepForm, step_number: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStep}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDetail ? "Edit Detail" : "Add Detail"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Step</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={detailForm.step_id}
                onChange={(e) => setDetailForm({ ...detailForm, step_id: e.target.value })}
              >
                <option value="">Select step</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.step_number}. {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Detail</Label>
              <Textarea
                value={detailForm.detail_text}
                onChange={(e) => setDetailForm({ ...detailForm, detail_text: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={detailForm.display_order}
                onChange={(e) => setDetailForm({ ...detailForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDetail}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
