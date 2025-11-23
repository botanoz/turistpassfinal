import { AdminPass } from "@/lib/types/adminPass";

export const adminPassesData: AdminPass[] = [
  {
    id: "pass-1",
    slug: "istanbul-welcome-pass",
    name: "Istanbul Welcome Pass",
    description: "Experience Istanbul's top attractions with exclusive discounts and skip-the-line access. Perfect for first-time visitors who want to see the best of Istanbul.",
    shortDescription: "Access to 15+ top attractions with exclusive benefits",
    status: "active",
    featured: true,
    popular: true,
    color: "#3b82f6",
    backgroundColor: "bg-blue-50 dark:bg-blue-950/20",
    bannerImage: "/images/passes/istanbul-welcome.jpg",
    pricingOptions: [
      { id: "iwp-1d-adult", days: 1, ageGroup: "adult", basePrice: 200, discountPercent: 0 },
      { id: "iwp-1d-child", days: 1, ageGroup: "child", basePrice: 150, discountPercent: 0 },
      { id: "iwp-3d-adult", days: 3, ageGroup: "adult", basePrice: 350, discountPercent: 10 },
      { id: "iwp-3d-child", days: 3, ageGroup: "child", basePrice: 250, discountPercent: 10 },
      { id: "iwp-5d-adult", days: 5, ageGroup: "adult", basePrice: 500, discountPercent: 15 },
      { id: "iwp-5d-child", days: 5, ageGroup: "child", basePrice: 350, discountPercent: 15 },
    ],
    venues: [
      { venueId: "hagia-sophia", venueName: "Hagia Sophia", category: "Historical", discountPercent: 15, usageRule: { usageType: "once_per_venue" } },
      { venueId: "topkapi-palace", venueName: "Topkapi Palace", category: "Historical", discountPercent: 15, usageRule: { usageType: "once_per_venue" } },
      { venueId: "blue-mosque", venueName: "Blue Mosque", category: "Historical", discountPercent: 0, usageRule: { usageType: "once_per_venue" } },
      { venueId: "basilica-cistern", venueName: "Basilica Cistern", category: "Historical", discountPercent: 10, usageRule: { usageType: "once_per_venue" } },
      { venueId: "galata-tower", venueName: "Galata Tower", category: "Historical", discountPercent: 12, usageRule: { usageType: "once_per_venue" } },
      { venueId: "istanbul-modern", venueName: "Istanbul Modern", category: "Museum", discountPercent: 20, usageRule: { usageType: "once_per_venue" } },
      { venueId: "dolmabahce-palace", venueName: "Dolmabahce Palace", category: "Historical", discountPercent: 15, usageRule: { usageType: "once_per_venue" } },
      { venueId: "grand-bazaar", venueName: "Grand Bazaar", category: "Shopping", discountPercent: 10, usageRule: { usageType: "unlimited" } },
      { venueId: "spice-bazaar", venueName: "Spice Bazaar", category: "Shopping", discountPercent: 10, usageRule: { usageType: "unlimited" } },
    ],
    features: [
      "Skip the line at major attractions",
      "Access to 15+ venues",
      "Valid from first use",
      "Free cancellation up to 24h",
      "Mobile ticket",
      "Multi-language support"
    ],
    homepageContent: {
      title: "Explore Istanbul Like Never Before",
      subtitle: "Visit top attractions and save up to 50% with our all-inclusive pass",
      highlights: [
        "15+ top attractions included",
        "Skip-the-line access",
        "Save up to ₺500",
        "Flexible validity periods"
      ]
    },
    detailsPage: {
      heroTitle: "Istanbul Welcome Pass",
      heroSubtitle: "Your key to Istanbul's most iconic landmarks",
      aboutContent: "The Istanbul Welcome Pass is your ultimate companion for exploring the city's rich history and culture. With access to over 15 top attractions, you'll experience the best of Istanbul while saving money and time. Skip the long queues and enjoy priority access to must-see sites like Hagia Sophia, Topkapi Palace, and more.",
      benefits: [
        "Priority access to major attractions",
        "Significant savings compared to individual tickets",
        "Flexible validity from first use",
        "Free cancellation policy",
        "Digital ticket on your phone",
        "24/7 customer support"
      ],
      included: [
        "Entry to all listed attractions",
        "Skip-the-line privileges",
        "Digital guidebook",
        "Map and directions"
      ],
      notIncluded: [
        "Transportation",
        "Food and beverages",
        "Personal expenses",
        "Hotel accommodation"
      ],
      termsAndConditions: [
        "Valid for selected number of days from first use",
        "Non-transferable",
        "Must present valid ID with student passes",
        "Subject to attraction availability",
        "Free cancellation up to 24 hours before first use"
      ]
    },
    validityDays: [1, 3, 5],
    cancellationPolicy: "Free cancellation up to 24 hours before first use. Full refund guaranteed. No questions asked.",
    totalSold: 1247,
    revenue: 249400,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-10-10T15:30:00Z"
  },
  {
    id: "pass-2",
    slug: "food-beverage-pass",
    name: "Food & Beverage Pass",
    description: "Discover Istanbul's incredible culinary scene with exclusive discounts at 20+ top restaurants, cafes, and food experiences. From traditional Turkish cuisine to modern fusion.",
    shortDescription: "Dine at 20+ restaurants with special discounts",
    status: "active",
    featured: true,
    popular: false,
    color: "#f59e0b",
    backgroundColor: "bg-orange-50 dark:bg-orange-950/20",
    bannerImage: "/images/passes/food-beverage.jpg",
    pricingOptions: [
      { id: "fbp-3d-adult", days: 3, ageGroup: "adult", basePrice: 150, discountPercent: 0 },
      { id: "fbp-3d-child", days: 3, ageGroup: "child", basePrice: 100, discountPercent: 0 },
      { id: "fbp-7d-adult", days: 7, ageGroup: "adult", basePrice: 250, discountPercent: 12 },
      { id: "fbp-7d-child", days: 7, ageGroup: "child", basePrice: 180, discountPercent: 12 },
    ],
    venues: [
      { venueId: "mikla-restaurant", venueName: "Mikla Restaurant", category: "Restaurant", discountPercent: 20, usageRule: { usageType: "once_per_venue" } },
      { venueId: "ciya-sofrasi", venueName: "Çiya Sofrası", category: "Restaurant", discountPercent: 15, usageRule: { usageType: "unlimited" } },
      { venueId: "nusr-et", venueName: "Nusr-Et Steakhouse", category: "Restaurant", discountPercent: 15, usageRule: { usageType: "once_per_venue" } },
      { venueId: "karakoy-lokantasi", venueName: "Karaköy Lokantası", category: "Restaurant", discountPercent: 18, usageRule: { usageType: "limited_count", maxUsagePerVenue: 2 } },
      { venueId: "mandabatmaz", venueName: "Mandabatmaz", category: "Cafe", discountPercent: 10, usageRule: { usageType: "unlimited" } },
      { venueId: "kronotrop", venueName: "Kronotrop", category: "Cafe", discountPercent: 15, usageRule: { usageType: "unlimited" } },
      { venueId: "hafiz-mustafa", venueName: "Hafız Mustafa", category: "Cafe", discountPercent: 12, usageRule: { usageType: "unlimited" } },
    ],
    features: [
      "20+ partner restaurants",
      "15-25% average discount",
      "No booking required",
      "Valid multiple days",
      "Unlimited cafe visits",
      "Dessert shop discounts"
    ],
    homepageContent: {
      title: "Taste the Best of Istanbul",
      subtitle: "Enjoy exclusive dining discounts at the city's finest restaurants",
      highlights: [
        "20+ restaurant partners",
        "Up to 25% discount",
        "Traditional & modern cuisine",
        "Unlimited cafe visits"
      ]
    },
    detailsPage: {
      heroTitle: "Food & Beverage Pass",
      heroSubtitle: "A culinary journey through Istanbul's diverse food scene",
      aboutContent: "Experience Istanbul's world-renowned culinary heritage with our Food & Beverage Pass. From authentic Ottoman cuisine to contemporary fusion restaurants, enjoy exclusive discounts at carefully selected venues. Whether you're craving traditional kebabs, fresh seafood, or artisanal coffee, this pass is your ticket to gastronomic delight.",
      benefits: [
        "Significant savings on dining",
        "Access to exclusive restaurants",
        "No advance booking needed",
        "Multiple uses at cafes",
        "Insider food recommendations",
        "Dietary preference support"
      ],
      included: [
        "Discounts at all partner restaurants",
        "Cafe and coffee shop access",
        "Dessert shop discounts",
        "Digital restaurant guide"
      ],
      notIncluded: [
        "Alcoholic beverages",
        "Service charges and tips",
        "Delivery services",
        "Special event menus"
      ],
      termsAndConditions: [
        "Valid for selected days from activation",
        "Discount applies to food items only",
        "Cannot be combined with other offers",
        "Subject to restaurant availability",
        "Advance reservation recommended for fine dining"
      ]
    },
    validityDays: [3, 7],
    cancellationPolicy: "Free cancellation up to 48 hours before activation. Full refund for unused passes.",
    totalSold: 892,
    revenue: 133800,
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-10-12T14:20:00Z"
  },
  {
    id: "pass-3",
    slug: "premium-all-access",
    name: "Premium All-Access Pass",
    description: "The ultimate Istanbul experience! Combines all benefits from both Welcome and Food passes, plus exclusive VIP services, private tours, and premium experiences.",
    shortDescription: "All-inclusive access to 35+ venues with VIP services",
    status: "active",
    featured: true,
    popular: true,
    color: "#8b5cf6",
    backgroundColor: "bg-purple-50 dark:bg-purple-950/20",
    bannerImage: "/images/passes/premium-all-access.jpg",
    pricingOptions: [
      { id: "paa-3d-adult", days: 3, ageGroup: "adult", basePrice: 450, discountPercent: 15 },
      { id: "paa-3d-child", days: 3, ageGroup: "child", basePrice: 300, discountPercent: 15 },
      { id: "paa-5d-adult", days: 5, ageGroup: "adult", basePrice: 650, discountPercent: 18 },
      { id: "paa-5d-child", days: 5, ageGroup: "child", basePrice: 450, discountPercent: 18 },
      { id: "paa-7d-adult", days: 7, ageGroup: "adult", basePrice: 850, discountPercent: 20 },
      { id: "paa-7d-child", days: 7, ageGroup: "child", basePrice: 600, discountPercent: 20 },
    ],
    venues: [
      { venueId: "hagia-sophia", venueName: "Hagia Sophia", category: "Historical", discountPercent: 20, usageRule: { usageType: "once_per_venue" } },
      { venueId: "topkapi-palace", venueName: "Topkapi Palace", category: "Historical", discountPercent: 20, usageRule: { usageType: "once_per_venue" } },
      { venueId: "galata-tower", venueName: "Galata Tower", category: "Historical", discountPercent: 15, usageRule: { usageType: "once_per_venue" } },
      { venueId: "istanbul-modern", venueName: "Istanbul Modern", category: "Museum", discountPercent: 25, usageRule: { usageType: "once_per_venue" } },
      { venueId: "mikla-restaurant", venueName: "Mikla Restaurant", category: "Restaurant", discountPercent: 25, usageRule: { usageType: "limited_count", maxUsagePerVenue: 2 } },
      { venueId: "ciya-sofrasi", venueName: "Çiya Sofrası", category: "Restaurant", discountPercent: 20, usageRule: { usageType: "unlimited" } },
      { venueId: "nusr-et", venueName: "Nusr-Et Steakhouse", category: "Restaurant", discountPercent: 20, usageRule: { usageType: "once_per_venue" } },
      { venueId: "grand-bazaar", venueName: "Grand Bazaar", category: "Shopping", discountPercent: 15, usageRule: { usageType: "unlimited" } },
      { venueId: "spice-bazaar", venueName: "Spice Bazaar", category: "Shopping", discountPercent: 15, usageRule: { usageType: "unlimited" } },
    ],
    features: [
      "All Welcome Pass attractions",
      "All Food Pass restaurants",
      "VIP skip-the-line access",
      "Private tour guide option",
      "24/7 concierge service",
      "Free airport transfer",
      "Premium customer support",
      "Exclusive experiences"
    ],
    homepageContent: {
      title: "The Ultimate Istanbul Experience",
      subtitle: "VIP access to everything Istanbul has to offer",
      highlights: [
        "35+ attractions & restaurants",
        "VIP skip-the-line everywhere",
        "Private tour options",
        "24/7 concierge service"
      ]
    },
    detailsPage: {
      heroTitle: "Premium All-Access Pass",
      heroSubtitle: "Experience Istanbul like royalty with our most exclusive package",
      aboutContent: "Our Premium All-Access Pass is the crown jewel of Istanbul experiences. Combining the best of our Welcome and Food passes with exclusive VIP services, this is the ultimate way to explore the city. Enjoy priority access, personal concierge services, private tours, and much more. Perfect for those who want the very best Istanbul has to offer.",
      benefits: [
        "VIP treatment everywhere",
        "Skip all lines at attractions",
        "Personal concierge available 24/7",
        "Complimentary airport transfers",
        "Private guided tour options",
        "Exclusive restaurant reservations",
        "Premium customer support",
        "Special event invitations"
      ],
      included: [
        "All Welcome Pass benefits",
        "All Food Pass benefits",
        "VIP fast-track access",
        "Personal concierge service",
        "Private tour guide (4 hours)",
        "Airport transfer (one way)",
        "Premium gift package"
      ],
      notIncluded: [
        "Flight tickets",
        "Hotel accommodation",
        "Travel insurance",
        "Personal shopping expenses"
      ],
      termsAndConditions: [
        "Valid for selected days from first use",
        "Concierge available via WhatsApp",
        "Private tour must be booked 48h in advance",
        "Airport transfer for IST airport only",
        "VIP access subject to venue capacity",
        "Free cancellation up to 72 hours before"
      ]
    },
    validityDays: [3, 5, 7],
    cancellationPolicy: "Free cancellation up to 72 hours before first use. Full refund for unused passes. VIP services are non-refundable once booked.",
    totalSold: 543,
    revenue: 244350,
    createdAt: "2024-03-10T11:00:00Z",
    updatedAt: "2024-10-14T16:45:00Z"
  }
];

export function getAdminPassById(id: string): AdminPass | undefined {
  return adminPassesData.find(pass => pass.id === id);
}

export function getAdminPassBySlug(slug: string): AdminPass | undefined {
  return adminPassesData.find(pass => pass.slug === slug);
}

export function getAllAdminPasses(): AdminPass[] {
  return adminPassesData;
}

export function getActiveAdminPasses(): AdminPass[] {
  return adminPassesData.filter(pass => pass.status === "active");
}

export function getFeaturedAdminPasses(): AdminPass[] {
  return adminPassesData.filter(pass => pass.featured);
}

export function getPopularAdminPasses(): AdminPass[] {
  return adminPassesData.filter(pass => pass.popular);
}

export function getPassVenueIds(passId: string): string[] {
  const pass = getAdminPassById(passId);
  return pass ? pass.venues.map(v => v.venueId) : [];
}

export function isVenueInPass(passId: string, venueId: string): boolean {
  const pass = getAdminPassById(passId);
  return pass ? pass.venues.some(v => v.venueId === venueId) : false;
}

export function getVenueDiscountInPass(passId: string, venueId: string): number {
  const pass = getAdminPassById(passId);
  if (!pass) return 0;
  const venue = pass.venues.find(v => v.venueId === venueId);
  return venue ? venue.discountPercent : 0;
}

export const adminPassesStats = {
  totalPasses: adminPassesData.length,
  activePasses: adminPassesData.filter(p => p.status === "active").length,
  totalSold: adminPassesData.reduce((sum, p) => sum + p.totalSold, 0),
  totalRevenue: adminPassesData.reduce((sum, p) => sum + p.revenue, 0),
};
