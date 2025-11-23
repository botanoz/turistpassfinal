// lib/mockData/passesData.ts

import { 
  Ticket, 
  Clock, 
  MapPin, 
  Camera, 
  Sparkles, 
  Utensils, 
  ShoppingBag, 
  Award, 
  Tag, 
  Gift, 
  ShieldCheck, 
  HeartHandshake, 
  Star,
  Coffee,
  Plane,
  CreditCard,
  CalendarCheck
} from "lucide-react";

// Basic interfaces
export interface PassOption {
  id: string;
  days: number;
  adultPrice: number;
  childPrice: number;
  discountPercentage?: number; // Optional percentage discount for this specific option
}

export interface PassFeature {
  icon: any; // Using any for simplicity with Lucide icons
  text: string;
}

export interface PassDiscount {
  percentage: number;
  amount: number;
  expiryDate?: string; // Optional expiry date for the discount
  code?: string; // Optional discount code
}

// Add this new interface before PassData
export interface IncludedPlace {
  id: string;
  name: string;
  image: string;
  slug: string;
  rating?: number;
  location: {
    district: string;
    address?: string;
  };
}

// Extra structure for detailed pass pages
export interface PassSection {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
}

// Enhanced Pass interface
export interface PassData {
  id: string;
  slug: string;
  title: string;
  description: string;
  subtitle: string;
  bannerImage?: string; // Main banner image for the pass page
  color: string;
  popular: boolean;
  price: number;
  wasPrice: number;
  validDays: number;
  personType: string; // Adult, Child, etc.
  accessCount: number;
  extraExperiences?: number;
  features: PassFeature[];
  additionalInfo?: string;
  passOptions: PassOption[];
  discount?: PassDiscount;
  backgroundColor: string;
  compatibility: {
    categories: string[];  // IDs of place categories compatible with this pass
    placeTypes?: string[]; // Optional specific place types within categories
  };
  detailsPage?: {
    heroTitle?: string;
    heroSubtitle?: string;
    sections?: PassSection[];
  };
  includedPlaces: IncludedPlace[]; // Added includedPlaces property
}

// Pass data with enhanced structure
export const passesData: Record<string, PassData> = {
  food: {
    id: "food",
    slug: "food-pass",
    title: "Istanbul Food Pass",
    description: "Experience the best culinary delights of Istanbul with exclusive access to premium restaurants, cafés, and food tours",
    subtitle: "Pick a pass duration and enjoy the best culinary experiences in Istanbul",
    bannerImage: "/images/passes/food-pass-banner.jpg",
    color: "from-orange-500/20 to-red-500/20",
    backgroundColor: "bg-orange-50 dark:bg-orange-950/20",
    popular: false,
    price: 99,
    wasPrice: 200,
    validDays: 1,
    personType: "Adult",
    accessCount: 12,
    features: [
      { 
        icon: Utensils, 
        text: "Access to 12 premium restaurants and cafés" 
      },
      { 
        icon: Tag, 
        text: "20% discount at selected cafés and dessert shops" 
      },
      { 
        icon: Clock, 
        text: "Valid for selected duration from first use" 
      },
      { 
        icon: MapPin, 
        text: "Includes food tour in local bazaars" 
      },
      { 
        icon: ShieldCheck, 
        text: "Free cancellation within 30 days" 
      }
    ],
    passOptions: [
      { 
        id: "food-1day", 
        days: 1, 
        adultPrice: 99, 
        childPrice: 69 
      },
      { 
        id: "food-3day", 
        days: 3, 
        adultPrice: 189, 
        childPrice: 129 
      },
      { 
        id: "food-7day", 
        days: 7, 
        adultPrice: 259, 
        childPrice: 179 
      }
    ],
    discount: {
      percentage: 10,
      amount: 10,
      expiryDate: "2025-12-31"
    },
    compatibility: {
      categories: ["restaurant", "cafe"]
    },
    detailsPage: {
      heroTitle: "Taste the Best of Istanbul",
      heroSubtitle: "Unlimited access to premium culinary experiences throughout the city",
      sections: [
        {
          id: "food-overview",
          title: "Discover Istanbul's Culinary Treasures",
          content: "The Istanbul Food Pass is your key to experiencing the rich flavors of Turkish cuisine. From traditional Ottoman dishes to modern interpretations, discover the city's gastronomic diversity through carefully selected restaurants and cafés. Our pass includes special discounts, exclusive menus, and even food tour experiences.",
          imageUrl: "/images/passes/food-overview.jpg"
        },
        {
          id: "food-benefits",
          title: "Benefits & Features",
          content: "With the Istanbul Food Pass, enjoy priority access to popular restaurants without reservations, special chef's menus not available to regular customers, food tasting sessions, and exclusive dining experiences. The pass also includes a mobile guide to the best street food locations throughout Istanbul.",
          imageUrl: "/images/passes/food-benefits.jpg"
        }
      ]
    },
    includedPlaces: [] // Initialized with empty array
  },
  
  shopping: {
    id: "shopping",
    slug: "shopping-pass",
    title: "Istanbul Shopping Pass",
    description: "The ultimate shopping experience with exclusive discounts at Istanbul's best boutiques and stores",
    subtitle: "Pick a pass duration and get exclusive discounts at Istanbul's best shops",
    bannerImage: "/images/passes/shopping-pass-banner.jpg",
    color: "from-blue-500/20 to-cyan-500/20",
    backgroundColor: "bg-purple-50 dark:bg-purple-950/20",
    popular: false,
    price: 99,
    wasPrice: 200,
    validDays: 1,
    personType: "Adult",
    accessCount: 35,
    features: [
      { 
        icon: ShoppingBag, 
        text: "Discounts at 35+ shops and boutiques" 
      },
      { 
        icon: Gift, 
        text: "Complimentary welcome gift" 
      },
      { 
        icon: Clock, 
        text: "Valid for selected duration from first use" 
      },
      { 
        icon: MapPin, 
        text: "Includes Grand Bazaar shopping guide" 
      },
      { 
        icon: ShieldCheck, 
        text: "Free cancellation within 30 days" 
      }
    ],
    passOptions: [
      { 
        id: "shopping-1day", 
        days: 1, 
        adultPrice: 99, 
        childPrice: 69 
      },
      { 
        id: "shopping-3day", 
        days: 3, 
        adultPrice: 189, 
        childPrice: 129 
      },
      { 
        id: "shopping-7day", 
        days: 7, 
        adultPrice: 259, 
        childPrice: 179 
      }
    ],
    discount: {
      percentage: 10,
      amount: 10,
      expiryDate: "2025-12-31"
    },
    compatibility: {
      categories: ["shopping", "beauty"]
    },
    detailsPage: {
      heroTitle: "Shop Istanbul in Style",
      heroSubtitle: "Exclusive access to the best shopping experiences with special discounts",
      sections: [
        {
          id: "shopping-overview",
          title: "Unlock Premium Shopping Destinations",
          content: "The Istanbul Shopping Pass gives you access to the city's most premium shopping destinations. From luxury brands at İstinye Park and Zorlu Center to unique artisanal boutiques in Galata and Nişantaşı, enjoy special discounts and VIP treatment at each location. The pass includes a personal shopping assistant service at select malls.",
          imageUrl: "/images/passes/shopping-overview.jpg"
        },
        {
          id: "shopping-benefits",
          title: "Exclusive Shopping Benefits",
          content: "With your Istanbul Shopping Pass, receive a complimentary welcome gift, enjoy VIP lounge access at major shopping centers, free shipping for larger purchases, hand-free shopping service to your hotel, and exclusive access to new collection previews and special events.",
          imageUrl: "/images/passes/shopping-benefits.jpg"
        }
      ]
    },
    includedPlaces: [] // Initialized with empty array
  },
  
  sfPlus: {
    id: "sfPlus",
    slug: "sf-plus-pass",
    title: "Istanbul S&F Pass Plus",
    description: "All-inclusive Shopping & Food experience with premium benefits and VIP services",
    subtitle: "Pick a pass duration and visit as many attractions as you wish",
    bannerImage: "/images/passes/sfplus-pass-banner.jpg",
    color: "from-purple-500/20 to-pink-500/20",
    backgroundColor: "bg-blue-50 dark:bg-blue-950/20",
    popular: true,
    price: 149,
    wasPrice: 400,
    validDays: 1,
    personType: "Adult",
    accessCount: 47,
    extraExperiences: 3,
    features: [
      { 
        icon: ShoppingBag, 
        text: "All Shopping Pass benefits included" 
      },
      { 
        icon: Utensils, 
        text: "All Food Pass benefits included" 
      },
      { 
        icon: Award, 
        text: "VIP service at premium locations" 
      },
      { 
        icon: Clock, 
        text: "Valid for selected duration from first use" 
      },
      { 
        icon: MapPin, 
        text: "Includes personal shopping assistant for 2 hours" 
      },
      { 
        icon: Camera, 
        text: "Food photography tour included" 
      },
      { 
        icon: ShieldCheck, 
        text: "Free cancellation within 30 days" 
      }
    ],
    additionalInfo: "The S&F Pass Plus combines all benefits from both Food and Shopping passes, plus 3 premium experiences including a personal shopping assistant and exclusive food tasting events.",
    passOptions: [
      { 
        id: "sfplus-1day", 
        days: 1, 
        adultPrice: 149, 
        childPrice: 99 
      },
      { 
        id: "sfplus-3day", 
        days: 3, 
        adultPrice: 249, 
        childPrice: 169 
      },
      { 
        id: "sfplus-5day", 
        days: 5, 
        adultPrice: 329, 
        childPrice: 229 
      },
      { 
        id: "sfplus-7day", 
        days: 7, 
        adultPrice: 399, 
        childPrice: 279 
      }
    ],
    discount: {
      percentage: 15,
      amount: 22,
      expiryDate: "2025-12-31"
    },
    compatibility: {
      categories: ["restaurant", "cafe", "shopping", "beauty", "spa", "activity", "auto"]
    },
    detailsPage: {
      heroTitle: "The Ultimate Istanbul Experience",
      heroSubtitle: "Combining the best of shopping and dining with exclusive premium services",
      sections: [
        {
          id: "sfplus-overview",
          title: "Premium All-in-One Experience",
          content: "The Istanbul S&F Pass Plus is our premium offering that combines all the benefits of our Food and Shopping passes with additional exclusive experiences. Enjoy VIP treatment at over 47 locations across Istanbul, including fine dining restaurants, luxury boutiques, premium spas, and more.",
          imageUrl: "/images/passes/sfplus-overview.jpg"
        },
        {
          id: "sfplus-benefits",
          title: "Exclusive Premium Benefits",
          content: "With the S&F Pass Plus, receive all standard pass benefits plus three premium experiences: a personal shopping assistant for 2 hours, an exclusive food photography tour, and VIP reservations at Istanbul's most sought-after restaurants. The pass also includes priority access to new collections and special events.",
          imageUrl: "/images/passes/sfplus-benefits.jpg"
        },
        {
          id: "sfplus-extras",
          title: "Additional Premium Services",
          content: "Upgrade your Istanbul experience with our additional premium services: private transportation between venues, professional photography sessions at iconic locations, personalized food tours with local experts, and custom shopping itineraries designed around your preferences and interests.",
          imageUrl: "/images/passes/sfplus-extras.jpg"
        }
      ]
    },
    includedPlaces: [] // Initialized with empty array
  }
};

// Helper function to map place categories to passes
export function getCategoryPassMapping(): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  Object.entries(passesData).forEach(([passId, pass]) => {
    pass.compatibility.categories.forEach(category => {
      mapping[category] = passId;
    });
  });
  
  return mapping;
}

// Helper function to get available passes as an array
export function getPassesArray(): PassData[] {
  return Object.values(passesData);
}

// Helper to get pass by ID
export function getPassById(id: string): PassData | undefined {
  return passesData[id];
}

// Helper to get pass by slug
export function getPassBySlug(slug: string): PassData | undefined {
  return Object.values(passesData).find(pass => pass.slug === slug);
}

// Helper to get all compatible places for a pass
export function getPlacesForPass(passId: string, places: any[]): any[] {
  const pass = passesData[passId];
  if (!pass) return [];
  
  return places.filter(place => 
    pass.compatibility.categories.includes(place.categoryId)
  );
}

// Function to populate passes with included places
export function populatePassesWithPlaces(allPlaces: any[]) {
  Object.keys(passesData).forEach(passId => {
    const pass = passesData[passId];
    
    // Get compatible places for this pass
    const compatiblePlaces = getPlacesForPass(passId, allPlaces);
    
    // Transform places to the format needed for includedPlaces
    pass.includedPlaces = compatiblePlaces.map(place => ({
      id: place.id,
      name: place.name,
      image: place.images[0]?.url || "",
      slug: place.slug,
      rating: place.rating,
      location: {
        district: place.location.district,
        address: place.location.address
      }
    }));
  });
}

// For backward compatibility with existing code
export const passSelectionData = {
  food: {
    title: passesData.food.title,
    subtitle: passesData.food.subtitle,
    featuredAttractions: [], // Will be populated from places data
    passOptions: passesData.food.passOptions,
    discount: passesData.food.discount,
    includedPlaces: []
  },
  shopping: {
    title: passesData.shopping.title,
    subtitle: passesData.shopping.subtitle,
    featuredAttractions: [], // Will be populated from places data
    passOptions: passesData.shopping.passOptions,
    discount: passesData.shopping.discount,
    includedPlaces: []
  },
  sfPlus: {
    title: passesData.sfPlus.title,
    subtitle: passesData.sfPlus.subtitle,
    featuredAttractions: [], // Will be populated from places data
    passOptions: passesData.sfPlus.passOptions,
    discount: passesData.sfPlus.discount,
    includedPlaces: []
  }
};

// For backward compatibility with existing code
export const passes = getPassesArray();

// Decorative elements for the background
export const decorativeElements = [
  { left: "5%", top: "10%", width: "20rem", height: "20rem", delay: "0s" },
  { left: "25%", top: "30%", width: "25rem", height: "25rem", delay: "2s" },
  { left: "60%", top: "15%", width: "30rem", height: "30rem", delay: "4s" },
  { left: "80%", top: "40%", width: "15rem", height: "15rem", delay: "1s" },
  { left: "40%", top: "70%", width: "20rem", height: "20rem", delay: "3s" },
  { left: "70%", top: "60%", width: "25rem", height: "25rem", delay: "5s" }
];