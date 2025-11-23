export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  email: string;
  category: string;
  status: "active" | "pending" | "suspended" | "rejected";

  contactPerson: {
    name: string;
    email: string;
    phone: string;
    position: string;
  };

  location: {
    address: string;
    district: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  imageUrl?: string | null;
  galleryImages?: string[];

  businessDetails: {
    taxNumber?: string;
    registrationNumber?: string;
    established?: string;
    description: string;
    website?: string;
  };

  passPartnerships: Array<{
    passId: string;
    passName: string;
    discountPercent: number;
    joinedDate: string;
  }>;

  statistics: {
    totalScans: number;
    thisMonthScans: number;
    lastMonthScans: number;
    totalRevenue: number;
    averageRating: number;
    reviewCount: number;
  };

  documents?: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }>;

  activityLog: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    timestamp: string;
  }>;

  applicationDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  rejectionReason?: string;

  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessApplication {
  id: string;
  businessName: string;
  category: string;
  contactPerson: {
    name: string;
    email: string;
    phone: string;
    position: string;
  };
  location: {
    address: string;
    district: string;
    city: string;
  };
  businessDetails: {
    taxNumber?: string;
    registrationNumber?: string;
    description: string;
    website?: string;
  };
  requestedPasses: string[];
  proposedDiscount: number;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
  }>;
  status: "pending" | "reviewing" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface BusinessNotification {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  sentBy: string;
  sentAt: string;
  read: boolean;
}

export interface BusinessActivity {
  id: string;
  businessId: string;
  businessName: string;
  action: string;
  description: string;
  category: "login" | "scan" | "profile_update" | "support" | "system";
  timestamp: string;
  metadata?: Record<string, any>;
}
