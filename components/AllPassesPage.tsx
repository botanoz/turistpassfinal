"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Heart, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PassSelectionSidebar from "@/components/PassSelectionSidebar";
import { getPlacesByPassId } from "@/lib/mockData/placesData";
import Image from "next/image";
import Link from "next/link";
import type { Pass as DatabasePass } from "@/lib/services/passService";
import { toast } from "sonner";
import { FormattedPrice } from "@/components/currency/FormattedPrice";
import { useCurrency } from "@/hooks/useCurrency";

interface PassSelection {
  passType: string;
  days: number;
  adults: number;
  children: number;
  totalPrice: number;
  discountCode?: string;
}

// Helper function to get 4 random images from businesses in the pass
function getImagesForPass(pass: any): string[] {
  const businesses = pass.businesses || [];
  const allImages: string[] = [];

  businesses.forEach((pb: any) => {
    const business = pb.business || pb;
    if (business.image_url) {
      allImages.push(business.image_url);
    }
    if (business.gallery_images && Array.isArray(business.gallery_images)) {
      allImages.push(...business.gallery_images);
    }
  });

  const uniqueImages = Array.from(new Set(allImages)).filter((url) => url && url.trim() !== '');
  let selectedImages: string[] = [];
  if (uniqueImages.length > 0) {
    const shuffled = uniqueImages.sort(() => 0.5 - Math.random());
    selectedImages = shuffled.slice(0, 4);
  }

  const defaultImage = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=100&fit=crop";
  while (selectedImages.length < 4) {
    selectedImages.push(defaultImage);
  }

  return selectedImages;
}

// Helper function to prepare places for sidebar
function prepareFeaturedAttractions(passId: string) {
  const placesForPass = getPlacesByPassId(passId);
  return placesForPass.map(place => ({
    id: place.id,
    name: place.name,
    image: place.images?.[0]?.url || '',
    slug: place.slug,
    rating: place.rating?.toString() || '0',
    location: place.location?.district || ''
  }));
}

// Convert database pass to display format
function convertDatabasePassToMockFormat(dbPass: DatabasePass): any {
  const adultPricing = dbPass.pricing?.find(p => p.age_group === 'adult' && p.days === 1);
  const pricingByDays = new Map<number, { adult?: number; child?: number }>();

  dbPass.pricing?.forEach(p => {
    if (!pricingByDays.has(p.days)) {
      pricingByDays.set(p.days, {});
    }
    const dayPricing = pricingByDays.get(p.days)!;
    if (p.age_group === 'adult') {
      dayPricing.adult = p.price;
    } else if (p.age_group === 'child') {
      dayPricing.child = p.price;
    }
  });

  const passOptions = Array.from(pricingByDays.entries()).map(([days, prices]) => ({
    id: `${dbPass.id}-${days}`,
    days,
    adultPrice: prices.adult || 0,
    childPrice: prices.child || 0
  }));

  if (passOptions.length === 0) {
    passOptions.push({
      id: `${dbPass.id}-1`,
      days: 1,
      adultPrice: 99,
      childPrice: 49
    });
  }

  let displayPrice = 99;
  let displayDays = 1;

  if (dbPass.pricing && dbPass.pricing.length > 0) {
    const adultPricings = dbPass.pricing.filter(p => p.age_group === 'adult');
    if (adultPricings.length > 0) {
      const cheapestAdultPricing = adultPricings.sort((a, b) => a.price - b.price)[0];
      displayPrice = cheapestAdultPricing.price;
      displayDays = cheapestAdultPricing.days;
    }
  }

  if (adultPricing && adultPricing.price > 0) {
    displayPrice = adultPricing.price;
    displayDays = adultPricing.days;
  }

  return {
    id: dbPass.id,
    title: dbPass.name,
    description: dbPass.short_description || dbPass.description,
    price: displayPrice,
    wasPrice: undefined,
    popular: dbPass.popular,
    validDays: displayDays,
    personType: 'adult',
    accessCount: dbPass.businesses?.length || 0,
    extraExperiences: undefined,
    features: dbPass.features?.map(f => ({ text: f })) || [],
    additionalInfo: undefined,
    passOptions,
    discount: undefined,
    subtitle: dbPass.hero_subtitle || '',
    businesses: dbPass.businesses || []
  };
}

export default function AllPassesPage() {
  const [passes, setPasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'attractions'>('popular');
  const { currency } = useCurrency();

  // Fetch passes from database
  useEffect(() => {
    async function loadPasses() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/passes/active');
        const result = await response.json();

        if (result.success) {
          const convertedPasses = result.passes.map(convertDatabasePassToMockFormat);
          setPasses(convertedPasses);
        } else {
          console.error('Failed to load passes:', result.error);
          toast.error('Failed to load passes');
        }
      } catch (error) {
        console.error('Error loading passes:', error);
        toast.error('Failed to load passes');
      } finally {
        setIsLoading(false);
      }
    }
    loadPasses();
  }, []);

  // Fetch favorites
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const response = await fetch('/api/customer/favorites');
        const result = await response.json();
        if (result.success) {
          const favIds = new Set<string>(result.favorites.map((f: any) => f.passId));
          setFavorites(favIds);
        }
      } catch (error) {
        // User might not be logged in
      }
    }
    fetchFavorites();
  }, []);

  // Toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent, passId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const isFavorited = favorites.has(passId);

      if (isFavorited) {
        const response = await fetch('/api/customer/favorites');
        const result = await response.json();

        if (result.success) {
          const favorite = result.favorites.find((f: any) => f.passId === passId);
          if (favorite) {
            const deleteResponse = await fetch(`/api/customer/favorites/${favorite.id}`, {
              method: 'DELETE'
            });

            const deleteResult = await deleteResponse.json();
            if (deleteResult.success) {
              setFavorites(prev => {
                const newFavorites = new Set(prev);
                newFavorites.delete(passId);
                return newFavorites;
              });
              toast.success('Removed from favorites');
            }
          }
        }
      } else {
        const response = await fetch('/api/customer/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passId })
        });

        const result = await response.json();

        if (result.success) {
          setFavorites(prev => {
            const newFavorites = new Set(prev);
            newFavorites.add(passId);
            return newFavorites;
          });
          toast.success('Added to favorites');
        } else if (result.error === 'Unauthorized') {
          toast.error('Please login to add favorites');
        } else {
          toast.error(result.error || 'Failed to add favorite');
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  // Filter and sort passes
  const filteredPasses = useMemo(() => {
    let filtered = passes.filter(pass =>
      pass.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pass.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => {
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return 0;
        });
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'attractions':
        filtered.sort((a, b) => b.accessCount - a.accessCount);
        break;
    }

    return filtered;
  }, [passes, searchTerm, sortBy]);

  const openSidebar = (passId: string) => {
    setSelectedPass(passId);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleBuyNow = async (selection: PassSelection) => {
    try {
      const selectedPassData = passes.find(p => p.id === selection.passType);
      if (!selectedPassData) {
        toast.error("Pass not found");
        return;
      }

      const selectedOption = selectedPassData.passOptions.find(
        (opt: any) => opt.days === selection.days
      );

      if (!selectedOption) {
        toast.error("Price option not found");
        return;
      }

      const chosenCurrency = currency?.currency_code || 'TRY';

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passId: selection.passType,
          passName: selectedPassData.title,
          days: selection.days,
          adults: selection.adults,
          children: selection.children,
          adultPrice: selectedOption.adultPrice,
          childPrice: selectedOption.childPrice,
          discount: selectedPassData.discount,
          discountCode: selection.discountCode || null,
          currency: chosenCurrency,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const orderCurrency = currency?.currency_code || result.order.currency || 'TRY';
        const symbol =
          currency?.currency_symbol ||
          (orderCurrency === 'TRY' ? '₺' :
           orderCurrency === 'EUR' ? '€' :
           orderCurrency === 'GBP' ? '£' :
           orderCurrency === 'JPY' ? '¥' : '$');

        toast.success("Order created successfully", {
          description: `Order #${result.order.orderNumber} - Total ${symbol}${Number(result.order.totalAmount).toFixed(2)}${result.simulated ? " - payment simulated" : ""}`,
        });
        closeSidebar();
      } else {
        toast.error("Order failed", { description: result.error || "Unknown error occurred" });
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error("Purchase failed", { description: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-3">All Istanbul Passes</h1>
          <p className="text-muted-foreground text-lg">
            Choose the perfect pass for your Istanbul adventure
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search passes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="attractions">Most Attractions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mb-6 text-sm text-muted-foreground">
          Showing {filteredPasses.length} of {passes.length} passes
        </div>

        {/* Passes Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="rounded-lg bg-muted h-96"></div>
              </div>
            ))}
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No passes found</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSortBy('popular');
              }}
              className="mt-4"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPasses.map((pass) => {
              const isFavorited = favorites.has(pass.id);

              return (
                <Card
                  key={pass.id}
                  className="relative overflow-hidden border hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => handleToggleFavorite(e, pass.id)}
                    className="absolute right-3 top-3 bg-white/90 hover:bg-white rounded-full p-2 transition-colors z-10 shadow-sm"
                  >
                    <Heart
                      className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                    />
                  </button>

                  {/* Popular Badge */}
                  {pass.popular && (
                    <div className="absolute left-0 top-4 bg-primary text-primary-foreground px-4 py-1 text-xs font-medium shadow-md z-10">
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="relative border-b pb-6">
                    <CardTitle className="text-xl font-bold mb-1 pr-10">{pass.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-4">{pass.description}</p>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">
                        <FormattedPrice price={pass.price} />
                      </span>
                      {pass.wasPrice && (
                        <>
                          <span className="text-sm line-through text-muted-foreground ml-2">
                            <FormattedPrice price={pass.wasPrice} />
                          </span>
                          <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded ml-2">
                            SAVE {Math.round(((pass.wasPrice - pass.price) / pass.wasPrice) * 100)}%
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      from {pass.validDays} day{pass.validDays > 1 ? 's' : ''} {pass.personType} pass
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    {/* Image Strip */}
                    <div className="flex space-x-1 overflow-hidden rounded-md">
                      {getImagesForPass(pass).map((imageUrl, i) => (
                        <div key={i} className="h-16 flex-1 relative rounded-sm overflow-hidden">
                          <Image
                            src={imageUrl}
                            alt={`Place ${i + 1} for ${pass.title}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 25vw, 20vw"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="font-medium text-sm">
                      Access {pass.accessCount} attractions, tours and activities
                      {pass.extraExperiences && (
                        <span className="text-primary">, plus {pass.extraExperiences} extra experiences</span>
                      )}
                    </div>

                    <Link href={`/places?pass=${pass.id}`}>
                      <Button
                        variant="secondary"
                        className="w-full bg-transparent border border-primary/40 text-primary hover:bg-primary/10"
                      >
                        View the full list
                      </Button>
                    </Link>

                    {/* Features */}
                    <div className="space-y-3 pt-4 border-t">
                      {pass.features?.slice(0, 3).map((feature: { text: string }, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm">{feature.text}</span>
                        </div>
                      )) || []}
                    </div>

                    <Button
                      className="w-full group"
                      onClick={() => openSidebar(pass.id)}
                    >
                      Buy Now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pass Selection Sidebar */}
      {(() => {
        const selectedPassData = passes.find(p => p.id === selectedPass);
        return selectedPass && selectedPassData && (
          <PassSelectionSidebar
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            passType={selectedPass}
            title={selectedPassData.title}
            subtitle={selectedPassData.subtitle}
            featuredAttractions={prepareFeaturedAttractions(selectedPass)}
            passOptions={selectedPassData.passOptions}
            discount={selectedPassData.discount}
            onBuyNow={handleBuyNow}
          />
        );
      })()}
    </div>
  );
}
