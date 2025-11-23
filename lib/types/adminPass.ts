export interface PassPricingOption {
  id: string;
  days: number;
  ageGroup: 'adult' | 'child' | 'student' | 'senior';
  basePrice: number;
  discountPercent?: number;
}

export interface PassUsageRule {
  usageType: 'once_per_venue' | 'unlimited' | 'limited_count';
  maxUsagePerVenue?: number;
  totalUsageLimit?: number;
}

export interface PassVenue {
  venueId: string;
  venueName: string;
  category: string;
  discountPercent: number;
  usageRule: PassUsageRule;
}

export interface AdminPass {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;

  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  popular: boolean;

  color: string;
  backgroundColor: string;
  bannerImage?: string;

  pricingOptions: PassPricingOption[];

  venues: PassVenue[];

  features: string[];

  homepageContent: {
    title: string;
    subtitle: string;
    highlights: string[];
  };

  detailsPage: {
    heroTitle: string;
    heroSubtitle: string;
    aboutContent: string;
    benefits: string[];
    included: string[];
    notIncluded: string[];
    termsAndConditions: string[];
  };

  validityDays: number[];

  cancellationPolicy: string;

  totalSold: number;
  revenue: number;

  createdAt: string;
  updatedAt: string;
}
