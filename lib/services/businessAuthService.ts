import { BusinessPlace } from "../types/business";

const MOCK_BUSINESSES: BusinessPlace[] = [
  {
    id: "mikla-restaurant",
    name: "Mikla Restaurant",
    slug: "mikla-restaurant",
    email: "info@mikla.com",
    password: "Business123!",
    categoryId: "restaurant",
    description: "Mikla is a contemporary restaurant that reinterprets traditional Turkish and Scandinavian flavors with modern techniques. Located on the top floor of The Marmara Pera Hotel, it offers stunning Bosphorus views alongside its innovative cuisine.",
    shortDescription: "Modern Turkish cuisine with Scandinavian influences and breathtaking Bosphorus views",

    images: {
      main: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1200&h=800&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop"
      ],
      logo: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=200&h=200&fit=crop"
    },

    location: {
      address: "Meşrutiyet Caddesi No: 15, The Marmara Pera, 18th Floor",
      district: "Beyoğlu",
      coordinates: { lat: 41.0335, lng: 28.9785 }
    },

    contact: {
      phone: "+90 212 293 5656",
      email: "info@mikla.com",
      website: "https://www.miklarestaurant.com",
      social: {
        instagram: "@miklarestaurant",
        facebook: "/miklarestaurant"
      }
    },

    openHours: {
      monday: { open: "18:00", close: "23:00", closed: false },
      tuesday: { open: "18:00", close: "23:00", closed: false },
      wednesday: { open: "18:00", close: "23:00", closed: false },
      thursday: { open: "18:00", close: "23:00", closed: false },
      friday: { open: "18:00", close: "23:00", closed: false },
      saturday: { open: "18:00", close: "23:00", closed: false },
      sunday: { open: "18:00", close: "23:00", closed: true }
    },

    passIds: ["food", "sfPlus"],
    offerDescription: "Get 20% discount on your total bill with TuristPass. Reservation required.",
    discount: "20% off total bill",

    amenities: ["Outdoor seating", "View terrace", "Reservation required", "Wine selection"],
    tags: ["Fine Dining", "Turkish Cuisine", "Fusion", "Bosphorus View"],
    priceRange: "$$$$",

    features: {
      wifi: true,
      parking: true,
      creditCard: true,
      reservation: true,
      delivery: false,
      terrace: true
    },

    businessInfo: {
      established: "2005",
      capacity: "60 persons",
      languages: ["Turkish", "English", "German"]
    },

    totalScans: 1250,
    thisMonthScans: 145,
    rating: 4.8,
    reviewCount: 342,

    joinedDate: "2023-06-15",
    status: "active"
  }
];

const STORAGE_KEY = "turistpass_business_user";
const SESSION_KEY = "turistpass_business_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000;

interface SessionData {
  businessId: string;
  expiresAt: number;
}

class BusinessAuthService {
  private currentBusiness: BusinessPlace | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initSession();
      this.setupSessionMonitoring();
    }
  }

  private initSession(): void {
    const sessionData = sessionStorage.getItem(SESSION_KEY);

    if (!sessionData) {
      this.clearSession();
      return;
    }

    try {
      const session: SessionData = JSON.parse(sessionData);

      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentBusiness = JSON.parse(stored);
      }
    } catch (e) {
      this.clearSession();
    }
  }

  private setupSessionMonitoring(): void {
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        this.currentBusiness = null;
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
  }

  private createSession(businessId: string): void {
    const session: SessionData = {
      businessId,
      expiresAt: Date.now() + SESSION_DURATION
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private clearSession(): void {
    this.currentBusiness = null;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  async login(email: string, password: string): Promise<{ success: boolean; business?: BusinessPlace; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const business = MOCK_BUSINESSES.find(b => b.email === email && b.password === password);

    if (business) {
      if (business.status === "suspended") {
        return { success: false, error: "Your account has been suspended. Please contact support." };
      }

      if (business.status === "pending") {
        return { success: false, error: "Your application is still under review. We'll notify you once approved." };
      }

      const businessWithoutPassword = { ...business };
      delete businessWithoutPassword.password;

      this.currentBusiness = businessWithoutPassword;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(businessWithoutPassword));
        this.createSession(business.id);
      }

      return { success: true, business: businessWithoutPassword };
    }

    return { success: false, error: "Invalid email or password" };
  }

  async register(businessData: Partial<BusinessPlace>): Promise<{ success: boolean; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const existingBusiness = MOCK_BUSINESSES.find(b => b.email === businessData.email);
    if (existingBusiness) {
      return { success: false, error: "Email already registered" };
    }

    return { success: true };
  }

    hydrateFromRemote(account: { id: string; business_name?: string; contact_email?: string; contact_phone?: string; status?: string; metadata?: Record<string, any> }) {
    const template = JSON.parse(JSON.stringify(MOCK_BUSINESSES[0])) as BusinessPlace;
    const remoteBusinessId =
      (account?.metadata?.business_id &&
        typeof account.metadata.business_id === "string" &&
        account.metadata.business_id) ||
      (typeof account?.metadata?.business_id === "number"
        ? String(account.metadata.business_id)
        : undefined) ||
      account?.id ||
      template.id;
    const remoteSlug =
      (account?.metadata?.slug && String(account.metadata.slug)) ||
      (account?.business_name || "business")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

    const hydrated: BusinessPlace = {
      ...template,
      id: remoteBusinessId,
      name: account.business_name || template.name,
      slug: remoteSlug || template.slug,
      email: account.contact_email || template.email,
      contact: {
        ...template.contact,
        phone: account.contact_phone || template.contact.phone,
        email: account.contact_email || template.contact.email,
      },
      status: (account.status === "approved" ? "active" : account.status || "pending") as BusinessPlace["status"],
      joinedDate: new Date().toISOString().split("T")[0],
    };

    this.currentBusiness = hydrated;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
      this.createSession(hydrated.id);
    }
  }

  logout(): void {
    if (typeof window !== "undefined") {
      this.clearSession();
    }
  }

  getCurrentBusiness(): BusinessPlace | null {
    return this.currentBusiness;
  }

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (!sessionData) return false;

    try {
      const session: SessionData = JSON.parse(sessionData);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return false;
      }
    } catch (e) {
      this.clearSession();
      return false;
    }

    return this.currentBusiness !== null;
  }

  async updateBusiness(updates: Partial<BusinessPlace>): Promise<{ success: boolean; business?: BusinessPlace; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!this.currentBusiness) {
      return { success: false, error: "Not authenticated" };
    }

    this.currentBusiness = { ...this.currentBusiness, ...updates };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentBusiness));
    }

    return { success: true, business: this.currentBusiness };
  }
}

export const businessAuthService = new BusinessAuthService();
