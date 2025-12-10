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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star, MessageSquare, Edit2, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  passes: {
    id: string;
    name: string;
    image_url: string;
  };
  orders: {
    id: string;
    order_number: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  order_items?: Array<{
    pass_id: string;
    pass_name: string;
  }>;
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [formData, setFormData] = useState({
    rating: 5,
    title: "",
    comment: ""
  });

  useEffect(() => {
    loadReviews();
    loadEligibleOrders();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await fetch('/api/customer/reviews');
      const result = await response.json();

      if (result.success) {
        setReviews(result.reviews || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadEligibleOrders = async () => {
    try {
      // Fetch completed orders
      const response = await fetch('/api/customer/orders');
      const result = await response.json();

      if (result.success) {
        // Filter orders that are completed and not yet reviewed
        const completedOrders = (result.orders || []).filter((order: Order) =>
          order.status === 'completed'
        );
        setEligibleOrders(completedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) {
      toast.error("Please select an order to review");
      return;
    }

    if (!formData.title.trim() || !formData.comment.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.comment.length < 10) {
      toast.error("Comment must be at least 10 characters");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get pass ID from order items
      const passId = selectedOrder.order_items?.[0]?.pass_id;
      if (!passId) {
        toast.error("Could not find pass information");
        return;
      }

      const response = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          passId: passId,
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Review submitted successfully! It will be visible after admin approval.");
        setIsDialogOpen(false);
        setFormData({ rating: 5, title: "", comment: "" });
        setSelectedOrder(null);
        loadReviews();
        loadEligibleOrders();
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => interactive && onChange?.(star)}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            My Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter eligible orders that haven't been reviewed yet
  const reviewedOrderIds = reviews.map(r => r.orders.id);
  const unreviewed = eligibleOrders.filter(order => !reviewedOrderIds.includes(order.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            My Reviews
          </CardTitle>
          {unreviewed.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Write a Review</DialogTitle>
                  <DialogDescription>
                    Share your experience with the pass you purchased.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Select Order */}
                  <div className="space-y-2">
                    <Label>Select Order to Review</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={selectedOrder?.id || ""}
                      onChange={(e) => {
                        const order = unreviewed.find(o => o.id === e.target.value);
                        setSelectedOrder(order || null);
                      }}
                    >
                      <option value="">-- Select an order --</option>
                      {unreviewed.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.order_number} - {order.order_items?.[0]?.pass_name || 'Unknown Pass'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedOrder && (
                    <>
                      {/* Rating */}
                      <div className="space-y-2">
                        <Label>Rating</Label>
                        <div className="flex items-center gap-2">
                          {renderStars(formData.rating, true, (rating) =>
                            setFormData({ ...formData, rating })
                          )}
                          <span className="text-sm text-muted-foreground">
                            ({formData.rating} out of 5)
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="space-y-2">
                        <Label>Review Title</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Summarize your experience"
                          maxLength={100}
                        />
                      </div>

                      {/* Comment */}
                      <div className="space-y-2">
                        <Label>Your Review</Label>
                        <Textarea
                          value={formData.comment}
                          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                          placeholder="Tell us about your experience with this pass..."
                          rows={5}
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.comment.length}/1000 characters
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setFormData({ rating: 5, title: "", comment: "" });
                      setSelectedOrder(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmitting || !selectedOrder}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">You haven't written any reviews yet.</p>
            {unreviewed.length > 0 && (
              <p className="text-sm text-muted-foreground">
                You have {unreviewed.length} order{unreviewed.length > 1 ? 's' : ''} that can be reviewed.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{review.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {review.passes.name} • Order #{review.orders.order_number}
                    </p>
                  </div>
                  {getStatusBadge(review.status)}
                </div>

                <div className="flex items-center gap-2">
                  {renderStars(review.rating)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm">{review.comment}</p>

                {review.status === 'pending' && (
                  <p className="text-xs text-yellow-600">
                    Your review is pending approval and will be visible to others once approved by an admin.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
