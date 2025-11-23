// lib/mockData/placesData.ts

export interface PlaceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface PlaceImage {
  id: string;
  url: string;
  alt: string;
  type: 'main' | 'gallery' | 'menu';
}

export interface PlaceLocation {
  address: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  nearbyLandmarks: string[];
}

export interface PlaceMenu {
  id: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  image?: string;
}

export interface PlaceReview {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
}

export interface PlaceBranch {
  id: string;
  name: string;
  address: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface PlaceActivity {
  id: string;
  title: string;
  description: string;
  image?: string;
  availability?: string;
  price?: string;
}

export interface PlaceAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'special';
  date: string;
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  rating: number;
  reviewCount: number;
  categoryId: string;
  // Hangi pass'lere dahil olduğunu belirtmek için eklendi
  passIds: string[];
  images: PlaceImage[];
  location: PlaceLocation;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    social?: {
      instagram?: string;
      facebook?: string;
    };
  };
  openHours: {
    [key: string]: string;
  };
  amenities: string[];
  tags: string[];
  priceRange: string;
  menu?: PlaceMenu[];
  reviews: PlaceReview[];
  features: {
    wifi: boolean;
    parking: boolean;
    creditCard: boolean;
    reservation: boolean;
    delivery: boolean;
    terrace: boolean;
  };
  businessInfo: {
    established?: string;
    capacity?: string;
    dressCode?: string;
    languages?: string[];
  };
  branches?: PlaceBranch[];
  activities?: PlaceActivity[];
  announcements?: PlaceAnnouncement[];
  offerDescription?: string;
  needToKnowInfo?: string;
}

// Kategori-Pass eşleştirme tablosu
export const CATEGORY_TO_PASS_MAP = {
  "restaurant": "food",
  "cafe": "food",
  "shopping": "shopping",
  "beauty": "shopping",
  "spa": "sfPlus",
  "activity": "sfPlus",
  "auto": "sfPlus"
};

export const placeCategories: PlaceCategory[] = [
  {
    id: "all",
    name: "All",
    icon: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop&crop=center",
    color: "bg-blue-500"
  },
  {
    id: "restaurant",
    name: "Restaurant",
    icon: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=100&h=100&fit=crop&crop=center",
    color: "bg-orange-500"
  },
  {
    id: "cafe",
    name: "Cafe",
    icon: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100&h=100&fit=crop&crop=center",
    color: "bg-amber-500"
  },
  {
    id: "spa",
    name: "Spa & Massage",
    icon: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=100&h=100&fit=crop&crop=center",
    color: "bg-green-500"
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop&crop=center",
    color: "bg-purple-500"
  },
  {
    id: "activity",
    name: "Activity",
    icon: "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=100&h=100&fit=crop&crop=center",
    color: "bg-indigo-500"
  },
  {
    id: "beauty",
    name: "Beauty",
    icon: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=100&h=100&fit=crop&crop=center",
    color: "bg-pink-500"
  },
  {
    id: "auto",
    name: "Auto Service",
    icon: "https://images.unsplash.com/photo-1486546910464-ec8e45c4a137?w=100&h=100&fit=crop&crop=center",
    color: "bg-gray-500"
  }
];

// Temel yer listemiz (4 adet örnek mekan)
const baseLocations = [
  {
    id: "mikla-restaurant",
    name: "Mikla Restaurant",
    categoryId: "restaurant",
    location: {
      district: "Beyoğlu"
    },
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=800&h=600&fit=crop",
    description: "Modern Turkish cuisine with Scandinavian influences"
  },
  {
    id: "mandabatmaz-kahve",
    name: "Mandabatmaz",
    categoryId: "cafe",
    location: {
      district: "Beyoğlu"
    },
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop",
    description: "Best traditional Turkish coffee in Istanbul"
  },
  {
    id: "ruya-spa",
    name: "Rüya Spa",
    categoryId: "spa",
    location: {
      district: "Beşiktaş"
    },
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop",
    description: "Luxury spa experience with traditional Turkish bath"
  },
  {
    id: "beymen-istinye",
    name: "Beymen - İstinye Park",
    categoryId: "shopping",
    location: {
      district: "Sarıyer"
    },
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
    description: "Istanbul's premier luxury department store"
  }
];

// Her bir kategori için ilave içerik 
const categorySeedContent = {
  "restaurant": {
    locations: ["Nişantaşı", "Kadıköy", "Karaköy", "Beşiktaş", "Sultanahmet", "Galata", "Moda", "Bebek"],
    prefixes: ["Sultan", "Lokanta", "Kebap", "Ocakbaşı", "Bosphorus", "Meyhane", "Restoran", "Gurme"],
    suffixes: ["Restaurant", "Cuisine", "Evi", "Garden", "Terrace", "Grill", "Ocağı", "Sofrası"],
    descriptions: [
      "Authentic Turkish flavors with a modern twist",
      "Traditional Ottoman cuisine in a historic setting",
      "Family recipes passed down through generations",
      "Farm-to-table experience with local ingredients",
      "Seafood specialties with Bosphorus views",
      "Contemporary dining experience with Turkish influence",
      "Fusion cuisine combining Turkish and international flavors",
      "Specialty kebabs and grilled meats in a cozy atmosphere"
    ],
    images: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop"
    ],
    openHours: "11:00 - 23:00",
    tags: ["Turkish Cuisine", "Fine Dining", "Kebab", "Seafood", "Ottoman", "Mezze", "Grill", "Local"],
    priceRanges: ["$$", "$$$", "$$$$"],
    amenities: ["Outdoor seating", "Live music", "Private dining", "Valet parking", "Reservation required", "View terrace", "Wine selection", "Kids menu"]
  },
  "cafe": {
    locations: ["Karaköy", "Cihangir", "Galata", "Kadıköy", "Moda", "Bebek", "Nişantaşı", "Beşiktaş"],
    prefixes: ["Cafe", "Kahve", "Coffee", "Çay", "Patisserie", "Kafe", "Daily", "Artisan"],
    suffixes: ["House", "Roasters", "Corner", "Garden", "Lab", "Bakery", "Lounge", "Co."],
    descriptions: [
      "Specialty coffee with beans roasted in-house",
      "Traditional Turkish coffee prepared on hot sand",
      "Cozy spot to enjoy coffee and homemade pastries",
      "Third-wave coffee shop with expert baristas",
      "Artisanal coffee and fresh breakfast all day",
      "Historic coffee house with authentic atmosphere",
      "French-inspired patisserie and quality coffee",
      "Coffee lab with various brewing methods"
    ],
    images: [
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800&h=600&fit=crop"
    ],
    openHours: "08:00 - 22:00",
    tags: ["Coffee", "Breakfast", "Pastry", "Turkish Coffee", "Espresso", "Dessert", "Brunch", "Tea"],
    priceRanges: ["$", "$$"],
    amenities: ["Free WiFi", "Outdoor seating", "Power outlets", "Pet friendly", "Takeaway", "Homemade desserts", "Breakfast all day", "Board games"]
  },
  "spa": {
    locations: ["Nişantaşı", "Beşiktaş", "Etiler", "Kadıköy", "Şişli", "Levent", "Bebek", "Moda"],
    prefixes: ["Zen", "Lotus", "Oriental", "Hammam", "Therme", "Wellness", "Serenity", "Anatolia"],
    suffixes: ["Spa", "Wellness", "Hammam", "Retreat", "Therapy", "Palace", "Center", "House"],
    descriptions: [
      "Traditional Turkish bath with modern luxury",
      "Holistic wellness center for rejuvenation",
      "Therapeutic massage treatments with organic oils",
      "Historic hammam experience with expert therapists",
      "Luxury spa services in a tranquil environment",
      "Complete wellness journey with custom treatments",
      "Ancient healing traditions with modern techniques",
      "Relaxation oasis in the heart of the city"
    ],
    images: [
      "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop"
    ],
    openHours: "10:00 - 21:00",
    tags: ["Massage", "Hammam", "Facial", "Wellness", "Relaxation", "Body Treatment", "Sauna", "Therapy"],
    priceRanges: ["$$$", "$$$$"],
    amenities: ["Sauna", "Steam room", "Relaxation lounge", "Changing rooms", "Private treatment rooms", "Couples massage", "Herbal tea service", "Reservation required"]
  },
  "shopping": {
    locations: ["Nişantaşı", "İstinye", "Zorlu Center", "Bağdat Caddesi", "Karaköy", "Galata", "Kanyon", "Akasya"],
    prefixes: ["Boutique", "Gallery", "Concept", "Design", "Grand", "Elite", "Luxe", "Artisan"],
    suffixes: ["Store", "Boutique", "Collection", "Atelier", "Shop", "Galleria", "Market", "Shoppe"],
    descriptions: [
      "Curated collection of luxury fashion brands",
      "Handcrafted local designs and artisanal products",
      "Premium shopping experience with personal stylists",
      "Designer fashion in an elegant atmosphere",
      "Concept store featuring unique Turkish designers",
      "Luxury retail destination with global brands",
      "Exclusive collections and limited edition pieces",
      "Upscale shopping with VIP services"
    ],
    images: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555529669-c911354bb353?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=800&h=600&fit=crop"
    ],
    openHours: "10:00 - 22:00",
    tags: ["Fashion", "Luxury", "Designer", "Boutique", "Accessories", "Jewelry", "Home Decor", "Turkish Design"],
    priceRanges: ["$$$", "$$$$"],
    amenities: ["Personal shopping", "Alterations", "Gift wrapping", "VIP lounge", "Coffee service", "Tax free shopping", "Valet parking", "Delivery service"]
  },
  "activity": {
    locations: ["Eminönü", "Sultanahmet", "Beyoğlu", "Balat", "Kadıköy", "Boğaz", "Fatih", "Adalar"],
    prefixes: ["Istanbul", "Heritage", "Discovery", "Adventure", "City", "Cultural", "Historic", "Secret"],
    suffixes: ["Tours", "Experience", "Adventure", "Exploration", "Excursion", "Discovery", "Journey", "Guide"],
    descriptions: [
      "Guided tours through Istanbul's historic sites",
      "Cultural experiences with local experts",
      "Bosphorus cruises with panoramic city views",
      "Photography tours in hidden corners of Istanbul",
      "Food tours exploring local culinary traditions",
      "Walking tours through historic neighborhoods",
      "Private guides for customized city explorations",
      "Heritage tours revealing Ottoman history"
    ],
    images: [
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1626175330440-9d12da8d2f86?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1636651829413-3c89fced9d6e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1599581425921-726d5cb8f3c3?w=800&h=600&fit=crop"
    ],
    openHours: "09:00 - 18:00",
    tags: ["Tour", "Sightseeing", "Cultural", "Historical", "Bosphorus", "Walking Tour", "Photography", "Local Guide"],
    priceRanges: ["$$", "$$$"],
    amenities: ["English speaking guides", "Small groups", "Private tours", "Pickup service", "Audio guides", "Mobile tickets", "Free cancellation", "Photo opportunities"]
  },
  "beauty": {
    locations: ["Nişantaşı", "Etiler", "Bebek", "Kadıköy", "Levent", "Şişli", "Moda", "Zorlu Center"],
    prefixes: ["Glamour", "Beauty", "Aesthetic", "Glam", "Chic", "Elegance", "Style", "Pure"],
    suffixes: ["Salon", "Studio", "Center", "Atelier", "House", "Club", "Lab", "Room"],
    descriptions: [
      "Premium beauty salon with expert stylists",
      "Luxury hair salon with the latest trends",
      "Exclusive beauty treatments with quality products",
      "Full-service salon for hair, nails, and makeup",
      "Advanced skincare with professional estheticians",
      "Beauty center offering personalized services",
      "High-end salon with celebrity stylists",
      "Complete beauty experience in a luxury setting"
    ],
    images: [
      "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1607779097040-a6c415d710dc?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800&h=600&fit=crop"
    ],
    openHours: "09:00 - 20:00",
    tags: ["Hair Salon", "Manicure", "Makeup", "Skincare", "Facial", "Beauty", "Hair Color", "Styling"],
    priceRanges: ["$$$", "$$$$"],
    amenities: ["Complimentary drinks", "Product recommendations", "Expert consultation", "Bridal services", "Color specialists", "Online booking", "Premium products", "Hair treatments"]
  },
  "auto": {
    locations: ["Beşiktaş", "Kadıköy", "Şişli", "Mecidiyeköy", "Levent", "Ümraniye", "Maslak", "Beylikdüzü"],
    prefixes: ["Auto", "Premium", "Expert", "Elite", "Anadolu", "Master", "Professional", "Turbo"],
    suffixes: ["Service", "Garage", "Motors", "Auto Care", "Detailing", "Center", "Station", "Workshop"],
    descriptions: [
      "Premium auto service with certified technicians",
      "Professional car care with the latest technology",
      "Complete auto service for luxury vehicles",
      "Expert maintenance with genuine parts",
      "Comprehensive car detailing services",
      "High-end auto repair and maintenance",
      "Full-service garage with specialized equipment",
      "Trusted auto care with years of experience"
    ],
    images: [
      "https://images.unsplash.com/photo-1486546910464-ec8e45c4a137?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1652667934216-c6ebfb786cdd?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop"
    ],
    openHours: "08:00 - 19:00",
    tags: ["Car Service", "Maintenance", "Detailing", "Repair", "Oil Change", "Diagnostics", "Tire Service", "Inspection"],
    priceRanges: ["$$", "$$$"],
    amenities: ["Shuttle service", "Waiting lounge", "Free WiFi", "Appointment service", "Original parts", "Warranty service", "Car wash", "Online diagnosis"]
  }
};

// Ortak review metinlerini ve yazarları oluştur
const reviewsPool = [
  {
    userName: "Ayşe K.",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
    positiveComment: "Incredible experience! The staff was very attentive and the atmosphere was perfect.",
    negativeComment: "Decent place but a bit overpriced for what you get. Service could be better."
  },
  {
    userName: "Mehmet Y.",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    positiveComment: "One of the best in Istanbul. Will definitely be coming back again soon!",
    negativeComment: "Good, but I've had better experiences elsewhere in the city."
  },
  {
    userName: "Sarah J.",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
    positiveComment: "Absolutely loved it! Excellent quality and the service was top-notch.",
    negativeComment: "Expected more based on the reviews. It was okay but nothing spectacular."
  },
  {
    userName: "Ali B.",
    userAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    positiveComment: "A hidden gem in Istanbul! The quality and service exceeded my expectations.",
    negativeComment: "Nice place but they need to work on consistency. My previous visit was much better."
  },
  {
    userName: "Emma T.",
    userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face",
    positiveComment: "Perfect experience from start to finish. Can't recommend highly enough!",
    negativeComment: "It was fine, but I probably won't go out of my way to visit again."
  }
];

// Örnek mekanları ve otomatik oluşturulan mekanları içeren dizi
export const places: Place[] = [];

// Önce temel 4 mekanı ekle
baseLocations.forEach(base => {
  const categoryInfo = categorySeedContent[base.categoryId as keyof typeof categorySeedContent];
  const passId = CATEGORY_TO_PASS_MAP[base.categoryId as keyof typeof CATEGORY_TO_PASS_MAP];
  
  places.push({
    id: base.id,
    name: base.name,
    slug: base.id,
    description: `${base.description}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl nec ultricies ultricies, nisl nisl aliquam nisl, nec ultricies nisl nisl sit amet nisl.`,
    shortDescription: base.description,
    rating: base.rating,
    reviewCount: Math.floor(Math.random() * 1000) + 500,
    categoryId: base.categoryId,
    passIds: [passId],
    images: [
      {
        id: "1",
        url: base.image,
        alt: `${base.name} Main Image`,
        type: "main"
      },
      {
        id: "2",
        url: categoryInfo.images[1],
        alt: `${base.name} Gallery Image 1`,
        type: "gallery"
      },
      {
        id: "3",
        url: categoryInfo.images[2],
        alt: `${base.name} Gallery Image 2`,
        type: "gallery"
      }
    ],
    location: {
      address: `Sample St. No:123, ${base.location.district}/Istanbul`,
      district: base.location.district,
      coordinates: {
        lat: 41.0082 + (Math.random() - 0.5) * 0.1,
        lng: 28.9784 + (Math.random() - 0.5) * 0.1
      },
      nearbyLandmarks: ["Landmark 1", "Landmark 2", "Landmark 3"]
    },
    contact: {
      phone: "+90 212 XXX XXXX",
      email: `info@${base.id.toLowerCase()}.com`,
      website: `https://www.${base.id.toLowerCase()}.com`,
      social: {
        instagram: `@${base.id.toLowerCase()}`,
        facebook: base.id.toLowerCase()
      }
    },
    openHours: {
      "Monday": categoryInfo.openHours,
      "Tuesday": categoryInfo.openHours,
      "Wednesday": categoryInfo.openHours,
      "Thursday": categoryInfo.openHours,
      "Friday": categoryInfo.openHours,
      "Saturday": categoryInfo.openHours,
      "Sunday": categoryInfo.openHours
    },
    amenities: categoryInfo.amenities.slice(0, 4),
    tags: categoryInfo.tags.slice(0, 4),
    priceRange: categoryInfo.priceRanges[Math.floor(Math.random() * categoryInfo.priceRanges.length)],
    menu: base.categoryId === "restaurant" || base.categoryId === "cafe" ? [
      {
        id: "1",
        name: "Signature Item",
        description: "Our most popular dish with special ingredients",
        price: "$20",
        category: "Special"
      },
      {
        id: "2",
        name: "Classic Option",
        description: "Traditional favorite with a modern twist",
        price: "$15",
        category: "Classic"
      }
    ] : undefined,
    reviews: [
      {
        id: "1",
        userName: reviewsPool[0].userName,
        userAvatar: reviewsPool[0].userAvatar,
        rating: 5,
        comment: reviewsPool[0].positiveComment,
        date: "2024-01-15"
      },
      {
        id: "2",
        userName: reviewsPool[1].userName,
        userAvatar: reviewsPool[1].userAvatar,
        rating: 4,
        comment: reviewsPool[1].positiveComment,
        date: "2023-12-20"
      }
    ],
    features: {
      wifi: true,
      parking: Math.random() > 0.5,
      creditCard: true,
      reservation: Math.random() > 0.5,
      delivery: Math.random() > 0.5,
      terrace: Math.random() > 0.5
    },
    businessInfo: {
      established: `20${Math.floor(Math.random() * 20)}`,
      capacity: `${Math.floor(Math.random() * 100) + 20} people`,
      languages: ["Turkish", "English"]
    },
    offerDescription: "We offer a variety of services and experiences designed to make your visit memorable. Our friendly staff is committed to providing excellent customer service and ensuring that every aspect of your experience exceeds expectations.",
    needToKnowInfo: "Reservations are recommended but not required. We accept all major credit cards. Please check our website for any special events or closures."
  });
});

// Daha fazla yer oluştur - her kategori için birkaç yer
Object.keys(categorySeedContent).forEach((categoryId) => {
  const categoryInfo = categorySeedContent[categoryId as keyof typeof categorySeedContent];
  const passId = CATEGORY_TO_PASS_MAP[categoryId as keyof typeof CATEGORY_TO_PASS_MAP];
  
  // Her kategori için 5 mekan oluştur
  for (let i = 0; i < 5; i++) {
    const locationIndex = Math.floor(Math.random() * categoryInfo.locations.length);
    const location = categoryInfo.locations[locationIndex];
    
    const prefixIndex = Math.floor(Math.random() * categoryInfo.prefixes.length);
    const suffixIndex = Math.floor(Math.random() * categoryInfo.suffixes.length);
    const name = `${categoryInfo.prefixes[prefixIndex]} ${categoryInfo.suffixes[suffixIndex]}`;
    
    const descIndex = Math.floor(Math.random() * categoryInfo.descriptions.length);
    const description = categoryInfo.descriptions[descIndex];
    
    const imgIndex1 = Math.floor(Math.random() * categoryInfo.images.length);
    let imgIndex2 = Math.floor(Math.random() * categoryInfo.images.length);
    while (imgIndex2 === imgIndex1) {
      imgIndex2 = Math.floor(Math.random() * categoryInfo.images.length);
    }
    
    const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${location.toLowerCase()}`;
    const id = `${slug}-${Math.floor(Math.random() * 1000)}`;
    
    const rating = (4 + Math.random()).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 500) + 100;
    
    // Rastgele tag seç
    const tagCount = Math.floor(Math.random() * 3) + 2;
    const shuffledTags = [...categoryInfo.tags].sort(() => 0.5 - Math.random());
    const tags = shuffledTags.slice(0, tagCount);
    
    // Rastgele amenities seç
    const amenityCount = Math.floor(Math.random() * 4) + 2;
    const shuffledAmenities = [...categoryInfo.amenities].sort(() => 0.5 - Math.random());
    const amenities = shuffledAmenities.slice(0, amenityCount);
    
    // Reviewlar oluştur
    const reviewCount2 = Math.floor(Math.random() * 2) + 1; // 1 veya 2 review
    const shuffledReviews = [...reviewsPool].sort(() => 0.5 - Math.random());
    const reviews = shuffledReviews.slice(0, reviewCount2).map((review, index) => ({
      id: index.toString(),
      userName: review.userName,
      userAvatar: review.userAvatar,
      rating: Math.random() > 0.7 ? 4 : 5, // %70 ihtimalle 5 yıldız, %30 ihtimalle 4 yıldız
      comment: Math.random() > 0.8 ? review.negativeComment : review.positiveComment, // %20 ihtimalle negatif yorum
      date: `2024-0${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 28) + 1}`
    }));
    
    places.push({
      id,
      name,
      slug,
      description: `${description}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl vel ultricies ultricies, nisl nisl aliquam massa, eget tincidunt nunc nisi vel arcu. Integer vel mauris eget urna placerat tincidunt ac sit amet risus.`,
      shortDescription: description,
      rating: parseFloat(rating),
      reviewCount,
      categoryId,
      passIds: [passId],
      images: [
        {
          id: "1",
          url: categoryInfo.images[imgIndex1],
          alt: `${name} Main Image`,
          type: "main"
        },
        {
          id: "2",
          url: categoryInfo.images[imgIndex2],
          alt: `${name} Gallery Image`,
          type: "gallery"
        }
      ],
      location: {
        address: `Random St. No:${Math.floor(Math.random() * 100) + 1}, ${location}/Istanbul`,
        district: location,
        coordinates: {
          lat: 41.0082 + (Math.random() - 0.5) * 0.1,
          lng: 28.9784 + (Math.random() - 0.5) * 0.1
        },
        nearbyLandmarks: []
      },
      contact: {
        phone: `+90 212 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`
      },
      openHours: {
        "Monday": categoryInfo.openHours,
        "Tuesday": categoryInfo.openHours,
        "Wednesday": categoryInfo.openHours,
        "Thursday": categoryInfo.openHours,
        "Friday": categoryInfo.openHours,
        "Saturday": categoryInfo.openHours,
        "Sunday": categoryInfo.openHours
      },
      amenities,
      tags,
      priceRange: categoryInfo.priceRanges[Math.floor(Math.random() * categoryInfo.priceRanges.length)],
      reviews,
      features: {
        wifi: Math.random() > 0.3,
        parking: Math.random() > 0.5,
        creditCard: Math.random() > 0.2,
        reservation: Math.random() > 0.5,
        delivery: Math.random() > 0.7,
        terrace: Math.random() > 0.6
      },
      businessInfo: {
        established: `20${Math.floor(Math.random() * 20)}`,
        languages: ["Turkish", "English"]
      },
      offerDescription: "We offer a variety of services and experiences designed to make your visit memorable. Our friendly staff is committed to providing excellent customer service.",
      needToKnowInfo: "Reservations are recommended but not required. We accept all major credit cards."
    });
  }
});

// Kategori bazlı yer sayılarını dengelemek için: Bazı yerleri birden fazla pass'e ekle
places.forEach(place => {
  // Bazı mekanları sfPlus pass'ine ekle (sfPlus tüm mekanları içerebilir)
  if (Math.random() > 0.7 && !place.passIds.includes("sfPlus")) {
    place.passIds.push("sfPlus");
  }
  
  // Bazı restaurant/cafe yerlerini shopping pass'ine ekle
  if ((place.categoryId === "restaurant" || place.categoryId === "cafe") && Math.random() > 0.8 && !place.passIds.includes("shopping")) {
    place.passIds.push("shopping");
  }
  
  // Bazı shopping/beauty yerlerini food pass'ine ekle
  if ((place.categoryId === "shopping" || place.categoryId === "beauty") && Math.random() > 0.8 && !place.passIds.includes("food")) {
    place.passIds.push("food");
  }
});

// Helper fonksiyonlar

// Pass'e göre yerleri filtrele
export function getPlacesByPassId(passId: string): Place[] {
  return places.filter(place => place.passIds.includes(passId));
}

// Kategoriye göre yerleri filtrele
export function getPlacesByCategoryId(categoryId: string): Place[] {
  if (categoryId === "all") return places;
  return places.filter(place => place.categoryId === categoryId);
}

// Hem pass hem de kategoriye göre yerleri filtrele
export function getPlacesByPassAndCategory(passId: string, categoryId: string): Place[] {
  if (passId === "all" && categoryId === "all") return places;
  if (passId === "all") return getPlacesByCategoryId(categoryId);
  if (categoryId === "all") return getPlacesByPassId(passId);
  
  return places.filter(place => 
    place.passIds.includes(passId) && place.categoryId === categoryId
  );
}

// Bağımlılığı kaldırmak için popular places fonksiyonu yerine yeni bir fonksiyon
export function getPopularPlaces(limit: number = 8): Place[] {
  // Yüksek puanlı yerleri al ve karıştır
  return [...places]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit * 2) // Daha fazla seçenek için
    .sort(() => 0.5 - Math.random()) // Karıştır
    .slice(0, limit); // Sınırla
}