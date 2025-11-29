"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Info, Heart } from "lucide-react";
import { passesData, decorativeElements, passSelectionData } from "@/lib/mockData/passesData";
import { getPlacesByPassId } from "@/lib/mockData/placesData";
import PassSelectionSidebar from "@/components/PassSelectionSidebar";
import Link from "next/link";
import Image from "next/image";
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

// Helper function to get relevant place images for each pass
function getImagesForPass(pass: any): string[] {
  // Get images from businesses array in the pass
  const placeImages = (pass.businesses || [])
    .slice(0, 4)
    .map((business: any) => business.image_url || business.business?.image_url || '')
    .filter((url: string) => url); // Remove empty strings

  // If less than 4 images, fill with default image
  if (placeImages.length < 4) {
    const defaultImage = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=100&fit=crop";
    while (placeImages.length < 4) {
      placeImages.push(defaultImage);
    }
  }

  return placeImages;
}

// Helper function to prepare places for sidebar
function prepareFeaturedAttractions(passId: string) {
  const placesForPass = getPlacesByPassId(passId);

  // Sidebar'daki Place tipine uygun şekilde dönüştür
  return placesForPass.map(place => ({
    id: place.id,
    name: place.name,
    image: place.images?.[0]?.url || '',
    slug: place.slug,
    rating: place.rating?.toString() || '0',
    location: place.location?.district || ''
  }));
}

// Convert database pass to mock format
function convertDatabasePassToMockFormat(dbPass: DatabasePass): any {
  // Debug logs (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Converting pass:', dbPass.name);
    console.log('📊 Pricing data:', dbPass.pricing);
  }

  const adultPricing = dbPass.pricing?.find(p => p.age_group === 'adult' && p.days === 1);

  if (process.env.NODE_ENV === 'development') {
    console.log('💵 Adult pricing found:', adultPricing);
  }

  // Group pricing by days
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

  // Convert to passOptions format
  const passOptions = Array.from(pricingByDays.entries()).map(([days, prices]) => ({
    id: `${dbPass.id}-${days}`,
    days,
    adultPrice: prices.adult || 0,
    childPrice: prices.child || 0
  }));

  // If no pricing options available, create a default one
  if (passOptions.length === 0) {
    passOptions.push({
      id: `${dbPass.id}-1`,
      days: 1,
      adultPrice: 99,
      childPrice: 49
    });
  }

  // Find the cheapest adult pricing to display
  let displayPrice = 99; // Default fallback price
  let displayDays = 1;

  if (dbPass.pricing && dbPass.pricing.length > 0) {
    const adultPricings = dbPass.pricing.filter(p => p.age_group === 'adult');

    if (adultPricings.length > 0) {
      // Sort by price ascending and get the cheapest
      const cheapestAdultPricing = adultPricings.sort((a, b) => a.price - b.price)[0];
      displayPrice = cheapestAdultPricing.price;
      displayDays = cheapestAdultPricing.days;

      if (process.env.NODE_ENV === 'development' && cheapestAdultPricing !== adultPricing) {
        console.log('💰 Using cheapest adult pricing:', displayDays, 'days for $' + displayPrice);
      }
    }
  }

  // Fallback to 1-day pricing if it exists
  if (adultPricing && adultPricing.price > 0) {
    displayPrice = adultPricing.price;
    displayDays = adultPricing.days;
  }

  // If still no price, log warning but continue with fallback
  if (displayPrice === 99 && (!dbPass.pricing || dbPass.pricing.length === 0)) {
    console.warn('⚠️ No pricing found for pass:', dbPass.name, '- using fallback price');
  }

  const result = {
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
    businesses: dbPass.businesses || [] // Add businesses for image strip
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Final pass object:', result);
  }
  return result;
}

export default function PopularPasses() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { currency } = useCurrency();

  // Split passes: primary (popular), sides (2), and the rest for carousel
  const { primaryPass, sidePasses, otherPasses } = useMemo(() => {
    if (!passes || passes.length === 0) {
      return { primaryPass: null, sidePasses: [], otherPasses: [] };
    }
    const primary = passes.find((p) => p.popular) || passes[0];
    const others = passes.filter((p) => p.id !== primary.id);
    const sides = others.slice(0, 2);
    const rest = others.slice(2);
    return { primaryPass: primary, sidePasses: sides, otherPasses: rest };
  }, [passes]);

  // Mark component as mounted after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch passes from database via API
  useEffect(() => {
    async function loadPasses() {
      try {
        setIsLoading(true);
        console.log('🔄 Fetching passes from database...');

        const response = await fetch('/api/passes/active');
        const result = await response.json();

        console.log('📦 API Response:', result);

        if (result.success) {
          console.log('📊 Raw passes data:', result.passes);
          const convertedPasses = result.passes.map(convertDatabasePassToMockFormat);
          console.log('✅ Converted passes:', convertedPasses);
          setPasses(convertedPasses);
        } else {
          console.error('❌ Failed to load passes:', result.error);
        }
      } catch (error) {
        console.error('❌ Error loading passes:', error);
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
        // Remove from favorites - find the favorite ID first
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
        // Add to favorites
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

  // Set up intersection observer after component mounts
  useEffect(() => {
    if (!isMounted) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("passes-section");
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (element && observerRef.current) {
        observerRef.current.unobserve(element);
      }
    };
  }, [isMounted]);

  // Sidebar'ı açma işlevi
  const openSidebar = (passId: string) => {
    setSelectedPass(passId);
    setSidebarOpen(true);
  };

  // Sidebar'ı kapatma işlevi
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Satın alma işlemi handler
  const handleBuyNow = async (selection: PassSelection) => {
    try {
      console.log("Processing purchase:", selection);

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
          currency: chosenCurrency, // Use selected currency from selector (defaults to TRY)
        }),
      });

      const result = await response.json();

      if (result.success) {
        const orderCurrency = currency?.currency_code || result.order.currency || 'TRY';
        const symbol =
          currency?.currency_symbol ||
          (orderCurrency === 'TRY'
            ? '₺'
            : orderCurrency === 'EUR'
            ? '€'
            : orderCurrency === 'GBP'
            ? '£'
            : orderCurrency === 'JPY'
            ? '¥'
            : '$');
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
    <section id="passes-section" className="py-16 relative overflow-hidden bg-background">
      {/* Decorative Background */}
      {isMounted && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="absolute inset-0">
            {decorativeElements.map((elem, i) => (
              <div
                key={i}
                className="absolute animate-pulse-slow"
                style={{
                  left: elem.left,
                  top: elem.top,
                  width: elem.width,
                  height: elem.height,
                  background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
                  opacity: 0.03,
                  animationDelay: elem.delay,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className={`text-3xl font-bold transition-all duration-700 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Our Istanbul Passes
          </h2>
          <p className={`mt-4 text-muted-foreground transition-all duration-700 delay-100 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Choose the pass that works for your trip!
          </p>

          <div className={`mt-8 mb-12 max-w-md mx-auto bg-primary/10 rounded-full py-3 px-6 transition-all duration-700 delay-200 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <p className="text-sm text-center font-medium text-primary">
              1 Day Adult Pass Options
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className={`rounded-lg bg-muted ${index === 1 ? 'h-96' : 'h-80'}`}></div>
              </div>
            ))
          ) : (
            [sidePasses[0], primaryPass, sidePasses[1]].filter(Boolean).map((pass: any, index) => {
              const isFavorited = favorites.has(pass.id);

              return (
            <div
              key={pass.id}
              className={`transition-all duration-700 transform
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <Card className={`relative h-full overflow-hidden border border-border/40 rounded-lg shadow-md
                ${pass.popular ? 'shadow-primary/20 md:scale-105 md:-mt-3 md:-mb-3 z-10' : 'shadow-muted/20'}
                hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}>

                {/* Favorite Button */}
                <button
                  onClick={(e) => handleToggleFavorite(e, pass.id)}
                  className="absolute right-3 top-3 bg-white/90 hover:bg-white rounded-full p-2 transition-colors z-20 shadow-sm"
                >
                  <Heart
                    className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  />
                </button>

                {/* Popular tag */}
                {pass.popular && (
                  <div className="absolute right-0 top-14 bg-primary text-primary-foreground px-4 py-1 text-xs font-medium shadow-md">
                    Most popular
                  </div>
                )}

                <CardHeader className="relative border-b border-border/20 pb-6">
                  <CardTitle className="text-xl font-bold mb-1">{pass.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-4">{pass.description}</p>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-primary"><FormattedPrice price={pass.price} /></span>
                    <div className="ml-2 flex items-center">
                      {pass.wasPrice && (
                        <>
                          <span className="text-sm line-through text-muted-foreground mr-2">
                            <FormattedPrice price={pass.wasPrice} />
                          </span>
                          <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            SAVE {Math.round(((pass.wasPrice - pass.price) / pass.wasPrice) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    from {pass.validDays} day{pass.validDays > 1 ? 's' : ''} {pass.personType} pass
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-6 pt-6">
                  {/* Image strip - Using Next.js Image component */}
                  <div className="flex space-x-1 mb-2 overflow-hidden rounded-md">
                    {getImagesForPass(pass).map((imageUrl, i) => (
                      <div key={i} className="h-16 flex-1 overflow-hidden rounded-sm relative">
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
                  <div className="space-y-3 mt-4 pt-4 border-t border-border/20">
                    {pass.features?.map((feature: { text: string }, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    )) || []}
                  </div>

                  {/* Additional info */}
                  {pass.additionalInfo && (
                    <div className="mt-4 pt-4 border-t border-border/20 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary/70 mt-0.5" />
                        <p className="text-xs">{pass.additionalInfo}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full group transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => openSidebar(pass.id)}
                    data-buy-button
                  >
                    Buy Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
            })
          )}
        </div>

        {/* Carousel for remaining passes */}
        {!isLoading && otherPasses.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">More Passes</h3>
              <Link href="/places">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {otherPasses.map((pass: any) => {
                const isFavorited = favorites.has(pass.id);

                return (
                <Card key={pass.id} className="min-w-[280px] max-w-[320px] flex-1 border hover:shadow-lg transition-shadow relative">
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => handleToggleFavorite(e, pass.id)}
                    className="absolute right-2 top-2 bg-white/90 hover:bg-white rounded-full p-1.5 transition-colors z-10 shadow-sm"
                  >
                    <Heart
                      className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                    />
                  </button>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold pr-8">{pass.title}</CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2">{pass.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <span className="text-2xl font-bold text-primary">{pass.price}</span>
                    </div>
                    <div className="flex space-x-1 overflow-hidden rounded-md">
                      {getImagesForPass(pass).slice(0, 3).map((imageUrl, i) => (
                        <div key={i} className="h-12 flex-1 relative rounded-sm overflow-hidden">
                          <Image src={imageUrl} alt={`Pass ${i + 1}`} fill className="object-cover" sizes="33vw" />
                        </div>
                      ))}
                    </div>
                    <Button variant="secondary" className="w-full" onClick={() => openSidebar(pass.id)}>
                      Select
                    </Button>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </div>
        )}

        {/* Additional information section */}
        <div className={`mt-16 transition-all duration-700 delay-700 transform
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              Note: All passes include free cancellation within 30 days. If you don&apos;t save on your sightseeing, we&apos;ll refund you the difference!
            </p>
          </div>
        </div>
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
    </section>
  );
}
