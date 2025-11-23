// lib/mockData/footerData.ts
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  MapPin, 
  Mail, 
  Phone 
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface FooterLink {
  label: string;
  href: string;
}

export interface SocialLink extends FooterLink {
  icon: LucideIcon;
}

export interface FooterLinks {
  company: FooterLink[];
  product: FooterLink[];
  support: FooterLink[];
  social: SocialLink[];
  contactInfo: {
    location: {
      icon: LucideIcon;
      text: string;
    };
    email: {
      icon: LucideIcon;
      text: string;
    };
    phone: {
      icon: LucideIcon;
      text: string;
    };
  };
  brandInfo: {
    name: string;
    description: string;
  };
  newsletterInfo: {
    title: string;
    description: string;
  };
}

export const footerData: FooterLinks = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Press", href: "/press" }
  ],
  product: [
    { label: "Passes", href: "#passes" },
    { label: "Venues", href: "#places" },
    { label: "How It Works", href: "#how" },
    { label: "Special Events", href: "/events" }
  ],
  support: [
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "/contact" },
    { label: "Business Login", href: "/business/login" },
    { label: "Partner Application", href: "/business/apply" }
  ],
  social: [
    { label: "Instagram", href: "#", icon: Instagram },
    { label: "Facebook", href: "#", icon: Facebook },
    { label: "Twitter", href: "#", icon: Twitter }
  ],
  contactInfo: {
    location: {
      icon: MapPin,
      text: "Istanbul, Turkey"
    },
    email: {
      icon: Mail,
      text: "info@turistpass.com"
    },
    phone: {
      icon: Phone,
      text: "+90 212 555 0000"
    }
  },
  brandInfo: {
    name: "TuristPass",
    description: "The smartest and most economical way to explore the city. Unlimited access to all the beauty of the city with a single pass."
  },
  newsletterInfo: {
    title: "Free Istanbul travel plans in your inbox!",
    description: "Subscribe now for expert itineraries and insider tips."
  }
};