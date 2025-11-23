import { Admin } from '@/lib/types/admin';

const ADMIN_STORAGE_KEY = 'turistpass_admin';
const SESSION_TIMEOUT = 30 * 60 * 1000;

class AdminAuthService {
  private sessionTimer: NodeJS.Timeout | null = null;

  login(email: string, password: string): { success: boolean; admin?: Admin; error?: string } {
    if (email === 'admin@turistpass.com' && password === 'Admin123!@#') {
      const admin: Admin = {
        id: 'admin-1',
        email: 'admin@turistpass.com',
        name: 'Super Admin',
        role: 'super_admin',
        createdAt: '2024-01-01',
        lastLogin: new Date().toISOString(),
        permissions: {
          customers: true,
          businesses: true,
          passes: true,
          orders: true,
          support: true,
          settings: true,
          analytics: true
        }
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
        this.startSessionTimer();
      }

      return { success: true, admin };
    }

    return { success: false, error: 'Invalid credentials' };
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      this.clearSessionTimer();
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;

    const adminData = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!adminData) return false;

    try {
      const admin = JSON.parse(adminData) as Admin;
      return !!admin.id;
    } catch {
      return false;
    }
  }

  getCurrentAdmin(): Admin | null {
    if (typeof window === 'undefined') return null;

    const adminData = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!adminData) return null;

    try {
      return JSON.parse(adminData) as Admin;
    } catch {
      return null;
    }
  }

  hasPermission(permission: keyof Admin['permissions']): boolean {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;
    return admin.permissions[permission];
  }

  private startSessionTimer(): void {
    this.clearSessionTimer();

    if (typeof window !== 'undefined') {
      this.sessionTimer = setTimeout(() => {
        this.logout();
        window.location.href = '/admin/login?session=expired';
      }, SESSION_TIMEOUT);
    }
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  refreshSession(): void {
    if (this.isAuthenticated()) {
      this.startSessionTimer();
    }
  }
}

export const adminAuthService = new AdminAuthService();
