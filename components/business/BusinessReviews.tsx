"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Reply, ThumbsUp, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReviewFilter = "all" | "replied" | "pending";

const defaultReviews = [
  {
    id: 1,
    userName: "Sarah Johnson",
    userInitials: "SJ",
    rating: 5,
    date: "2024-10-10",
    comment: "Amazing experience! The food was exceptional and the ambiance was perfect. Will definitely come back with TuristPass again.",
    passType: "Istanbul Welcome Pass",
    hasReply: false,
    reply: null,
    helpful: 12
  },
  {
    id: 2,
    userName: "Michael Chen",
    userInitials: "MC",
    rating: 4,
    date: "2024-10-08",
    comment: "Great service and delicious food. The discount with TuristPass made it even better. Only minor issue was the wait time.",
    passType: "Food & Beverage Pass",
    hasReply: true,
    reply: {
      text: "Thank you for your feedback! We're working on reducing wait times during peak hours. Hope to see you again soon!",
      date: "2024-10-09"
    },
    helpful: 8
  },
  {
    id: 3,
    userName: "Emma Wilson",
    userInitials: "EW",
    rating: 5,
    date: "2024-10-05",
    comment: "Absolutely loved it! Staff was very friendly and the TuristPass discount was generous. Highly recommend!",
    passType: "Premium Pass",
    hasReply: true,
    reply: {
      text: "We're thrilled to hear you enjoyed your visit! Thank you for choosing us.",
      date: "2024-10-06"
    },
    helpful: 15
  },
  {
    id: 4,
    userName: "David Martinez",
    userInitials: "DM",
    rating: 3,
    date: "2024-10-03",
    comment: "Good food but the portion sizes could be larger. Service was okay. TuristPass made it worth it though.",
    passType: "Istanbul Welcome Pass",
    hasReply: false,
    reply: null,
    helpful: 5
  },
  {
    id: 5,
    userName: "Lisa Anderson",
    userInitials: "LA",
    rating: 5,
    date: "2024-10-01",
    comment: "Perfect evening! The view, the food, everything was excellent. Thank you for honoring the TuristPass discount.",
    passType: "Food & Beverage Pass",
    hasReply: true,
    reply: {
      text: "Thank you so much for your kind words! We're happy you had a wonderful experience.",
      date: "2024-10-02"
    },
    helpful: 20
  }
];

export default function BusinessReviews() {
  const { business, loading } = useBusinessContext();
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [replyText, setReplyText] = useState<Record<number | string, string>>({});
  const [showReplyForm, setShowReplyForm] = useState<Record<number | string, boolean>>({});
  const [apiReviews, setApiReviews] = useState<
    { id: string; rating: number; comment: string; createdAt: string; reply: { text: string; date: string } | null }[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (loading) return;
      try {
        setIsLoading(true);
        const res = await fetch("/api/business/reviews");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load reviews");
        if (mounted) setApiReviews(json.reviews);
      } catch (err: any) {
        console.error("Failed to load reviews", err);
        if (mounted) setApiReviews([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading]);

  const reviews = useMemo(() => {
    if (apiReviews) {
      return apiReviews.map((r) => ({
        id: r.id,
        userName: "Customer",
        userInitials: "CU",
        rating: r.rating,
        date: r.createdAt,
        comment: r.comment,
        passType: "",
        hasReply: Boolean(r.reply),
        reply: r.reply ? { text: r.reply.text, date: r.reply.date } : null,
        helpful: 0,
      }));
    }
    return defaultReviews;
  }, [apiReviews]);
  const recentActivityCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return reviews.filter((r) => new Date(r.date).getTime() > weekAgo).length;
  }, [reviews]);

  const filteredReviews =
    filter === "all"
      ? reviews
      : filter === "replied"
      ? reviews.filter((r) => r.hasReply)
      : reviews.filter((r) => !r.hasReply);

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length,
  );

  const handleReply = async (reviewId: number | string) => {
    if (!replyText[reviewId]?.trim()) {
      toast.error("Please write a reply");
      return;
    }
    try {
      const res = await fetch("/api/business/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, text: replyText[reviewId] }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to send reply");
      toast.success("Reply sent successfully");
      setReplyText({ ...replyText, [reviewId]: "" });
      setShowReplyForm({ ...showReplyForm, [reviewId]: false });
      // refresh list
      try {
        const refresh = await fetch("/api/business/reviews");
        const rjson = await refresh.json();
        if (refresh.ok && rjson.success) setApiReviews(rjson.reviews);
      } catch {}
    } catch (err: any) {
      console.error("Reply failed", err);
      toast.error(err.message ?? "Failed to send reply");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Customer Reviews</h2>
          <p className="text-muted-foreground">Manage and respond to customer feedback</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="text-4xl font-bold">{avgRating}</div>
                <div className="flex mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= Math.round(parseFloat(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{reviews.length} total reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{Math.round((reviews.filter(r => r.hasReply).length / reviews.length) * 100)}%</div>
              <p className="text-xs text-muted-foreground mt-2">{reviews.filter(r => r.hasReply).length} of {reviews.length} replied</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{recentActivityCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Reviews this week</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5,4,3,2,1].map((star, idx) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{width: `${(ratingCounts[idx] / reviews.length) * 100}%`}} />
                </div>
                <span className="text-sm text-muted-foreground w-8">{ratingCounts[idx]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={filter} onValueChange={(value) => setFilter(value as ReviewFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews ({reviews.length})</SelectItem>
              <SelectItem value="replied">Replied ({reviews.filter(r => r.hasReply).length})</SelectItem>
              <SelectItem value="pending">Pending ({reviews.filter(r => !r.hasReply).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{review.userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{review.userName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                          </div>
                          <span className="text-xs text-muted-foreground">{review.date}</span>
                        </div>
                      </div>
                      <Badge variant="outline">{review.passType}</Badge>
                    </div>

                    <p className="text-sm">{review.comment}</p>

                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                        <ThumbsUp className="h-3 w-3" />
                        {review.helpful} helpful
                      </button>
                      {!review.hasReply && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowReplyForm({...showReplyForm, [review.id]: !showReplyForm[review.id]})}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      )}
                    </div>

                    {review.hasReply && review.reply && (
                      <div className="ml-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">Your Reply • {review.reply.date}</p>
                        <p className="text-sm">{review.reply.text}</p>
                      </div>
                    )}

                    {showReplyForm[review.id] && (
                      <div className="ml-8 space-y-3">
                        <Textarea 
                          placeholder="Write your reply..."
                          value={replyText[review.id] || ""}
                          onChange={(e) => setReplyText({...replyText, [review.id]: e.target.value})}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReply(review.id)}>Send Reply</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowReplyForm({...showReplyForm, [review.id]: false})}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
