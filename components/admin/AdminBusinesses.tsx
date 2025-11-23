"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "./AdminLayout";
import { Search, Download, Filter, MapPin, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminBusinesses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    pendingBusinesses: 0,
    suspendedBusinesses: 0,
    inactiveBusinesses: 0,
    totalScans: 0
  });

  // Fetch businesses from API
  const fetchBusinesses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/businesses?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setBusinesses(data.businesses || []);
      setStats({
        totalBusinesses: data.stats?.totalBusinesses ?? 0,
        activeBusinesses: data.stats?.activeBusinesses ?? 0,
        pendingBusinesses: data.stats?.pendingBusinesses ?? 0,
        suspendedBusinesses: data.stats?.suspendedBusinesses ?? 0,
        inactiveBusinesses: data.stats?.inactiveBusinesses ?? 0,
        totalScans: data.stats?.totalScans ?? 0
      });
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const filteredBusinesses = businesses.filter(business => {
    const name = (business.name || "").toLowerCase();
    const category = (business.category || "").toLowerCase();
    const search = searchQuery.toLowerCase();

    const matchesSearch =
      name.includes(search) ||
      category.includes(search) ||
      (business.description || "").toLowerCase().includes(search);
    return matchesSearch;
  });

  const statsCards = [
    { label: "Total Businesses", value: stats.totalBusinesses.toString() },
    { label: "Active", value: stats.activeBusinesses.toString() },
    { label: "Pending Applications", value: stats.pendingBusinesses.toString() },
    { label: "Total Scans", value: stats.totalScans.toLocaleString("tr-TR") }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Business Management</h2>
            <p className="text-muted-foreground">Manage partner businesses and applications</p>
          </div>
          <Button><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search businesses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading businesses...</p>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No businesses found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBusinesses.map((business) => (
                  <div key={business.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{business.name}</h3>
                        <Badge variant={business.status === "active" ? "default" : "outline"}>
                          {business.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {business.status === "inactive" && <XCircle className="h-3 w-3 mr-1" />}
                          {business.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {business.status === "suspended" && <Ban className="h-3 w-3 mr-1" />}
                          {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{business.category}</span>
                        {business.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.address}</span>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <span><strong>{business.passCount || 0}</strong> passes</span>
                        {business.createdAt && <span>Added: {new Date(business.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                        {business.status === "active" && <DropdownMenuItem><XCircle className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>}
                        {business.status === "inactive" && <DropdownMenuItem><CheckCircle className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
