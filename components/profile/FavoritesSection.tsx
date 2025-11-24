"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Building2,
  CreditCard,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";

interface PassFavorite {
  id: string;
  passId: string;
  pass: {
    id: string;
    name: string;
    short_description: string;
    image_url: string | null;
    pricing: Array<{
      days: number;
      age_group: string;
      price: number;
    }>;
    businesses: Array<{
      id: string;
      business: {
        name: string;
      };
    }>;
  };
  addedAt: string;
}

export default function FavoritesSection() {
  const [passFavorites, setPassFavorites] = useState<PassFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch favorites
  useEffect(() => {
    async function fetchFavorites() {
      try {
        setIsLoading(true);

        // Fetch pass favorites
        const passResponse = await fetch('/api/customer/favorites');
        const passResult = await passResponse.json();
        if (passResult.success) {
          setPassFavorites(passResult.favorites || []);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Failed to load favorites');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, []);

  const handleRemovePassFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/customer/favorites/${favoriteId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setPassFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
        toast.success('Removed from favorites');
      } else {
        toast.error(result.error || 'Failed to remove favorite');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const getCheapestPrice = (pricing: any[]) => {
    if (!pricing || pricing.length === 0) return null;
    const adultPrices = pricing.filter(p => p.age_group === 'adult').map(p => p.price);
    if (adultPrices.length === 0) return null;
    return Math.min(...adultPrices);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Favorite Passes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Favorite Passes
          <Badge variant="secondary" className="ml-2">
            {passFavorites.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
            {passFavorites.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-muted-foreground">No favorite passes yet</p>
                <Link href="/places">
                  <Button variant="outline" className="mt-4">
                    Explore Passes
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passFavorites.map((favorite) => {
                  const cheapestPrice = getCheapestPrice(favorite.pass.pricing);
                  const businessCount = favorite.pass.businesses?.length || 0;

                  return (
                    <Card key={favorite.id} className="overflow-hidden">
                      <div className="relative h-32">
                        <Image
                          src={favorite.pass.image_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"}
                          alt={favorite.pass.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                          onClick={() => handleRemovePassFavorite(favorite.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2 line-clamp-1">
                          {favorite.pass.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {favorite.pass.short_description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{businessCount} businesses</span>
                          </div>
                          {cheapestPrice && (
                            <span className="font-medium text-primary">
                              From ${cheapestPrice}
                            </span>
                          )}
                        </div>
                        <Button variant="outline" className="w-full mt-3" size="sm" asChild>
                          <a href="#passes-section">
                            View on Homepage
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
      </CardContent>
    </Card>
  );
}
