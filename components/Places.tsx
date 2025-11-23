"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Star, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X
} from "lucide-react";
import { 
  placeCategories, 
  places, 
  CATEGORY_TO_PASS_MAP, 
  getPlacesByPassAndCategory
} from "@/lib/mockData/placesData";

// Available passes for tabs
const PASSES = [
  { id: "all", name: "All Places" },
  { id: "food", name: "Food Pass" },
  { id: "shopping", name: "Shopping Pass" },
  { id: "sfPlus", name: "S&F Plus Pass" }
];

// Main Places Content Component
function PlacesContent() {
  // Get search params for initial state - with safe access
  const searchParams = useSearchParams();
  const initialPass = searchParams?.get('pass') || "all";
  
  // State
  const [activePass, setActivePass] = useState(initialPass);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Fixed number of items per page
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  
  // All places data
  const allPlaces = useMemo(() => places, []);

  // Reset active category when pass changes
  useEffect(() => {
    if (activeCategory !== "all") {
      const categoryPass = CATEGORY_TO_PASS_MAP[activeCategory as keyof typeof CATEGORY_TO_PASS_MAP];
      if (activePass !== "all" && categoryPass !== activePass) {
        setActiveCategory("all");
      }
    }
  }, [activePass, activeCategory]);

  // Filter visible categories based on active pass
  const visibleCategories = useMemo(() => {
    if (activePass === "all") {
      return placeCategories;
    }
    
    return placeCategories.filter(category => {
      if (category.id === "all") return true;
      const pass = CATEGORY_TO_PASS_MAP[category.id as keyof typeof CATEGORY_TO_PASS_MAP];
      return pass === activePass;
    });
  }, [activePass]);

  // Filter places based on all criteria
  const filteredPlaces = useMemo(() => {
    // Önce pass ve kategori filtrelemesi yap
    const baseFilteredPlaces = getPlacesByPassAndCategory(
      activePass, 
      activeCategory
    );
    
    // Sonra arama terimini uygula
    if (!searchTerm) return baseFilteredPlaces;
    
    return baseFilteredPlaces.filter(place => 
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activePass, activeCategory, searchTerm]);

  // Get paginated places
  const paginatedPlaces = useMemo(() => {
    return filteredPlaces.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredPlaces, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredPlaces.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activePass, searchTerm]);

  // Scroll categories horizontally
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryContainerRef.current) {
      const container = categoryContainerRef.current;
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title */}
        <div className="text-center py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Places Worth Discovering
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore the best restaurants, cafes, spas, and activities in Istanbul
          </p>
        </div>

        {/* Pass Tabs - Always visible at the top */}
        <div className="mb-6">
          <Tabs 
            defaultValue={activePass} 
            value={activePass}
            onValueChange={setActivePass}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 w-full">
              {PASSES.map(pass => (
                <TabsTrigger key={pass.id} value={pass.id}>
                  {pass.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search places..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Clear All Filters - Only show when filters active */}
          {(activeCategory !== "all" || searchTerm) && (
            <Button 
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                setActiveCategory("all");
                setSearchTerm("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Categories - Only show categories relevant to active pass */}
        {visibleCategories.length > 1 && (
          <div className="relative mb-8">
            <div className="flex items-center justify-center">
              <button 
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-2 shadow-md hidden md:flex items-center justify-center hover:bg-background"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-5 w-5 text-primary" />
              </button>
              
              <div
                ref={categoryContainerRef}
                className="flex items-center overflow-x-auto scrollbar-hide py-4 px-4 max-w-full"
                style={{ scrollBehavior: 'smooth' }}
              >
                {visibleCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex-shrink-0 flex flex-col items-center mx-3 transition-all duration-300 ${
                      activeCategory === category.id 
                        ? 'scale-110' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden mb-2 border-2 ${
                      activeCategory === category.id ? 'border-primary' : 'border-transparent'
                    }`}>
                      <Image 
                        src={category.icon}
                        alt={category.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <span className="text-sm font-medium text-center">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 rounded-full p-2 shadow-md hidden md:flex items-center justify-center hover:bg-background"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-5 w-5 text-primary" />
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredPlaces.length}</span> places found
            {filteredPlaces.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredPlaces.length)} of {filteredPlaces.length}
              </span>
            )}
          </p>
        </div>

        {/* Places Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {paginatedPlaces.map((place) => {
            // Yer'in hangi pas'lere dahil olduğunu göster
            const passNames = place.passIds?.map(passId => 
              PASSES.find(p => p.id === passId)?.name.replace(' Pass', '')
            ).filter(Boolean) || [];
            
            return (
              <Link 
                key={place.id} 
                href={`/places/${place.slug}`}
                className="group block"
              >
                <Card className="overflow-hidden group-hover:shadow-lg transition-all duration-300 h-full">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={place.images?.[0]?.url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"}
                      alt={place.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">
                        {placeCategories.find(c => c.id === place.categoryId)?.name}
                      </Badge>
                    </div>

                    {/* Pass Badge - Only show in "All Places" tab */}
                    {activePass === "all" && passNames.length > 0 && (
                      <div className="absolute top-3 right-3">
                        <Badge 
                          variant="outline" 
                          className="bg-black/50 text-white border-none"
                        >
                          {passNames[0]}
                        </Badge>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{place.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-xs opacity-80">({place.reviewCount || 0})</span>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {place.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {place.shortDescription}
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary/70 flex-shrink-0" />
                        <span className="truncate">{place.location?.district || ''}</span>
                      </div>
                      {place.openHours?.Monday && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary/70 flex-shrink-0" />
                          <span className="truncate">{place.openHours.Monday}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {place.tags?.slice(0, 2).map(tag => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="text-xs bg-accent/10 border-accent/30"
                          >
                            {tag}
                          </Badge>
                        )) || []}
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {place.priceRange || ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPlaces.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No places found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No results for "${searchTerm}"`
                  : `No places found with the selected filters.`
                }
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("all");
                    setActivePass("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredPlaces.length > 0 && totalPages > 1 && (
          <Pagination className="mb-12">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      setCurrentPage(prev => prev - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                // Only show current page, first, last, and nearby pages
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                
                // Show ellipsis between non-consecutive pages
                if (
                  (page === 2 && currentPage > 3) || 
                  (page === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return (
                    <PaginationItem key={`ellipsis-${page}`}>
                      <span className="px-4 py-2">...</span>
                    </PaginationItem>
                  );
                }
                
                return null;
              })}

              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                      setCurrentPage(prev => prev + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage === totalPages ? 'opacity-50 pointer-events-none' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}

// Main export with Suspense-safe wrapper
export default function PlacesPage() {
  return <PlacesContent />;
}