// components/place/ReviewsTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReviewsTabProps {
  businessId: string;
  reviews: Review[];
  onChange?: (payload: { reviews: Review[]; reviewCount: number; averageRating: number }) => void;
}

type Review = {
  id: string;
  userId?: string | null;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
};

export default function ReviewsTab({ businessId, reviews, onChange }: ReviewsTabProps) {
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [newReview, setNewReview] = useState<{ rating: number; comment: string }>({
    rating: 0,
    comment: ''
  });
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewList, setReviewList] = useState<Review[]>(reviews);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user || null;
      setCurrentUserId(sessionUser?.id || null);
      if (sessionUser?.id) {
        const mine = reviewList.find((r) => r.userId === sessionUser.id);
        setUserReview(mine || null);
      } else {
        setUserReview(null);
      }
    });

    return () => {
      active = false;
    };
  }, [supabase, reviewList]);

  useEffect(() => {
    setReviewList(reviews);
    if (currentUserId) {
      const mine = reviews.find((r) => r.userId === currentUserId);
      setUserReview(mine || null);
    } else {
      setUserReview(null);
    }
  }, [reviews, currentUserId]);

  const displayedReviews = useMemo(() => {
    return currentUserId ? reviewList.filter((r) => r.userId !== currentUserId) : reviewList;
  }, [reviewList, currentUserId]);

  const handleSubmitReview = async () => {
    if (!currentUserId) {
      toast.error('Please log in to write a review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newReview.rating, comment: newReview.comment })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit review');
      }

      const updatedReviews = (() => {
        const existingIdx = reviewList.findIndex((r) => r.userId === json.review.userId);
        if (existingIdx !== -1) {
          const clone = [...reviewList];
          clone[existingIdx] = json.review;
          return clone;
        }
        return [json.review, ...reviewList];
      })();

      setReviewList(updatedReviews);
      setUserReview(json.review);
      onChange?.({
        reviews: updatedReviews,
        reviewCount: json.reviewCount,
        averageRating: json.averageRating
      });
      setNewReview({ rating: 0, comment: '' });
      setIsWritingReview(false);
      setIsEditingReview(false);
      toast.success('Review saved');
    } catch (err: any) {
      console.error('Review submit failed:', err);
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!currentUserId || !userReview) {
      toast.error('Please log in to delete your review.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/reviews`, {
        method: 'DELETE'
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete review');
      }

      const updatedReviews = reviewList.filter((r) => r.userId !== currentUserId);
      setReviewList(updatedReviews);
      setUserReview(null);
      onChange?.({
        reviews: updatedReviews,
        reviewCount: json.reviewCount,
        averageRating: json.averageRating
      });
      toast.success('Review deleted');
    } catch (err: any) {
      console.error('Review delete failed:', err);
      toast.error(err.message || 'Failed to delete review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* If user is writing or editing a review */}
        {isWritingReview ? (
          <div className="mb-8 border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">
              {isEditingReview ? 'Edit Your Review' : 'Write a Review'}
            </h3>
            
            {/* Rating Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className="p-1 focus:outline-none"
                  >
                    <Star 
                      className={`h-8 w-8 ${
                        star <= newReview.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Comment Box */}
            <div className="mb-4">
              <label htmlFor="review-comment" className="block text-sm font-medium mb-2">
                Your Review
              </label>
              <textarea
                id="review-comment"
                rows={4}
                placeholder="Share your experience..."
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsWritingReview(false);
                  setIsEditingReview(false);
                  setNewReview({ rating: 0, comment: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={newReview.rating === 0 || !newReview.comment.trim() || isSubmitting}
              >
                {isEditingReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Reviews</h2>
            {userReview ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setNewReview({
                      rating: userReview.rating,
                      comment: userReview.comment
                    });
                    setIsEditingReview(true);
                    setIsWritingReview(true);
                  }}
                >
                  Edit Your Review
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (!currentUserId) {
                    toast.error('Please log in to write a review.');
                    return;
                  }
                  setIsWritingReview(true);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            )}
          </div>
        )}
        
        {/* User's review, if any */}
        {userReview && !isWritingReview && (
          <div className="mb-8 border border-primary/10 rounded-lg p-4 bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                Y
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium">Your Review</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < userReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(userReview.date).toLocaleDateString()}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteReview}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground">{userReview.comment}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Other Reviews */}
        {displayedReviews.length > 0 ? (
          <div className="space-y-6">
            {/* Show all other reviews */}
            {displayedReviews.map((review) => (
              <div key={review.id} className="border-b pb-6 last:border-b-0">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {review.userAvatar ? (
                      <Image
                        src={review.userAvatar}
                        alt={review.userName}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <span className="font-medium">
                        {review.userName.substring(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-medium">{review.userName}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : userReview ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No other reviews yet.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet.</p>
            <p className="text-sm text-muted-foreground">Be the first to share your experience!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
