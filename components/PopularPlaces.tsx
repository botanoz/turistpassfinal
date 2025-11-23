"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, MapPin, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { placeCategories } from "@/lib/mockData/placesData";
import { getAllBusinessesForPlaces, type Business } from "@/lib/services/businessService";
import { getActivePasses, type Pass } from "@/lib/services/passService";

// Helper function to convert Business to Place format
function convertBusinessToPlace(business: Business, passIds: string[] = []) {
  // Try to get images from business_accounts metadata first, then fallback to gallery_images or image_url
  // Priority: 1. metadata images 2. gallery_images 3. image_url 4. placeholder
  const metadataImages = business.business_accounts?.[0]?.metadata?.profile?.images || [];
  const galleryImages = business.gallery_images || [];
  const allImages = [...metadataImages, ...galleryImages];

  // Use the first available image, or fallback to placeholder
  const mainImageUrl = allImages[0] || business.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop';

  return {
    id: business.id,
    name: business.name,
    slug: business.id,
    description: business.description || '',
    shortDescription: business.short_description || business.description?.substring(0, 150) || '',
    rating: 4.5,
    reviewCount: 0,
    categoryId: business.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'),
    passIds: passIds,
    images: [
      {
        id: '1',
        url: mainImageUrl,
        alt: business.name,
        type: 'main'
      }
    ],
    location: {
      address: business.address || '',
      district: business.address?.split(',')[0] || 'Istanbul',
      coordinates: {
        lat: business.latitude || 41.0082,
        lng: business.longitude || 28.9784
      },
      nearbyLandmarks: []
    },
    contact: {},
    openHours: {
      Monday: '09:00 - 22:00',
      Tuesday: '09:00 - 22:00',
      Wednesday: '09:00 - 22:00',
      Thursday: '09:00 - 22:00',
      Friday: '09:00 - 22:00',
      Saturday: '10:00 - 23:00',
      Sunday: '10:00 - 23:00'
    },
    amenities: [],
    tags: [business.category]
  };
}

export default function PopularPlaces() {
  const [isVisible, setIsVisible] = useState(false);
  const [activePass, setActivePass] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [visiblePlaces, setVisiblePlaces] = useState(8);
  const [places, setPlaces] = useState<any[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  // Kategorileri ekrana sığdırmak için gerekli hesaplamalar
  const [categoryItemWidth, setCategoryItemWidth] = useState(110); // Varsayılan genişlik (büyütülmüş)
  const [containerWidth, setContainerWidth] = useState(0);
  const [needsControls, setNeedsControls] = useState(false);

  // Fetch passes and businesses from database
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch passes with their businesses
        const activePasses = await getActivePasses();
        setPasses(activePasses);

        // Fetch all businesses
        const businesses = await getAllBusinessesForPlaces();

        // Create a map of business_id -> pass_ids
        const businessPassMap = new Map<string, string[]>();
        activePasses.forEach(pass => {
          pass.businesses?.forEach(pb => {
            const passIds = businessPassMap.get(pb.business_id) || [];
            passIds.push(pass.id);
            businessPassMap.set(pb.business_id, passIds);
          });
        });

        // Convert businesses to places with their pass associations
        const convertedPlaces = businesses.map(business => {
          const passIds = businessPassMap.get(business.id) || [];
          return convertBusinessToPlace(business, passIds);
        });

        setPlaces(convertedPlaces);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    // Ekran boyutunu ve kategori sayısını kontrol ederek gerekli ayarlamaları yap
    const updateLayout = () => {
      if (categoryContainerRef.current) {
        const container = categoryContainerRef.current;
        const containerWidth = container.clientWidth;
        setContainerWidth(containerWidth);

        // Ekran genişliğine göre kategori öğesi genişliğini ayarla - daha büyük değerler
        const newItemWidth = window.innerWidth < 640 ? 84 : window.innerWidth < 768 ? 95 : window.innerWidth < 1024 ? 110 : 120;
        setCategoryItemWidth(newItemWidth);

        // Tüm kategorilerin toplam genişliği
        const totalCategoriesWidth = placeCategories.length * newItemWidth;

        // Kontrollerin gerekli olup olmadığını belirle
        setNeedsControls(totalCategoriesWidth > containerWidth);
      }
    };

    // İlk yükleme ve ekran boyutu değişikliklerinde çalıştır
    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  // Intersection Observer for visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("places-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  // Filter places based on active pass and category
  const filteredPlaces = places.filter(place => {
    // Filter by pass
    const passMatch = activePass === "all" || place.passIds.includes(activePass);

    // Filter by category
    const categoryMatch = activeCategory === "all" || place.categoryId === activeCategory;

    return passMatch && categoryMatch;
  });

  // Show more places
  const handleShowMore = () => {
    setVisiblePlaces(prev => prev + 8);
  };

  // Scroll categories
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryContainerRef.current) {
      const container = categoryContainerRef.current;
      const scrollAmount = direction === 'left' ? -container.clientWidth / 2 : container.clientWidth / 2;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="places-section"
      className="py-12 md:py-16 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Title */}
        <div className="text-center mb-8">
          <h2
            className={`text-xl md:text-2xl lg:text-3xl font-bold transition-all duration-700 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            Places Worth Discovering
          </h2>
          <p
            className={`mt-2 text-muted-foreground text-xs md:text-sm transition-all duration-700 delay-100 transform
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            Explore the best restaurants, cafes, spas, and activities in Istanbul
          </p>
        </div>

        {/* Pass Selection */}
        <div className={`mb-8 transition-all duration-700 delay-150 transform
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex justify-center items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setActivePass("all");
                setActiveCategory("all");
                setVisiblePlaces(8);
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activePass === "all"
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              All Places
            </button>
            {passes.map((pass) => (
              <button
                key={pass.id}
                onClick={() => {
                  setActivePass(pass.id);
                  setActiveCategory("all");
                  setVisiblePlaces(8);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activePass === pass.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {pass.name}
              </button>
            ))}
          </div>

          {/* Places Found Counter */}
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(visiblePlaces, filteredPlaces.length)} of {filteredPlaces.length} places found
            </p>
          </div>
        </div>

        {/* Category Selection */}
        <div className={`relative mb-10 transition-all duration-700 delay-200 transform
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

          <div className="flex justify-center items-center relative">
            {/* Left scroll button */}
            {needsControls && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-2 shadow-md hidden md:flex items-center justify-center hover:bg-background"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </button>
            )}

            {/* Categories container - wrapperless version for better layout control */}
            <div
              ref={categoryContainerRef}
              className="flex items-center overflow-x-auto scrollbar-hide py-2 px-6 max-w-full"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none'
              }}
            >
              {placeCategories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setVisiblePlaces(8);
                  }}
                  style={{
                    width: `${categoryItemWidth - 24}px`,
                    marginLeft: index === 0 ? '0' : '24px'
                  }}
                  className={`flex-shrink-0 flex flex-col items-center transition-all duration-300 ${activeCategory === category.id
                    ? 'scale-105 sm:scale-110'
                    : 'opacity-70 hover:opacity-100'
                    }`}
                >
                  <div className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden mb-2 border-2 ${activeCategory === category.id ? 'border-primary' : 'border-transparent'
                    }`}>
                    <Image
                      src={category.icon || "https://placehold.co/200x200?text=Category"}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 56px, (max-width: 768px) 64px, (max-width: 1024px) 80px, 96px"
                    />
                  </div>
                  <span className="text-xs sm:text-sm md:text-base font-medium truncate w-full text-center">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Right scroll button */}
            {needsControls && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-2 shadow-md hidden md:flex items-center justify-center hover:bg-background"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
            )}
          </div>

          {/* Active category indicator - gives visual feedback */}
          {needsControls && (
            <div className="mt-3 flex justify-center">
              <div className="h-1 bg-primary/10 rounded-full w-48 relative overflow-hidden">
                <div
                  className="absolute h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${100 / placeCategories.length}%`,
                    left: `${placeCategories.findIndex(c => c.id === activeCategory) * (100 / placeCategories.length)}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Places Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading places...</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 transition-all duration-700 delay-300 transform
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

            {filteredPlaces.slice(0, visiblePlaces).map((place) => (
            <Link
              key={place.id}
              href={`/places/${place.slug}`}
              className="block group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
            >
              <Card className="overflow-hidden group-hover:shadow-lg transition-all duration-300 h-full cursor-pointer">
                {/* Place Image */}
                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                  <Image
                    src={place.images?.[0]?.url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop"}
                    alt={place.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Image Badges */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    {place.tags?.[0] && (
                      <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">
                        {place.tags[0]}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-white">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-primary text-primary" />
                      <span className="text-xs sm:text-sm">{place.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Place Details */}
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 group-hover:text-primary transition-colors line-clamp-1">
                    {place.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                    {place.shortDescription || place.description}
                  </p>

                  {/* Location & Hours */}
                  <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-primary/70 flex-shrink-0" />
                      <span className="truncate">{place.location?.district || 'Istanbul'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary/70 flex-shrink-0" />
                      <span className="truncate">{place.openHours?.Monday || '09:00 - 22:00'}</span>
                    </div>
                  </div>

                  {/* Additional Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {place.tags?.slice(1, 3).map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] sm:text-xs bg-accent/10 border-accent/30 px-1.5 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
            ))}
          </div>
        )}

        {/* Show More Button */}
        {!loading && filteredPlaces.length > visiblePlaces && (
          <div className="flex justify-center mt-8 sm:mt-10">
            <Button
              onClick={handleShowMore}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              Daha Fazla Göster
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
