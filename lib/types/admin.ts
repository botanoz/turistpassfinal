export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  avatar?: string;
  createdAt: string;
  lastLogin: string;
  permissions: {
    customers: boolean;
    businesses: boolean;
    passes: boolean;
    orders: boolean;
    support: boolean;
    settings: boolean;
    analytics: boolean;
  };
}

export interface AdminStats {
  totalCustomers: number;
  activeCustomers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  totalPasses: number;
  activePasses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingSupport: number;
  pendingBusinessApps: number;
}
