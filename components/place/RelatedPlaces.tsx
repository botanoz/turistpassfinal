// components/place/RelatedPlaces.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { places, placeCategories } from "@/lib/mockData/placesData";

interface RelatedPlacesProps {
  currentPlaceId: string;
  currentCategoryId: string;
  passIds: string[];
}

export default function RelatedPlaces({ 
  currentPlaceId, 
  currentCategoryId, 
  passIds 
}: RelatedPlacesProps) {
  // İlgili mekanları filtrele
  const relatedPlaces = React.useMemo(() => {
    const filtered = places
      .filter(place => 
        place.id !== currentPlaceId && // Mevcut mekanı hariç tut
        (
          place.categoryId === currentCategoryId || // Aynı kategori
          (place.passIds && place.passIds.some(passId => passIds.includes(passId))) // Aynı pass'lerde
        )
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Puanına göre sırala
      .slice(0, 8); // İlk 8 tanesini al
    
    return filtered;
  }, [currentPlaceId, currentCategoryId, passIds]);

  if (relatedPlaces.length === 0) {
    return null;
  }

  return (
    <Card className="sticky top-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-lg">You might also like</h3>
        </div>
        
        {/* Yatay Scroll Container */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1">
            {relatedPlaces.map((place) => {
              const categoryName = placeCategories.find(c => c.id === place.categoryId)?.name;
              
              return (
                <Link 
                  key={place.id}
                  href={`/places/${place.slug}`}
                  className="block group flex-shrink-0"
                >
                  <div className="w-[200px] sm:w-[220px] bg-card rounded-lg border hover:shadow-md transition-all duration-200">
                    {/* Resim */}
                    <div className="relative h-32 rounded-t-lg overflow-hidden">
                      <Image
                        src={place.images?.[0]?.url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"}
                        alt={place.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="220px"
                      />
                    </div>
                    
                    {/* İçerik */}
                    <div className="p-3">
                      <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {place.name}
                      </h4>
                      
                      {/* Rating ve Lokasyon */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {place.rating?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">
                            {place.location?.district || 'Istanbul'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Kategori Badge */}
                      {categoryName && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-accent/10"
                        >
                          {categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Scroll Indicator - Mobilde göster */}
          {relatedPlaces.length > 2 && (
            <div className="flex justify-center mt-2 md:hidden">
              <div className="flex gap-1">
                {Array.from({ length: Math.min(relatedPlaces.length, 4) }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* View All Link */}
        {relatedPlaces.length > 4 && (
          <div className="mt-4 pt-4 border-t">
            <Link 
              href={`/places?category=${currentCategoryId}`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              View all similar places →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}