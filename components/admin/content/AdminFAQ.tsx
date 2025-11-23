"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FAQCategory {
  id: string;
  slug: string;
  label: string;
  icon_name: string;
  display_order: number;
}

interface FAQQuestion {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  display_order: number;
}

export default function AdminFAQ() {
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [questions, setQuestions] = useState<FAQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ slug: "", label: "", icon_name: "", display_order: 0 });

  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FAQQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({ question: "", answer: "", display_order: 0 });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cats, error: catsError } = await supabase
        .from("content_faq_categories")
        .select("*")
        .order("display_order");
      if (catsError) throw catsError;

      const { data: qs, error: qsError } = await supabase
        .from("content_faq_questions")
        .select("*")
        .order("display_order");
      if (qsError) throw qsError;

      setCategories(cats || []);
      setQuestions(qs || []);
      if (cats && cats.length > 0 && !activeTab) {
        setActiveTab(cats[0].id);
      }
    } catch (error) {
      console.error("Failed to load FAQ data", error);
      toast.error("Failed to load FAQ data");
    } finally {
      setLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ slug: "", label: "", icon_name: "", display_order: 0 });
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionForm({ question: "", answer: "", display_order: 0 });
  };

  const handleCategorySubmit = async () => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("content_faq_categories")
          .update(categoryForm)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("content_faq_categories").insert([categoryForm]);
        if (error) throw error;
        toast.success("Category created");
      }
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      console.error("Save category error", error);
      toast.error("Failed to save category");
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const { error } = await supabase.from("content_faq_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      console.error("Delete category error", error);
      toast.error("Failed to delete category");
    }
  };

  const handleQuestionSubmit = async () => {
    if (!activeTab) {
      toast.error("Select a category first");
      return;
    }
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from("content_faq_questions")
          .update({ ...questionForm, category_id: activeTab })
          .eq("id", editingQuestion.id);
        if (error) throw error;
        toast.success("Question updated");
      } else {
        const { error } = await supabase
          .from("content_faq_questions")
          .insert([{ ...questionForm, category_id: activeTab }]);
        if (error) throw error;
        toast.success("Question created");
      }
      setIsQuestionDialogOpen(false);
      resetQuestionForm();
      fetchData();
    } catch (error) {
      console.error("Save question error", error);
      toast.error("Failed to save question");
    }
  };

  const handleQuestionDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      const { error } = await supabase.from("content_faq_questions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Question deleted");
      fetchData();
    } catch (error) {
      console.error("Delete question error", error);
      toast.error("Failed to delete question");
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
          <h1 className="text-2xl font-bold">FAQ Content</h1>
          <p className="text-sm text-muted-foreground">Manage categories and questions displayed on homepage</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            resetCategoryForm();
            setIsCategoryDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button variant="outline" onClick={() => {
            resetQuestionForm();
            setIsQuestionDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{cat.label}</CardTitle>
                  <CardDescription>Icon: {cat.icon_name} • Order: {cat.display_order}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({
                        slug: cat.slug,
                        label: cat.label,
                        icon_name: cat.icon_name,
                        display_order: cat.display_order,
                      });
                      setIsCategoryDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleCategoryDelete(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questions
                    .filter((q) => q.category_id === cat.id)
                    .map((q) => (
                      <div key={q.id} className="p-3 border rounded-lg flex justify-between items-start">
                        <div>
                          <p className="font-medium">{q.question}</p>
                          <p className="text-sm text-muted-foreground mt-1">{q.answer}</p>
                          <p className="text-xs text-muted-foreground mt-1">Order: {q.display_order}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingQuestion(q);
                              setQuestionForm({
                                question: q.question,
                                answer: q.answer,
                                display_order: q.display_order,
                              });
                              setIsQuestionDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleQuestionDelete(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {questions.filter((q) => q.category_id === cat.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No questions yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Category dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Manage FAQ categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
              />
            </div>
            <div>
              <Label>Icon Name</Label>
              <Input
                value={categoryForm.icon_name}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCategorySubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Manage FAQ questions</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Question</Label>
              <Input
                value={questionForm.question}
                onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea
                value={questionForm.answer}
                onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={questionForm.display_order}
                onChange={(e) => setQuestionForm({ ...questionForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuestionSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
