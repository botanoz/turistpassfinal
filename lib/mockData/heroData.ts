import { 
    ArrowRight, 
    Compass, 
    Star, 
    Clock, 
    MapPin 
  } from "lucide-react";
  import { LucideIcon } from "lucide-react";
  
  export interface HeroFeature {
    icon: LucideIcon;
    text: string;
  }
  
  export interface HeroCta {
    primary: {
      label: string;
      icon: typeof ArrowRight;
    };
    secondary: {
      label: string;
    };
  }
  
  export interface HeroContent {
    title: {
      main: string;
      highlight: string;
    };
    description: string;
    features: HeroFeature[];
    cta: HeroCta;
  }
  
  export const heroData: HeroContent = {
    title: {
      main: "The Smartest Way to ",
      highlight: "Discover Istanbul"
    },
    description: "Unlimited access to the city's most popular venues and exclusive advantages with a single digital pass",
    features: [
      { icon: Compass, text: "40+ Popular Venues" },
      { icon: Star, text: "Exclusive Benefits" },
      { icon: Clock, text: "Valid 24/7" },
      { icon: MapPin, text: "Easy Navigation" }
    ],
    cta: {
      primary: {
        label: "Buy Pass",
        icon: ArrowRight
      },
      secondary: {
        label: "Learn More"
      }
    }
  };