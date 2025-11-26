/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useMemo, Suspense, use, useEffect } from "react";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { placeCategories } from "@/lib/mockData/placesData";
import { passesData } from "@/lib/mockData/passesData";
import PassSelectionSidebar from "@/components/PassSelectionSidebar";
import { Loader2 } from "lucide-react";

// Import modular components
import PlaceHeader from "@/components/place/PlaceHeader";
import PlaceGallery from "@/components/place/PlaceGallery";
import AboutTab from "@/components/place/AboutTab";
import OfferTab from "@/components/place/OfferTab";
import NeedToKnowTab from "@/components/place/NeedToKnowTab";
import ReviewsTab from "@/components/place/ReviewsTab";
import LocationTab from "@/components/place/LocationTab";
import PassInfo from "@/components/place/PassInfo";
import RelatedPlaces from "@/components/place/RelatedPlaces";

interface PlaceDetailPageProps {
  params: Promise<{ slug: string }>;
}

function PlaceDetailContent({ slug }: { slug: string }) {
  const [isPassSidebarOpen, setIsPassSidebarOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [place, setPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realPasses, setRealPasses] = useState<Record<string, any>>({});

  // Fetch business data from API
  useEffect(() => {
    async function fetchBusiness() {
      try {
        setIsLoading(true);
        console.log('Fetching business with slug:', slug);

        const response = await fetch(`/api/businesses/${slug}`);
        const result = await response.json();

        console.log('Business API response:', result);

        if (result.success) {
          setPlace(result.business);

          // Convert passes array to object format for PassInfo component
          if (result.business.passes && result.business.passes.length > 0) {
            const passesObj: Record<string, any> = {};
            result.business.passes.forEach((pass: any) => {
              passesObj[pass.id] = {
                title: pass.name,
                subtitle: pass.short_description || pass.description,
                passOptions: [{ id: `${pass.id}-1`, days: 1, adultPrice: 99, childPrice: 49 }],
                accessCount: 50, // Default
                includedPlaces: []
              };
            });
            setRealPasses(passesObj);
          }
        } else {
          setError(result.error || 'Business not found');
        }
      } catch (err: any) {
        console.error('Error fetching business:', err);
        setError(err.message || 'Failed to load business');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusiness();
  }, [slug]);

  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  // Kategori adını güvenli şekilde bul
  const categoryName = useMemo(() => {
    if (!placeCategories || !place?.categoryId) return '';
    const category = placeCategories.find(c => c && c.id === place.categoryId);
    return category?.name || '';
  }, [place?.categoryId]);

  // Place'in ait olduğu pass'leri bul
  const placePassIds = useMemo(() => {
    return place?.passIds || [];
  }, [place?.passIds]);

  // Varsayılan olarak ilk pass'i seç
  const defaultPassId = useMemo(() => {
    return placePassIds.length > 0 ? placePassIds[0] : 'sfPlus';
  }, [placePassIds]);

  // Seçilen pass'i belirle
  const selectedPass = useMemo(() => {
    if (!passesData) return null;
    return passesData[selectedPassId || defaultPassId] || null;
  }, [selectedPassId, defaultPassId]);

  // PassSelectionSidebar için öne çıkan mekanları hazırla
  const prepareFeaturedAttractions = useMemo(() => {
    if (!selectedPass || !selectedPass.includedPlaces) return [];

    return selectedPass.includedPlaces.slice(0, 8).map(place => ({
      id: place?.id || '',
      name: place?.name || '',
      image: place?.image || '',
      slug: place?.slug || '',
      rating: place?.rating?.toString() || '0',
      location: place?.location?.district || ''
    }));
  }, [selectedPass]);

  // Hangi tabların gösterileceğini belirle
  const hasMenu = useMemo(() => {
    return Boolean(place?.menu && place.menu.length > 0);
  }, [place?.menu]);

  const hasAnnouncements = useMemo(() => {
    return Boolean(place?.announcements && place.announcements.length > 0);
  }, [place?.announcements]);

  // Tab isimleri
  const TABS = {
    ABOUT: "about",
    OFFER: "offer",
    KNOW: "know",
    REVIEWS: "reviews",
    LOCATION: "location"
  } as const;

  // Görüntülenecek tablar
  const visibleTabs = useMemo(() => [
    { id: TABS.ABOUT, label: "About" },
    { id: TABS.OFFER, label: "What We Offer" },
    ...(place?.needToKnowInfo || hasAnnouncements ? [{ id: TABS.KNOW, label: "Need to Know" }] : []),
    { id: TABS.REVIEWS, label: "Reviews" },
    { id: TABS.LOCATION, label: "Location" }
  ], [place?.needToKnowInfo, hasAnnouncements]);

  // Menü fotoğrafını bul
  const menuImage = useMemo(() => {
    if (!place?.images || place.images.length === 0) return undefined;
    return place.images.find((img: { type: string; }) => img && img.type === 'menu');
  }, [place?.images]);

  // Pass satın alma işleyicisi
  const handleBuyPass = (selection: any) => {
    console.log('Pass selection:', selection);
    setIsPassSidebarOpen(false);
  };

  // Show loading state - NOW after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading business details...</p>
        </div>
      </div>
    );
  }

  // Show error or not found
  if (error || !place) {
    notFound();
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

          {/* Header Components */}
          <PlaceHeader
            name={place.name || 'Unknown Place'}
            category={categoryName}
            rating={place.rating}
            reviewCount={place.reviewCount}
            district={place.location?.district || ''}
            shortDescription={place.shortDescription}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

            {/* Right Column - Pass Info */}
            <div className="lg:col-span-1 order-first lg:order-last mb-6 lg:mb-0 space-y-6">
              <PassInfo
                passIds={placePassIds}
                selectedPassId={selectedPassId}
                setSelectedPassId={setSelectedPassId}
                setIsPassSidebarOpen={setIsPassSidebarOpen}
                passes={Object.keys(realPasses).length > 0 ? realPasses : passesData}
              />
            </div>

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6 order-last lg:order-first">

              {/* Photo Gallery */}
              <PlaceGallery
                images={place.images || []}
                altText={place.name || 'Place gallery'}
              />

              {/* Content Tabs */}
              <div className="w-full">
                <Tabs defaultValue={TABS.ABOUT} className="w-full">
                  {/* Tab Navigation */}
                  <div className="border-b border-border overflow-x-auto">
                    <TabsList className="w-max min-w-full h-auto p-0 bg-transparent flex">
                      {visibleTabs.map(tab => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary hover:text-primary/80 bg-transparent rounded-none transition-colors duration-200"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* About Tab */}
                  <TabsContent value={TABS.ABOUT} className="mt-4 sm:mt-6 focus:outline-none">
                    <AboutTab
                      description={place.description || ''}
                      businessInfo={place.businessInfo}
                    />
                  </TabsContent>

                  {/* What We Offer Tab */}
                  <TabsContent value={TABS.OFFER} className="mt-4 sm:mt-6 focus:outline-none">
                    <OfferTab
                      offerDescription={place.offerDescription}
                      activities={place.activities}
                      amenities={place.amenities || []}
                      menu={place.menu}
                      menuImage={menuImage}
                    />
                  </TabsContent>

                  {/* Need to Know Tab */}
                  {(place.needToKnowInfo || hasAnnouncements) && (
                    <TabsContent value={TABS.KNOW} className="mt-4 sm:mt-6 focus:outline-none">
                      <NeedToKnowTab
                        needToKnowInfo={place.needToKnowInfo}
                        announcements={place.announcements}
                        openHours={place.openHours || {}}
                      />
                    </TabsContent>
                  )}

                  {/* Reviews Tab */}
                  <TabsContent value={TABS.REVIEWS} className="mt-4 sm:mt-6 focus:outline-none">
                    <ReviewsTab reviews={place.reviews || []} />
                  </TabsContent>

                  {/* Location Tab */}
                  <TabsContent value={TABS.LOCATION} className="mt-4 sm:mt-6 focus:outline-none">
                    <LocationTab
                      name={place.name || 'Unknown Place'}
                      locationAddress={place.location?.address || ''}
                      branches={place.branches}
                      selectedBranch={selectedBranch}
                      onSelectBranch={setSelectedBranch}
                      contact={place.contact || {}}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Related Places Section - En Alta */}
          <div className="mt-8 sm:mt-12">
            <RelatedPlaces
              currentPlaceId={place.id}
              currentCategoryId={place.categoryId}
              passIds={placePassIds}
            />
          </div>
        </div>
      </div>

      {/* Pass Selection Sidebar */}
      {selectedPass && (
        <PassSelectionSidebar
          isOpen={isPassSidebarOpen}
          onClose={() => setIsPassSidebarOpen(false)}
          passType={selectedPassId || defaultPassId}
          title={selectedPass.title || ''}
          subtitle={selectedPass.subtitle || ''}
          featuredAttractions={prepareFeaturedAttractions}
          passOptions={selectedPass.passOptions || []}
          discount={selectedPass.discount}
          onBuyNow={handleBuyPass}
        />
      )}
    </>
  );
}

function PlaceWrapper({ params }: PlaceDetailPageProps) {
  const resolvedParams = use(params);
  return <PlaceDetailContent slug={resolvedParams.slug} />;
}

export default function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading place details...</p>
        </div>
      </div>
    }>
      <PlaceWrapper params={params} />
    </Suspense>
  );
}
