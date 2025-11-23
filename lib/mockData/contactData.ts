import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageCircle,
  Globe,
  Users,
  Star,
  CheckCircle2,
  Zap
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface ContactMethod {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  link?: string;
  availability: string;
  color: string;
}

export interface OfficeInfo {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  whatsapp: string;
  hours: {
    weekdays: string;
    weekend: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  image: string;
}

export interface SupportStat {
  number: string;
  label: string;
  icon: LucideIcon;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ContactPageData {
  hero: {
    title: string;
    subtitle: string;
    badge: string;
  };
  contactMethods: ContactMethod[];
  office: OfficeInfo;
  supportStats: SupportStat[];
  quickFaqs: FAQ[];
}

export const contactData: ContactPageData = {
  hero: {
    title: "Contact Us",
    subtitle: "We're here to help you make the most of your Istanbul experience. Our friendly support team is ready to assist you.",
    badge: "Quick Response Guaranteed"
  },

  contactMethods: [
    {
      id: "whatsapp",
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Quick responses for all your questions",
      value: "+90 555 123 4567",
      link: "https://wa.me/905551234567",
      availability: "24/7 Available",
      color: "from-green-500/20 to-green-600/20"
    },
    {
      id: "phone",
      icon: Phone,
      title: "Phone",
      description: "Call us directly",
      value: "+90 212 345 6789",
      link: "tel:+902123456789",
      availability: "9 AM - 10 PM",
      color: "from-blue-500/20 to-blue-600/20"
    },
    {
      id: "email",
      icon: Mail,
      title: "Email",
      description: "Send us your questions",
      value: "support@turistpass.com",
      link: "mailto:support@turistpass.com",
      availability: "Response within 4 hours",
      color: "from-purple-500/20 to-purple-600/20"
    }
  ],

  office: {
    name: "TuristPass Istanbul Office",
    address: "Sultanahmet Square, Eminönü",
    city: "Istanbul",
    country: "Turkey",
    phone: "+90 212 345 6789",
    email: "support@turistpass.com",
    whatsapp: "+90 555 123 4567",
    hours: {
      weekdays: "Monday - Friday: 9:00 AM - 6:00 PM",
      weekend: "Saturday - Sunday: 10:00 AM - 4:00 PM"
    },
    coordinates: {
      lat: 41.0082,
      lng: 28.9784
    },
    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&h=600&fit=crop"
  },

  supportStats: [
    { number: "< 4 hrs", label: "Response Time", icon: Zap },
    { number: "98%", label: "Satisfaction Rate", icon: Star },
    { number: "50K+", label: "Happy Customers", icon: Users },
    { number: "24/7", label: "WhatsApp Support", icon: MessageCircle }
  ],

  quickFaqs: [
    {
      question: "How can I contact you urgently?",
      answer: "For urgent matters, use our WhatsApp (+90 555 123 4567) which is available 24/7. You can also call us during business hours at +90 212 345 6789."
    },
    {
      question: "What if I lose my digital pass?",
      answer: "Don't worry! Your pass is saved digitally. Contact us immediately and we'll help you recover it from your email or account."
    },
    {
      question: "Do you speak English?",
      answer: "Yes! We provide support in English, Turkish, and several other languages. Our team will assist you in your preferred language."
    },
    {
      question: "What are your office hours?",
      answer: "Our office is open Monday-Friday 9 AM-6 PM, and weekends 10 AM-4 PM. However, WhatsApp support is available 24/7."
    },
    {
      question: "Can I visit your office?",
      answer: "Absolutely! We're located in Sultanahmet Square, Eminönü, Istanbul. You can visit us during office hours for in-person assistance."
    }
  ]
};