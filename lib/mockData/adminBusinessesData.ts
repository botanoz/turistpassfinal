import { AdminBusiness, BusinessApplication, BusinessNotification, BusinessActivity } from "@/lib/types/adminBusiness";

export const adminBusinessesData: AdminBusiness[] = [
  {
    id: "biz-1",
    name: "Mikla Restaurant",
    slug: "mikla-restaurant",
    email: "info@mikla.com.tr",
    category: "Restaurant",
    status: "active",
    contactPerson: {
      name: "Mehmet Gürs",
      email: "mehmet@mikla.com.tr",
      phone: "+90 212 293 5656",
      position: "Owner & Chef"
    },
    location: {
      address: "The Marmara Pera, Meşrutiyet Cd. No:15",
      district: "Beyoğlu",
      city: "Istanbul",
      coordinates: { lat: 41.0332, lng: 28.9784 }
    },
    businessDetails: {
      taxNumber: "1234567890",
      registrationNumber: "REG-2015-001",
      established: "2005",
      description: "Fine dining restaurant with panoramic views of Istanbul",
      website: "https://www.miklarestaurant.com"
    },
    passPartnerships: [
      {
        passId: "pass-2",
        passName: "Food & Beverage Pass",
        discountPercent: 20,
        joinedDate: "2024-02-01T10:00:00Z"
      },
      {
        passId: "pass-3",
        passName: "Premium All-Access Pass",
        discountPercent: 25,
        joinedDate: "2024-03-10T11:00:00Z"
      }
    ],
    statistics: {
      totalScans: 1247,
      thisMonthScans: 89,
      lastMonthScans: 102,
      totalRevenue: 156800,
      averageRating: 4.8,
      reviewCount: 342
    },
    documents: [
      {
        id: "doc-1",
        type: "Business License",
        name: "business-license.pdf",
        url: "/documents/business-license.pdf",
        uploadedAt: "2024-01-15T10:00:00Z"
      }
    ],
    activityLog: [
      {
        id: "act-1",
        action: "login",
        description: "Business logged in to dashboard",
        performedBy: "System",
        timestamp: "2024-10-15T09:30:00Z"
      },
      {
        id: "act-2",
        action: "scan_processed",
        description: "Processed 3 customer scans",
        performedBy: "System",
        timestamp: "2024-10-15T12:45:00Z"
      }
    ],
    approvedDate: "2024-01-20T10:00:00Z",
    approvedBy: "admin@turistpass.com",
    lastLogin: "2024-10-15T09:30:00Z",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-10-15T09:30:00Z"
  },
  {
    id: "biz-2",
    name: "Hagia Sophia",
    slug: "hagia-sophia",
    email: "info@ayasofya.com",
    category: "Historical",
    status: "active",
    contactPerson: {
      name: "Ali Yılmaz",
      email: "ali@ayasofya.com",
      phone: "+90 212 522 1750",
      position: "Operations Manager"
    },
    location: {
      address: "Sultan Ahmet, Ayasofya Meydanı No:1",
      district: "Fatih",
      city: "Istanbul",
      coordinates: { lat: 41.0086, lng: 28.9802 }
    },
    businessDetails: {
      taxNumber: "9876543210",
      registrationNumber: "REG-2020-050",
      established: "537",
      description: "Historic Byzantine cathedral, Ottoman mosque, now museum",
      website: "https://www.ayasofya.gov.tr"
    },
    passPartnerships: [
      {
        passId: "pass-1",
        passName: "Istanbul Welcome Pass",
        discountPercent: 15,
        joinedDate: "2024-01-15T10:00:00Z"
      },
      {
        passId: "pass-3",
        passName: "Premium All-Access Pass",
        discountPercent: 20,
        joinedDate: "2024-03-10T11:00:00Z"
      }
    ],
    statistics: {
      totalScans: 5423,
      thisMonthScans: 412,
      lastMonthScans: 389,
      totalRevenue: 542300,
      averageRating: 4.9,
      reviewCount: 1872
    },
    activityLog: [
      {
        id: "act-3",
        action: "login",
        description: "Business logged in to dashboard",
        performedBy: "System",
        timestamp: "2024-10-15T08:15:00Z"
      }
    ],
    approvedDate: "2024-01-15T10:00:00Z",
    approvedBy: "admin@turistpass.com",
    lastLogin: "2024-10-15T08:15:00Z",
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-10-15T08:15:00Z"
  },
  {
    id: "biz-3",
    name: "Grand Bazaar Shop Association",
    slug: "grand-bazaar",
    email: "info@grandbazaar.com.tr",
    category: "Shopping",
    status: "active",
    contactPerson: {
      name: "Fatma Özkan",
      email: "fatma@grandbazaar.com.tr",
      phone: "+90 212 519 1248",
      position: "Association President"
    },
    location: {
      address: "Beyazıt, Kalpakçılar Cd.",
      district: "Fatih",
      city: "Istanbul",
      coordinates: { lat: 41.0108, lng: 28.9680 }
    },
    businessDetails: {
      taxNumber: "5555666777",
      registrationNumber: "REG-2021-100",
      established: "1461",
      description: "Historic covered market with 4,000+ shops",
      website: "https://www.grandbazaaristanbul.org"
    },
    passPartnerships: [
      {
        passId: "pass-1",
        passName: "Istanbul Welcome Pass",
        discountPercent: 10,
        joinedDate: "2024-01-15T10:00:00Z"
      },
      {
        passId: "pass-3",
        passName: "Premium All-Access Pass",
        discountPercent: 15,
        joinedDate: "2024-03-10T11:00:00Z"
      }
    ],
    statistics: {
      totalScans: 3891,
      thisMonthScans: 298,
      lastMonthScans: 276,
      totalRevenue: 311280,
      averageRating: 4.6,
      reviewCount: 892
    },
    activityLog: [
      {
        id: "act-4",
        action: "profile_updated",
        description: "Updated business hours",
        performedBy: "fatma@grandbazaar.com.tr",
        timestamp: "2024-10-14T15:20:00Z"
      }
    ],
    approvedDate: "2024-01-15T10:00:00Z",
    approvedBy: "admin@turistpass.com",
    lastLogin: "2024-10-14T15:00:00Z",
    createdAt: "2024-01-12T10:00:00Z",
    updatedAt: "2024-10-14T15:20:00Z"
  },
  {
    id: "biz-4",
    name: "Kronotrop Coffee",
    slug: "kronotrop",
    email: "info@kronotrop.com.tr",
    category: "Cafe",
    status: "suspended",
    contactPerson: {
      name: "Can Kaya",
      email: "can@kronotrop.com.tr",
      phone: "+90 212 245 6789",
      position: "General Manager"
    },
    location: {
      address: "Bomonti, Silahşör Cd. No:42",
      district: "Şişli",
      city: "Istanbul",
      coordinates: { lat: 41.0535, lng: 28.9849 }
    },
    businessDetails: {
      taxNumber: "7777888999",
      registrationNumber: "REG-2022-075",
      established: "2014",
      description: "Specialty coffee roastery and cafe",
      website: "https://www.kronotrop.com.tr"
    },
    passPartnerships: [
      {
        passId: "pass-2",
        passName: "Food & Beverage Pass",
        discountPercent: 15,
        joinedDate: "2024-02-01T10:00:00Z"
      }
    ],
    statistics: {
      totalScans: 456,
      thisMonthScans: 12,
      lastMonthScans: 45,
      totalRevenue: 18240,
      averageRating: 4.5,
      reviewCount: 123
    },
    activityLog: [
      {
        id: "act-5",
        action: "suspended",
        description: "Account suspended due to policy violation",
        performedBy: "admin@turistpass.com",
        timestamp: "2024-10-10T14:00:00Z"
      }
    ],
    approvedDate: "2024-02-05T10:00:00Z",
    approvedBy: "admin@turistpass.com",
    lastLogin: "2024-10-09T16:30:00Z",
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-10-10T14:00:00Z"
  }
];

export const businessApplicationsData: BusinessApplication[] = [
  {
    id: "app-1",
    businessName: "Nusr-Et Steakhouse",
    category: "Restaurant",
    contactPerson: {
      name: "Nusret Gökçe",
      email: "nusret@nusr-et.com",
      phone: "+90 212 358 5888",
      position: "Owner"
    },
    location: {
      address: "Etiler, Nispetiye Cd. No:87",
      district: "Beşiktaş",
      city: "Istanbul"
    },
    businessDetails: {
      taxNumber: "1111222333",
      registrationNumber: "REG-2024-120",
      description: "World-famous steakhouse chain",
      website: "https://www.nusr-et.com"
    },
    requestedPasses: ["pass-2", "pass-3"],
    proposedDiscount: 15,
    documents: [
      {
        id: "doc-app-1",
        type: "Business License",
        name: "nusr-et-license.pdf",
        url: "/documents/nusr-et-license.pdf"
      },
      {
        id: "doc-app-2",
        type: "Tax Certificate",
        name: "nusr-et-tax.pdf",
        url: "/documents/nusr-et-tax.pdf"
      }
    ],
    status: "pending",
    submittedAt: "2024-10-14T10:30:00Z"
  },
  {
    id: "app-2",
    businessName: "Istanbul Modern",
    category: "Museum",
    contactPerson: {
      name: "Levent Çalıkoğlu",
      email: "levent@istanbulmodern.org",
      phone: "+90 212 334 7300",
      position: "Director"
    },
    location: {
      address: "Asmalı Mescit, Meşrutiyet Cd. No:99",
      district: "Beyoğlu",
      city: "Istanbul"
    },
    businessDetails: {
      taxNumber: "4444555666",
      registrationNumber: "REG-2024-121",
      description: "Contemporary art museum",
      website: "https://www.istanbulmodern.org"
    },
    requestedPasses: ["pass-1", "pass-3"],
    proposedDiscount: 20,
    documents: [
      {
        id: "doc-app-3",
        type: "Museum Registration",
        name: "istanbul-modern-reg.pdf",
        url: "/documents/istanbul-modern-reg.pdf"
      }
    ],
    status: "reviewing",
    submittedAt: "2024-10-13T14:20:00Z"
  },
  {
    id: "app-3",
    businessName: "Çiya Sofrası",
    category: "Restaurant",
    contactPerson: {
      name: "Musa Dağdeviren",
      email: "musa@ciya.com.tr",
      phone: "+90 216 330 3190",
      position: "Chef & Owner"
    },
    location: {
      address: "Caferağa, Güneşlibahçe Sk. No:43",
      district: "Kadıköy",
      city: "Istanbul"
    },
    businessDetails: {
      taxNumber: "9999000111",
      description: "Traditional Anatolian cuisine restaurant",
      website: "https://www.ciya.com.tr"
    },
    requestedPasses: ["pass-2"],
    proposedDiscount: 15,
    documents: [
      {
        id: "doc-app-4",
        type: "Business License",
        name: "ciya-license.pdf",
        url: "/documents/ciya-license.pdf"
      }
    ],
    status: "pending",
    submittedAt: "2024-10-15T09:15:00Z"
  }
];

export const businessNotificationsData: BusinessNotification[] = [
  {
    id: "notif-1",
    businessId: "biz-1",
    businessName: "Mikla Restaurant",
    title: "Monthly Report Available",
    message: "Your monthly performance report for September is now available.",
    type: "info",
    sentBy: "admin@turistpass.com",
    sentAt: "2024-10-01T09:00:00Z",
    read: true
  },
  {
    id: "notif-2",
    businessId: "biz-2",
    businessName: "Hagia Sophia",
    title: "New Pass Partnership",
    message: "You've been added to Premium All-Access Pass. Customers can now use this pass at your venue.",
    type: "success",
    sentBy: "admin@turistpass.com",
    sentAt: "2024-03-10T11:00:00Z",
    read: true
  },
  {
    id: "notif-3",
    businessId: "biz-4",
    businessName: "Kronotrop Coffee",
    title: "Account Suspended",
    message: "Your account has been temporarily suspended due to policy violations. Please contact support.",
    type: "warning",
    sentBy: "admin@turistpass.com",
    sentAt: "2024-10-10T14:00:00Z",
    read: true
  }
];

export const businessActivitiesData: BusinessActivity[] = [
  {
    id: "activity-1",
    businessId: "biz-1",
    businessName: "Mikla Restaurant",
    action: "Login",
    description: "User logged in to business dashboard",
    category: "login",
    timestamp: "2024-10-15T09:30:00Z"
  },
  {
    id: "activity-2",
    businessId: "biz-1",
    businessName: "Mikla Restaurant",
    action: "Customer Scan",
    description: "Processed 3 customer scans",
    category: "scan",
    timestamp: "2024-10-15T12:45:00Z",
    metadata: { scanCount: 3 }
  },
  {
    id: "activity-3",
    businessId: "biz-2",
    businessName: "Hagia Sophia",
    action: "Login",
    description: "User logged in to business dashboard",
    category: "login",
    timestamp: "2024-10-15T08:15:00Z"
  },
  {
    id: "activity-4",
    businessId: "biz-3",
    businessName: "Grand Bazaar Shop Association",
    action: "Profile Update",
    description: "Updated business hours",
    category: "profile_update",
    timestamp: "2024-10-14T15:20:00Z"
  },
  {
    id: "activity-5",
    businessId: "biz-4",
    businessName: "Kronotrop Coffee",
    action: "Account Suspended",
    description: "Account suspended by admin",
    category: "system",
    timestamp: "2024-10-10T14:00:00Z",
    metadata: { reason: "Policy violation" }
  }
];

export function getBusinessById(id: string): AdminBusiness | undefined {
  return adminBusinessesData.find(biz => biz.id === id);
}

export function getBusinessByEmail(email: string): AdminBusiness | undefined {
  return adminBusinessesData.find(biz => biz.email === email);
}

export function getActiveBusinesses(): AdminBusiness[] {
  return adminBusinessesData.filter(biz => biz.status === "active");
}

export function getPendingBusinesses(): AdminBusiness[] {
  return adminBusinessesData.filter(biz => biz.status === "pending");
}

export function getSuspendedBusinesses(): AdminBusiness[] {
  return adminBusinessesData.filter(biz => biz.status === "suspended");
}

export function getBusinessApplicationById(id: string): BusinessApplication | undefined {
  return businessApplicationsData.find(app => app.id === id);
}

export function getPendingApplications(): BusinessApplication[] {
  return businessApplicationsData.filter(app => app.status === "pending");
}

export function getBusinessNotifications(businessId: string): BusinessNotification[] {
  return businessNotificationsData.filter(notif => notif.businessId === businessId);
}

export function getBusinessActivities(businessId: string): BusinessActivity[] {
  return businessActivitiesData.filter(act => act.businessId === businessId);
}

export const adminBusinessesStats = {
  total: adminBusinessesData.length,
  active: adminBusinessesData.filter(b => b.status === "active").length,
  suspended: adminBusinessesData.filter(b => b.status === "suspended").length,
  pending: adminBusinessesData.filter(b => b.status === "pending").length,
  pendingApplications: businessApplicationsData.filter(a => a.status === "pending").length,
  totalScans: adminBusinessesData.reduce((sum, b) => sum + b.statistics.totalScans, 0),
  thisMonthScans: adminBusinessesData.reduce((sum, b) => sum + b.statistics.thisMonthScans, 0),
  totalRevenue: adminBusinessesData.reduce((sum, b) => sum + b.statistics.totalRevenue, 0),
};
