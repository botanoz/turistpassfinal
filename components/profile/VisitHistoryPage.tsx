"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Star,
  Ticket,
  Wallet,
  Clock3,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

interface VisitSummary {
  totalVisits: number;
  uniqueVenues: number;
  totalSavings: number;
  favoriteCategory: string | null;
  lastVisitDate: string | null;
}

interface Visit {
  id: string;
  visitDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  discountUsed: number;
  discountAmount: number;
  rating?: number | null;
  review?: string | null;
  status: string;
  wouldRecommend?: boolean | null;
  venue: {
    id: string;
    name: string;
    category?: string | null;
    imageUrl?: string | null;
    address?: string | null;
  } | null;
  pass: {
    id: string;
    name: string;
    type?: string | null;
  } | null;
}

export default function VisitHistoryPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [summary, setSummary] = useState<VisitSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadVisits = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/customer/visit-history");
        const result = await response.json();

        if (!active) return;

        if (response.status === 401) {
          router.push("/login?redirect=/visit-history");
          return;
        }

        if (!result.success) {
          setError(result.error || "Failed to load visit history");
          toast.error(result.error || "Failed to load visit history");
          return;
        }

        setVisits(result.visits || []);
        setSummary(result.summary || null);
      } catch (err: any) {
        if (!active) return;
        console.error("Visit history load error:", err);
        setError(err.message || "Failed to load visit history");
        toast.error(err.message || "Failed to load visit history");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadVisits();

    return () => {
      active = false;
    };
  }, [router]);

  const stats = useMemo(() => {
    const totalVisits = summary?.totalVisits ?? visits.length;
    const uniqueVenues = summary?.uniqueVenues ?? new Set(visits.map(v => v.venue?.id).filter(Boolean)).size;
    const totalSavings = summary?.totalSavings ?? visits.reduce((sum, visit) => sum + (visit.discountAmount || 0), 0);
    const lastVisitDate = summary?.lastVisitDate ?? visits[0]?.visitDate ?? null;

    const ratedVisits = visits.filter(v => typeof v.rating === "number");
    const averageRating = ratedVisits.length
      ? ratedVisits.reduce((sum, visit) => sum + (visit.rating || 0), 0) / ratedVisits.length
      : null;

    const recommendationRate = visits.length
      ? Math.round((visits.filter(v => v.wouldRecommend).length / visits.length) * 100)
      : null;

    return [
      {
        label: "Total Visits",
        value: totalVisits,
        icon: MapPin,
        accent: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
      },
      {
        label: "Unique Venues",
        value: uniqueVenues,
        icon: Sparkles,
        accent: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200"
      },
      {
        label: "Total Savings",
        value: formatCurrency(totalSavings),
        icon: Wallet,
        accent: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
      },
      {
        label: "Last Visit",
        value: lastVisitDate ? formatDate(lastVisitDate) : "No visits yet",
        icon: Clock3,
        accent: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
      },
      {
        label: "Average Rating",
        value: averageRating ? `${averageRating.toFixed(1)} / 5` : "-",
        icon: Star,
        accent: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200"
      },
      {
        label: "Recommendation Rate",
        value: recommendationRate !== null ? `${recommendationRate}%` : "-",
        icon: TrendingUp,
        accent: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200"
      }
    ];
  }, [summary, visits]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && visits.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Visit history could not be loaded</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {error}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.refresh()}>
                Retry
              </Button>
              <Button asChild>
                <Link href="/places">Explore places</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Visit History</h1>
            <p className="text-muted-foreground">
              Your latest partner venue visits and savings
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-muted">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stat.accent}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {visits.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">No visits recorded yet</h3>
              <p className="text-muted-foreground">
                Start exploring partner venues to earn your first saving.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link href="/plan-your-visit">Plan your visit</Link>
                </Button>
                <Button asChild>
                  <Link href="/places">Explore places</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recently visited venues</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Newest visits are shown first
                </p>
              </div>
              {summary?.favoriteCategory && (
                <Badge variant="outline" className="mt-2 sm:mt-0">
                  Favorite category: {summary.favoriteCategory}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <div className="md:w-48 md:h-32 h-40 w-full relative rounded-lg overflow-hidden bg-muted">
                    {visit.venue?.imageUrl ? (
                      <Image
                        src={visit.venue.imageUrl}
                        alt={visit.venue.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <MapPin className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{visit.venue?.name || "Mekan"}</h3>
                          {visit.venue?.category && (
                            <Badge variant="secondary">{visit.venue.category}</Badge>
                          )}
                        </div>
                        {visit.venue?.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{visit.venue.address}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={visit.status === "completed" ? "default" : "secondary"}>
                        {visit.status === "completed" ? "Completed" : visit.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(visit.visitDate)}</span>
                      </div>
                      {visit.pass && (
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          <span>{visit.pass.name}</span>
                        </div>
                      )}
                      {visit.discountUsed > 0 && (
                        <div className="flex items-center gap-1">
                          <Wallet className="h-4 w-4" />
                          <span>%{visit.discountUsed} | {formatCurrency(visit.discountAmount)}</span>
                        </div>
                      )}
                      {visit.wouldRecommend && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Tavsiye ederim
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {typeof visit.rating === "number" && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{visit.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {visit.review && (
                        <>
                          <Separator orientation="vertical" className="hidden sm:block h-4" />
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            "{visit.review}"
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {summary?.favoriteCategory && (
                <div className="text-xs text-muted-foreground text-right">
                  {visits.length} visits | {summary.uniqueVenues ?? visits.length} unique venues
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return value;
  }
}

function formatCurrency(amount: number) {
  if (Number.isNaN(amount)) return "TRY 0.00";
  return `TRY ${amount.toFixed(2)}`;
}
