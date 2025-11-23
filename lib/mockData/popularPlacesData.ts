// lib/mockData/popularPlacesData.ts

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface PlaceData {
  id: number;
  name: string;
  image: string;
  description: string;
  rating: string;
  location: string;
  openHours: string;
  categoryId: string;  // Kategori ID'si eklendi
  tags: string[];
}

export interface DecorationData {
  position: {
    top: string;
    left: string;
  };
  size: string;
}

export const categories: Category[] = [
  {
    id: "all",
    name: "All",
    icon: "https://picsum.photos/seed/all/100/100"
  },
  {
    id: "massage-spa",
    name: "Massage & Spa",
    icon: "https://picsum.photos/seed/spa/100/100"
  },
  {
    id: "breakfast",
    name: "Breakfast",
    icon: "https://picsum.photos/seed/breakfast/100/100"
  },
  {
    id: "beauty",
    name: "Beauty",
    icon: "https://picsum.photos/seed/beauty/100/100"
  },
  {
    id: "activity",
    name: "Activity",
    icon: "https://picsum.photos/seed/activity/100/100"
  },
  {
    id: "food",
    name: "Food",
    icon: "https://picsum.photos/seed/food/100/100"
  },
  {
    id: "auto-service",
    name: "Auto Service",
    icon: "https://picsum.photos/seed/auto/100/100"
  },
  {
    id: "adventure",
    name: "Adventure & Entertainment",
    icon: "https://picsum.photos/seed/adventure/100/100"
  }
];


export const places: PlaceData[] = [
  {
    id: 1,
    name: "Mikla Restaurant",
    image: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?q=80&w=800",
    description: "Unique flavors where modern Turkish and Scandinavian cuisines meet",
    rating: "4.8",
    location: "Beyoğlu",
    openHours: "18:00 - 23:00",
    categoryId: "food",
    tags: ["Fine Dining", "Terrace", "View"]
  },
  {
    id: 2,
    name: "Vakko - Nişantaşı",
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800",
    description: "Exclusive destination for luxury clothing and accessories",
    rating: "4.7",
    location: "Nişantaşı",
    openHours: "10:00 - 22:00",
    categoryId: "beauty",
    tags: ["Fashion", "Luxury", "Boutique"]
  },
  {
    id: 3,
    name: "Karaköy Güllüoğlu",
    image: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?q=80&w=800",
    description: "Istanbul's most famous baklava shop since 1949",
    rating: "4.7",
    location: "Karaköy",
    openHours: "07:00 - 00:00",
    categoryId: "breakfast",
    tags: ["Baklava", "Dessert", "Historic"]
  },
  {
    id: 4,
    name: "Beymen - İstinye Park",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800",
    description: "Meeting point of global luxury brands",
    rating: "4.8",
    location: "İstinye",
    openHours: "10:00 - 22:00",
    categoryId: "beauty",
    tags: ["Fashion", "Luxury", "Premium"]
  },
  {
    id: 5,
    name: "Sunset Grill & Bar",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800",
    description: "Select flavors from world cuisine with Bosphorus views",
    rating: "4.9",
    location: "Ulus",
    openHours: "18:00 - 02:00",
    categoryId: "food",
    tags: ["Fine Dining", "View", "Romantic"]
  },
  {
    id: 6,
    name: "Mandabatmaz",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=800",
    description: "The best Turkish coffee in Istanbul",
    rating: "4.7",
    location: "Beyoğlu",
    openHours: "07:00 - 23:00",
    categoryId: "breakfast",
    tags: ["Turkish Coffee", "Historic", "Authentic"]
  },
  {
    id: 7,
    name: "Rüya Spa",
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=800",
    description: "Luxury spa experience with traditional Turkish bath",
    rating: "4.9",
    location: "Beşiktaş",
    openHours: "10:00 - 22:00",
    categoryId: "massage-spa",
    tags: ["Massage", "Hammam", "Relaxation"]
  },
  {
    id: 8,
    name: "Istanbul Modern",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=800",
    description: "Contemporary art museum with exhibitions by Turkish artists",
    rating: "4.6",
    location: "Karaköy",
    openHours: "10:00 - 18:00",
    categoryId: "activity",
    tags: ["Art", "Museum", "Culture"]
  },
  {
    id: 9,
    name: "Ayia Spa",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800",
    description: "Wellness center with expert masseuses and natural products",
    rating: "4.8",
    location: "Nişantaşı",
    openHours: "09:00 - 21:00",
    categoryId: "massage-spa",
    tags: ["Massage", "Facial", "Wellness"]
  },
  {
    id: 10,
    name: "Çırağan Auto Service",
    image: "https://images.unsplash.com/photo-1486546910464-ec8e45c4a137?q=80&w=800",
    description: "Premium auto care service with expert technicians",
    rating: "4.7",
    location: "Beşiktaş",
    openHours: "08:00 - 19:00",
    categoryId: "auto-service",
    tags: ["Car Wash", "Maintenance", "Detailing"]
  },
  {
    id: 11,
    name: "Van Kahvaltı Evi",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800",
    description: "Authentic Turkish breakfast experience with regional specialties",
    rating: "4.8",
    location: "Cihangir",
    openHours: "07:00 - 15:00",
    categoryId: "breakfast",
    tags: ["Turkish Breakfast", "Authentic", "Cozy"]
  },
  {
    id: 12,
    name: "Paragliding Adventure",
    image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=800",
    description: "Experience the thrill of paragliding with breathtaking views",
    rating: "4.9",
    location: "Büyükada",
    openHours: "09:00 - 17:00",
    categoryId: "adventure",
    tags: ["Paragliding", "Extreme", "Outdoor"]
  },
  {
    id: 13,
    name: "Mehmet Oto Bakım",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=800",
    description: "Complete auto service with modern equipment and professional team",
    rating: "4.6",
    location: "Kadıköy",
    openHours: "08:00 - 20:00",
    categoryId: "auto-service",
    tags: ["Car Service", "Oil Change", "Repair"]
  },
  {
    id: 14,
    name: "Rumeli Beauty Center",
    image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=800",
    description: "Premium beauty treatments with the latest technologies",
    rating: "4.7",
    location: "Etiler",
    openHours: "10:00 - 20:00",
    categoryId: "beauty",
    tags: ["Cosmetics", "Skincare", "Makeup"]
  },
  {
    id: 15,
    name: "Bosphorus Tour",
    image: "https://images.unsplash.com/photo-1527838832700-5059252407fa?q=80&w=800",
    description: "Private boat tours along the iconic Bosphorus strait",
    rating: "4.9",
    location: "Eminönü",
    openHours: "10:00 - 19:00",
    categoryId: "activity",
    tags: ["Boat Tour", "Sightseeing", "Historical"]
  },
  {
    id: 16,
    name: "Bebek Badem Ezmesi",
    image: "https://images.unsplash.com/photo-1486546910464-ec8e45c4a137?q=80&w=800",
    description: "Famous for traditional Turkish almond paste sweets",
    rating: "4.7",
    location: "Bebek",
    openHours: "08:00 - 22:00",
    categoryId: "food",
    tags: ["Dessert", "Traditional", "Sweet"]
  }
];

export const decorations: DecorationData[] = [
  { position: { top: "30%", left: "10%" }, size: "240px" },
  { position: { top: "60%", left: "75%" }, size: "200px" },
  { position: { top: "20%", left: "60%" }, size: "180px" }
];