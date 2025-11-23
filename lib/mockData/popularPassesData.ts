// @/lib/mockData/popularPassesData.js

import { Ticket, Clock, MapPin, Camera, Sparkles, Utensils, ShoppingBag, Award, Tag, Gift, ShieldCheck } from "lucide-react";

// Pass Seçim Ekranı için gerekli ekstra veriler
export const passSelectionData = {
  food: {
    title: "Istanbul Food Pass",
    subtitle: "Pick a pass duration and enjoy the best culinary experiences in Istanbul",
    featuredAttractions: [
      {
        id: 1,
        name: "Traditional Turkish Breakfast Experience",
        image: "https://picsum.photos/id/292/400/300"
      },
      {
        id: 2,
        name: "Grand Bazaar Food Tour",
        image: "https://picsum.photos/id/429/400/300"
      },
      {
        id: 3,
        name: "Baklava Making Workshop",
        image: "https://picsum.photos/id/431/400/300"
      }
    ],
    passOptions: [
      { days: 1, adultPrice: 99, childPrice: 69 },
      { days: 3, adultPrice: 189, childPrice: 129 },
      { days: 7, adultPrice: 259, childPrice: 179 }
    ],
    discount: {
      percentage: 10,
      amount: 10
    }
  },
  shopping: {
    title: "Istanbul Shopping Pass",
    subtitle: "Pick a pass duration and get exclusive discounts at Istanbul's best shops",
    featuredAttractions: [
      {
        id: 1,
        name: "Grand Bazaar VIP Shopping",
        image: "https://picsum.photos/id/425/400/300"
      },
      {
        id: 2,
        name: "İstinye Park Premium Experience",
        image: "https://picsum.photos/id/416/400/300"
      },
      {
        id: 3,
        name: "Handcraft Souvenir Workshop",
        image: "https://picsum.photos/id/442/400/300"
      }
    ],
    passOptions: [
      { days: 1, adultPrice: 99, childPrice: 69 },
      { days: 3, adultPrice: 189, childPrice: 129 },
      { days: 7, adultPrice: 259, childPrice: 179 }
    ],
    discount: {
      percentage: 10,
      amount: 10
    }
  },
  sfPlus: {
    title: "Istanbul S&F Pass Plus",
    subtitle: "Pick a pass duration and visit as many attractions as you wish",
    featuredAttractions: [
      {
        id: 1,
        name: "VIP Food & Shopping Tour",
        image: "https://picsum.photos/id/431/400/300"
      },
      {
        id: 2,
        name: "Bosphorus Shopping Cruise",
        image: "https://picsum.photos/id/425/400/300"
      },
      {
        id: 3,
        name: "Luxury Brand Experience",
        image: "https://picsum.photos/id/456/400/300"
      }
    ],
    passOptions: [
      { days: 1, adultPrice: 149, childPrice: 99 },
      { days: 3, adultPrice: 249, childPrice: 169 },
      { days: 5, adultPrice: 329, childPrice: 229 },
      { days: 7, adultPrice: 399, childPrice: 279 }
    ],
    discount: {
      percentage: 15,
      amount: 22
    }
  }
};

// Mevcut veri yapısı - eski yerlerde uyumluluk için korundu
export const passes = [
  {
    id: "food",
    title: "Food Pass",
    description: "Experience the best culinary delights of Istanbul",
    price: 99,
    wasPrice: 200,
    validDays: 1,
    personType: "Adult",
    color: "from-orange-500/20 to-red-500/20",
    popular: false,
    accessCount: 12,
    images: [
      "https://picsum.photos/id/292/200/100", // Food image
      "https://picsum.photos/id/429/200/100", // Restaurant image
      "https://picsum.photos/id/431/200/100"  // Dessert image
    ],
    features: [
      { 
        icon: Utensils, 
        text: "Access to 12 premium restaurants" 
      },
      { 
        icon: Tag, 
        text: "20% discount at selected cafes" 
      },
      { 
        icon: Clock, 
        text: "Valid for 1 day (24 hours) from first use" 
      },
      { 
        icon: MapPin, 
        text: "Includes food tour in local bazaars" 
      },
      { 
        icon: ShieldCheck, 
        text: "Free cancellation within 30 days" 
      }
    ]
  },
  {
    id: "sfPlus",
    title: "S&F Pass Plus",
    description: "All-inclusive Shopping & Food experience with premium benefits",
    price: 149,
    wasPrice: 400,
    validDays: 1,
    personType: "Adult",
    color: "from-purple-500/20 to-pink-500/20",
    popular: true,
    accessCount: 47,
    extraExperiences: 3,
    images: [
      "https://picsum.photos/id/431/200/100", // Food image
      "https://picsum.photos/id/425/200/100", // Shopping image
      "https://picsum.photos/id/428/200/100", // Cafe image
      "https://picsum.photos/id/456/200/100"  // Gift image
    ],
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
        text: "Valid for 1 day (24 hours) from first use" 
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
    additionalInfo: "The S&F Pass Plus combines all benefits from both Food and Shopping passes, plus 3 premium experiences including a personal shopping assistant and exclusive food tasting events."
  },
  {
    id: "shopping",
    title: "Shopping Pass",
    description: "The ultimate shopping experience with exclusive discounts",
    price: 99,
    wasPrice: 200,
    validDays: 1,
    personType: "Adult",
    color: "from-blue-500/20 to-cyan-500/20",
    popular: false,
    accessCount: 35,
    images: [
      "https://picsum.photos/id/425/200/100", // Mall image
      "https://picsum.photos/id/416/200/100", // Shopping bags image
      "https://picsum.photos/id/442/200/100"  // Store image
    ],
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
        text: "Valid for 1 day (24 hours) from first use" 
      },
      { 
        icon: MapPin, 
        text: "Includes Grand Bazaar shopping guide" 
      },
      { 
        icon: ShieldCheck, 
        text: "Free cancellation within 30 days" 
      }
    ]
  }
];

// Decorative elements for the background
export const decorativeElements = [
  { left: "5%", top: "10%", width: "20rem", height: "20rem", delay: "0s" },
  { left: "25%", top: "30%", width: "25rem", height: "25rem", delay: "2s" },
  { left: "60%", top: "15%", width: "30rem", height: "30rem", delay: "4s" },
  { left: "80%", top: "40%", width: "15rem", height: "15rem", delay: "1s" },
  { left: "40%", top: "70%", width: "20rem", height: "20rem", delay: "3s" },
  { left: "70%", top: "60%", width: "25rem", height: "25rem", delay: "5s" }
];