import { 
  ShoppingBag, 
  MapPin, 
  QrCode, 
  Repeat, 
  Gift, 
  Coffee,
  Map,
  Store,
  CreditCard,
  Smartphone,
  ReceiptText,
  Timer,
  Heart,
  Compass,
  Download,
  Zap,
  Shield,
  Sparkles,
  Users,
  Star
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface HowItWorksStep {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  details: string[];
  emoji?: string;
  // Ayrı sayfa için ek alanlar
  subtitle?: string;
  videoSrc?: string;
  videoPoster?: string;
  features?: string[];
  tips?: string[];
  stats?: {
    [key: string]: string;
  };
}

export interface BonusBenefit {
  icon: LucideIcon;
  text: string;
  color: string;
}

export interface DecorativeElement {
  left: string;
  top: string;
  width: string;
  height: string;
  delay: string;
}

// Ayrı sayfa için ek interface'ler
export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface QuickStat {
  number: string;
  label: string;
  icon: LucideIcon;
}

export interface HowItWorksContent {
  title: string;
  subtitle: string;
  steps: HowItWorksStep[];
  bonusBenefits: BonusBenefit[];
  decorativeElements: DecorativeElement[];
  // Ayrı sayfa için ek alanlar
  detailedPage?: {
    heroTitle: string;
    heroSubtitle: string;
    overviewVideo: {
      src: string;
      poster: string;
      title: string;
    };
    quickStats: QuickStat[];
    benefits: Benefit[];
    cta: {
      title: string;
      subtitle: string;
      primaryButton: string;
      secondaryButton: string;
    };
  };
}

export const howItWorksData: HowItWorksContent = {
  title: "How Does Shopping & Food Pass Work?",
  subtitle: "Get exclusive discounts at 40+ handpicked locations across Istanbul with our easy-to-use digital pass",
  steps: [
    {
      icon: ShoppingBag,
      title: "Purchase Your Pass",
      description: "Buy your Shopping & Food Pass online from the official website in just a few clicks.",
      color: "from-blue-500/20 to-purple-500/20",
      details: [
        "Choose from different pass options: Shopping Pass, Food Pass or Combo Pass",
        "Secure payment via credit card or PayPal",
        "Receive your digital pass instantly via email with a QR/barcode",
        "Select from 1-day, 3-day, or 7-day validity periods"
      ],
      // Ayrı sayfa için ek alanlar
      subtitle: "Select the pass that suits you best",
      videoSrc: "/videos/step1-select.mp4",
      videoPoster: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=450&fit=crop",
      features: [
        "Food Pass: Discounts at 50+ restaurants",
        "Shopping Pass: Special offers at 30+ stores", 
        "S&F Plus: Benefits of both combined",
        "1, 3 or 7-day options available"
      ],
      tips: [
        "Choose the number of days according to your travel duration",
        "Select pass type based on your interests",
        "Don't forget child passes for group discounts"
      ],
      stats: {
        avgSavings: "$850",
        userSatisfaction: "98%",
        avgPlacesVisited: "12"
      }
    },
    {
      icon: MapPin,
      title: "Explore & Visit Partner Locations",
      description: "Browse through 40+ participating locations across Istanbul's most vibrant neighborhoods.",
      color: "from-green-500/20 to-teal-500/20",
      details: [
        "40+ carefully selected partner locations throughout the city",
        "Local restaurants & cafés serving authentic Turkish cuisine ",
        "Boutiques & shopping stores offering unique products ",
        "Traditional markets & souvenir shops with handcrafted items ",
        "Use the interactive map on the website to find places near you"
      ],
      // Ayrı sayfa için ek alanlar
      subtitle: "Browse and discover amazing locations",
      videoSrc: "/videos/step2-explore.mp4", 
      videoPoster: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=450&fit=crop",
      features: [
        "Interactive map with all partner locations",
        "Filter venues by category and district", 
        "Real-time availability and opening hours",
        "User reviews and ratings for each venue"
      ],
      tips: [
        "Check out venues on the map beforehand",
        "Go early to avoid rush hours",
        "Share your experiences on social media"
      ],
      stats: {
        partnerLocations: "70+",
        avgRating: "4.8/5",
        dailyVisitors: "500+"
      }
    },
    {
      icon: QrCode,
      title: "Redeem Your Discounts",
      description: "Simply show your digital pass at checkout to instantly save on your purchases and meals.",
      color: "from-amber-500/20 to-orange-500/20",
      details: [
        "At the checkout, show your digital pass (QR/barcode) to the cashier",
        "Your discount (up to 15% off) is instantly applied!",
        "No need for cash, coupons, or negotiations—just scan and save!",
        "Works seamlessly at all partner locations"
      ],
      // Ayrı sayfa için ek alanlar
      subtitle: "Show your pass and save instantly",
      videoSrc: "/videos/step3-redeem.mp4",
      videoPoster: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=450&fit=crop",
      features: [
        "Instant QR code scanning",
        "Automatic discount calculation",
        "Digital receipt generation",
        "Real-time savings tracking"
      ],
      tips: [
        "Ensure your phone screen brightness is high",
        "Have your QR code ready before reaching checkout",
        "Ask staff if you need help with scanning"
      ],
      stats: {
        avgDiscount: "18%",
        scanSuccess: "99.5%",
        avgSavingPerVisit: "$25"
      }
    },
    {
      icon: Repeat,
      title: "Enjoy & Use Unlimited Times",
      description: "Maximize your savings by using your pass multiple times throughout its validity period.",
      color: "from-red-500/20 to-pink-500/20",
      details: [
        "Use your pass as many times as you like during its validity period",
        "The more you shop and eat, the more you save!",
        "Track your pass usage in your online account",
        "No daily limits on usage or savings"
      ],
      // Ayrı sayfa için ek alanlar
      subtitle: "Maximize your savings with unlimited use",
      videoSrc: "/videos/step4-savings.mp4",
      videoPoster: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop",
      features: [
        "Unlimited venue visits during validity period",
        "Cumulative savings tracking",
        "Bonus rewards for frequent users",
        "VIP access to special events"
      ],
      tips: [
        "Plan your itinerary to maximize savings",
        "Visit during off-peak hours for better experience",
        "Check for special bonus events in the app"
      ],
      stats: {
        maxSavings: "$2,400",
        avgDailyUse: "6 venues",
        repeatVisitors: "85%"
      }
    }
  ],
  bonusBenefits: [
    {
      icon: CreditCard,
      text: "No hidden fees—pay once, save everywhere",
      color: "from-blue-600/10 to-blue-400/10"
    },
    {
      icon: Heart,
      text: "Discover authentic, hand-picked local places",
      color: "from-red-600/10 to-red-400/10"
    },
    {
      icon: Smartphone,
      text: "Enjoy a seamless contactless experience",
      color: "from-green-600/10 to-green-400/10"
    },
    {
      icon: Compass,
      text: "Access to exclusive local recommendations",
      color: "from-amber-600/10 to-amber-400/10"
    },
    {
      icon: Timer,
      text: "Valid for 1, 3, or 7 days from first use",
      color: "from-purple-600/10 to-purple-400/10"
    },
    {
      icon: ReceiptText,
      text: "Digital receipts for all your transactions",
      color: "from-teal-600/10 to-teal-400/10"
    }
  ],
  decorativeElements: [
    { left: "5%", top: "10%", width: "300px", height: "300px", delay: "0s" },
    { left: "70%", top: "5%", width: "250px", height: "250px", delay: "2s" },
    { left: "20%", top: "60%", width: "350px", height: "350px", delay: "4s" },
    { left: "80%", top: "70%", width: "200px", height: "200px", delay: "6s" },
    { left: "40%", top: "30%", width: "150px", height: "150px", delay: "3s" },
    { left: "60%", top: "40%", width: "180px", height: "180px", delay: "5s" }
  ],
  // Ayrı sayfa için ek veriler
  detailedPage: {
    heroTitle: "How Does It Work?",
    heroSubtitle: "Discover Istanbul with TuristPass in just 4 steps! Learn every detail with our comprehensive guide and start saving today.",
    
    overviewVideo: {
      src: "/videos/overview.mp4",
      poster: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=675&fit=crop",
      title: "How TuristPass Works?"
    },

    quickStats: [
      { number: "70+", label: "Partner Locations", icon: MapPin },
      { number: "50K+", label: "Happy Customers", icon: Users },
      { number: "$2.4M", label: "Total Savings", icon: Gift },
      { number: "4.9", label: "Customer Rating", icon: Star }
    ],

    benefits: [
      {
        icon: Zap,
        title: "Instant Activation",
        description: "Your pass becomes active the moment you purchase it"
      },
      {
        icon: Shield, 
        title: "Secure Payment",
        description: "Safe transactions with 256-bit SSL encryption"
      },
      {
        icon: Heart,
        title: "Customer Satisfaction", 
        description: "24/7 English customer support"
      },
      {
        icon: Sparkles,
        title: "Premium Experience",
        description: "Special deals with selected venues"
      }
    ],

    cta: {
      title: "Ready to Start Your Istanbul Adventure?",
      subtitle: "Our 24/7 active support team is ready to help you",
      primaryButton: "Buy Pass",
      secondaryButton: "Live Support"
    }
  }
};