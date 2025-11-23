export interface BusinessPlace {
  id: string;
  name: string;
  slug: string;
  email: string;
  password?: string;
  categoryId: string;
  description: string;
  shortDescription: string;

  images: {
    main: string;
    gallery: string[];
    logo?: string;
  };

  location: {
    address: string;
    district: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  contact: {
    phone: string;
    email: string;
    website?: string;
    social?: {
      instagram?: string;
      facebook?: string;
    };
  };

  openHours: {
    monday: { open: string; close: string; closed?: boolean };
    tuesday: { open: string; close: string; closed?: boolean };
    wednesday: { open: string; close: string; closed?: boolean };
    thursday: { open: string; close: string; closed?: boolean };
    friday: { open: string; close: string; closed?: boolean };
    saturday: { open: string; close: string; closed?: boolean };
    sunday: { open: string; close: string; closed?: boolean };
  };

  passIds: string[];
  offerDescription: string;
  discount: string;

  amenities: string[];
  tags: string[];
  priceRange: string;

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
    languages?: string[];
  };

  totalScans: number;
  thisMonthScans: number;
  rating: number;
  reviewCount: number;

  joinedDate: string;
  status: "active" | "pending" | "suspended";
}

export interface CustomerScan {
  id: string;
  customerName: string;
  passType: string;
  scanDate: string;
  scanTime: string;
  method: "qr" | "pin";
  discount: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  responses?: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  message: string;
  sender: "business" | "admin";
  sentAt: string;
}
