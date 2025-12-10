"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  moderated_at: string | null;
  customer_profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  passes: {
    id: string;
    name: string;
    image_url: string;
  };
  orders: {
    order_number: string;
    total_amount: number;
    currency: string;
  };
  admin_profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ReviewStats {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  average_rating: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_reviews: 0,
    pending_reviews: 0,
    approved_reviews: 0,
    rejected_reviews: 0,
    average_rating: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadReviews();
  }, [filterStatus]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const statusParam = filterStatus !== "all" ? `&status=${filterStatus}` : "";
      const response = await fetch(`/api/admin/reviews?limit=100${statusParam}`);
      const result = await response.json();

      if (result.success) {
        setReviews(result.reviews || []);
        setStats(result.stats || {
          total_reviews: 0,
          pending_reviews: 0,
          approved_reviews: 0,
          rejected_reviews: 0,
          average_rating: 0
        });
      } else {
        toast.error(result.error || "Failed to load reviews");
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setAdminNotes(review.admin_notes || "");
    setIsDialogOpen(true);
  };

  const handleModerateReview = async (status: 'approved' | 'rejected') => {
    if (!selectedReview) return;

    try {
      setIsProcessing(true);

      const response = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          status,
          adminNotes
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Review ${status} successfully`);
        setIsDialogOpen(false);
        setSelectedReview(null);
        setAdminNotes("");
        loadReviews();
      } else {
        toast.error(result.error || `Failed to ${status} review`);
      }
    } catch (error) {
      console.error('Error moderating review:', error);
      toast.error(`Failed to ${status} review`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews?reviewId=${reviewId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Review deleted successfully");
        loadReviews();
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error("Failed to delete review");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const statsCards = [
    {
      title: "Total Reviews",
      value: stats.total_reviews,
      icon: MessageSquare,
      color: "text-blue-600"
    },
    {
      title: "Pending",
      value: stats.pending_reviews,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Approved",
      value: stats.approved_reviews,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Average Rating",
      value: stats.average_rating.toFixed(1),
      icon: TrendingUp,
      color: "text-purple-600"
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground">
            Moderate and manage customer reviews
          </p>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Reviews</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Reviews</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No reviews found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{review.title}</h4>
                          {getStatusBadge(review.status)}
                        </div>

                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Customer:</strong> {review.customer_profiles.first_name}{" "}
                            {review.customer_profiles.last_name} ({review.customer_profiles.email})
                          </p>
                          <p>
                            <strong>Pass:</strong> {review.passes.name}
                          </p>
                          <p>
                            <strong>Order:</strong> #{review.orders.order_number} •{" "}
                            {review.orders.currency} {review.orders.total_amount}
                          </p>
                          <p>
                            <strong>Submitted:</strong>{" "}
                            {new Date(review.created_at).toLocaleString()}
                          </p>
                          {review.moderated_at && review.admin_profiles && (
                            <p>
                              <strong>Moderated by:</strong>{" "}
                              {review.admin_profiles.first_name}{" "}
                              {review.admin_profiles.last_name} on{" "}
                              {new Date(review.moderated_at).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <p className="text-sm border-l-2 border-muted pl-3 mt-2">
                          {review.comment}
                        </p>

                        {review.admin_notes && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                            <p className="text-sm font-medium">Admin Notes:</p>
                            <p className="text-sm text-muted-foreground">
                              {review.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReview(review)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Detail Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Details</DialogTitle>
              <DialogDescription>
                Moderate this review by approving or rejecting it
              </DialogDescription>
            </DialogHeader>

            {selectedReview && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Customer</Label>
                    <p className="font-medium">
                      {selectedReview.customer_profiles.first_name}{" "}
                      {selectedReview.customer_profiles.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReview.customer_profiles.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Pass</Label>
                    <p className="font-medium">{selectedReview.passes.name}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Rating</Label>
                  {renderStars(selectedReview.rating)}
                </div>

                <div>
                  <Label className="text-muted-foreground">Review Title</Label>
                  <p className="font-medium">{selectedReview.title}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Review Comment</Label>
                  <p className="text-sm border-l-2 border-muted pl-3 py-2">
                    {selectedReview.comment}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Current Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReview.status)}</div>
                </div>

                <div>
                  <Label>Admin Notes (Optional)</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this review..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedReview(null);
                  setAdminNotes("");
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              {selectedReview?.status !== 'rejected' && (
                <Button
                  variant="destructive"
                  onClick={() => handleModerateReview('rejected')}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Reject"}
                </Button>
              )}
              {selectedReview?.status !== 'approved' && (
                <Button
                  onClick={() => handleModerateReview('approved')}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : "Approve"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
