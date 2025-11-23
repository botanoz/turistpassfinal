"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "./BusinessLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, QrCode, Key, Download, Filter } from "lucide-react";
import { toast } from "sonner";

type HistoryItem = {
  id: string;
  createdAt: string;
  validationMethod: string | null;
  discountPercentage: number | null;
  originalAmount: number | null;
  discountedAmount: number | null;
  notes: string | null;
  validationLocation: string | null;
  pass: {
    id: string;
    name: string | null;
    type: string | null;
    activationCode: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};

type HistoryResponse = {
  items: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export default function BusinessHistory() {
  const { loading } = useBusinessContext();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/business/history?limit=100");
      const result: HistoryResponse = await response.json();

      if (!response.ok || !(result as any).success) {
        throw new Error((result as any).error || "Failed to load history");
      }

      setItems(result.items ?? []);
    } catch (error: any) {
      console.error("Failed to load history", error);
      toast.error(error.message ?? "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchHistory();
    }
  }, [loading, fetchHistory]);

  const filteredVisits = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    return items.filter((visit) => {
      const visitDate = new Date(visit.createdAt);
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        (visit.customer?.name ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()) ||
        (visit.pass.name ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()) ||
        (visit.pass.activationCode ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());

      if (!matchesSearch) return false;

      switch (filterPeriod) {
        case "today":
          return visitDate >= startOfDay;
        case "week":
          return visitDate >= startOfWeek;
        case "month":
          return visitDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [items, searchQuery, filterPeriod]);

  const groupedByDate = useMemo(() => {
    return filteredVisits.reduce<Record<string, HistoryItem[]>>((acc, visit) => {
      const dateKey = new Date(visit.createdAt).toLocaleDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(visit);
      return acc;
    }, {});
  }, [filteredVisits]);

  const totalVisits = items.length;
  const todayVisits = items.filter((item) => {
    const visitDate = new Date(item.createdAt);
    const now = new Date();
    return (
      visitDate.getUTCFullYear() === now.getUTCFullYear() &&
      visitDate.getUTCMonth() === now.getUTCMonth() &&
      visitDate.getUTCDate() === now.getUTCDate()
    );
  }).length;
  const uniqueCustomers = new Set(items.map((item) => item.customer?.id).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Visit History</h2>
          <p className="text-muted-foreground">Track all customer visits and validations</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVisits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayVisits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Validations today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniqueCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct visitors</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer or pass name"
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2 text-sm">
                {(["all", "today", "week", "month"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={filterPeriod === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterPeriod(value)}
                  >
                    {value === "all" && "All"}
                    {value === "today" && "Today"}
                    {value === "week" && "This Week"}
                    {value === "month" && "This Month"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              No visits found for the selected criteria. Try adjusting your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([date, visits]) => (
            <Card key={date}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" />
                  {date}
                </CardTitle>
                <Badge variant="secondary">{visits.length} visits</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="capitalize">
                        {visit.validationMethod === "pin_code"
                          ? "PIN"
                          : visit.validationMethod === "manual"
                          ? "Manual"
                          : "QR"}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {visit.customer?.name ?? "Customer"}{" "}
                          {visit.customer?.email && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {visit.customer.email}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {visit.pass.name ?? "TuristPass"} ·{" "}
                          {new Date(visit.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {visit.discountPercentage !== null && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {visit.discountPercentage}% off
                          </p>
                          {visit.discountedAmount !== null && (
                            <p className="text-xs text-muted-foreground">
                              ₺{visit.discountedAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {visit.validationMethod === "pin_code" ? (
                          <Key className="h-4 w-4" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        {visit.pass.activationCode && (
                          <span className="font-mono">
                            {visit.pass.activationCode.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
