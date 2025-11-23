"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  ArrowLeft,
  MapPin,
  Star,
  ExternalLink,
  Ticket
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { authService } from "@/lib/services/authService";
import type { User as LocalUser } from "@/lib/types/user";
import { getPassBySlug } from "@/lib/mockData/passesData";
import { toast } from "sonner";

export default function FavoritesPage() {
  const mapLocalFavorites = (user: LocalUser) => {
    return (user.favorites || []).map((slug, index) => {
      const passData = getPassBySlug(slug);
      if (!passData) return null;

      return {
        id: `local-fav-${index}`,
        slug,
        passId: passData.id,
        addedAt: new Date().toISOString(),
        pass: {
          id: passData.id,
          name: passData.title,
          short_description: passData.description,
          description: passData.description,
          image_url: passData.bannerImage || passData.includedPlaces?.[0]?.image || "/placeholder-pass.jpg",
          status: 'active',
          popular: passData.popular ?? false,
          pricing: (passData.passOptions || []).map((option) => ({
            days: option.days,
            age_group: 'adult',
            price: option.adultPrice
          })),
          businesses: []
        }
      };
    }).filter(Boolean);
  };

  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true);
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        const response = await fetch('/api/customer/favorites');
        const result = await response.json();

        if (response.status === 401) {
          if (localUser) {
            setFavorites(mapLocalFavorites(localUser));
            return;
          }
          router.push("/login?redirect=/favorites");
          return;
        }

        if (!result.success) {
          if (localUser) {
            setFavorites(mapLocalFavorites(localUser));
            return;
          }
          throw new Error(result.error || 'Failed to load favorites');
        }

        setFavorites(result.favorites || []);
      } catch (err: any) {
        console.error('Error loading favorites:', err);
        const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
        if (localUser) {
          setFavorites(mapLocalFavorites(localUser));
        } else {
          toast.error(err.message || 'Failed to load favorites');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadFavorites();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const localUser = authService.getCurrentUser?.() as LocalUser | undefined;
      const favorite = favorites.find(f => f.id === favoriteId);

      if (favoriteId.startsWith('local-') && localUser && favorite) {
        const updatedFavorites = (localUser.favorites || []).filter(slug => slug !== favorite.slug);
        await authService.updateProfile({ favorites: updatedFavorites } as any);
        setFavorites(favorites.filter(f => f.id !== favoriteId));
        toast.success('Removed from favorites');
        return;
      }

      const response = await fetch(`/api/customer/favorites/${favoriteId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setFavorites(favorites.filter(f => f.id !== favoriteId));
        toast.success('Removed from favorites');
      } else {
        toast.error(result.error || 'Failed to remove favorite');
      }
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      toast.error('Failed to remove favorite');
    }
  };

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
            <h1 className="text-3xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">Places you love in Istanbul</p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Favorite Passes Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start adding passes you love to easily access them later
              </p>
              <Button asChild>
                <Link href="/#passes-section">
                  Browse Passes
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => {
              const pass = favorite.pass;
              if (!pass) return null;

              // Get pricing info
              const adultPricing = pass.pricing?.find((p: any) => p.age_group === 'adult');
              const businessCount = pass.businesses?.length || 0;

              return (
                <Card key={favorite.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={pass.image_url || '/placeholder-pass.jpg'}
                      alt={pass.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white"
                      onClick={() => handleRemoveFavorite(favorite.id)}
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{pass.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pass.short_description || pass.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        <Ticket className="h-3 w-3 mr-1" />
                        {businessCount} locations
                      </Badge>
                      {adultPricing && (
                        <span className="text-lg font-bold text-primary">
                          ${adultPricing.price}
                        </span>
                      )}
                    </div>

                    <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium text-center">
                        Save up to {adultPricing?.discount_percentage || 0}% at partner locations
                      </p>
                    </div>

                    <Button className="w-full" variant="outline" asChild>
                      <Link href={`/#passes-section`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Pass
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
