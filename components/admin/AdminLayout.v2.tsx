"use client";

import { useState, useEffect, useCallback, useMemo, memo, useTransition, startTransition } from "react";
import { supabaseAdminAuth } from "@/lib/services/supabaseAdminAuth";
import type { Admin } from "@/lib/types/admin";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  MapPin,
  ShoppingCart,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Shield,
  Bell,
  BarChart3,
  Check,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Megaphone,
} from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  createdAt: string;
  read: boolean;
};

// ============================================
// CRITICAL OPTIMIZATION: Ultra-lightweight NavLink
// ============================================
const NavLink = memo(({
  href,
  icon: Icon,
  name,
  isActive,
  onClick
}: {
  href: string;
  icon: any;
  name: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  // Use CSS for hover effects instead of JS
  const className = isActive
    ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors bg-primary text-primary-foreground'
    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      // Prevent default navigation and use router.push for faster transitions
      prefetch={true}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{name}</span>
    </Link>
  );
}, (prev, next) => {
  // Custom comparison - only re-render if these change
  return prev.isActive === next.isActive && prev.href === next.href;
});

NavLink.displayName = 'NavLink';

// ============================================
// CRITICAL: Simplified Notification Item (no complex styling calculations)
// ============================================
const NotificationItem = memo(({
  notification,
  onMarkAsRead
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) => {
  const iconMap = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info
  };

  const colorMap = {
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
    info: "text-blue-500"
  };

  const Icon = iconMap[notification.type];
  const iconColor = colorMap[notification.type];

  return (
    <div
      className={`px-4 py-3 hover:bg-accent cursor-pointer transition-colors ${
        !notification.read ? "bg-accent/50" : ""
      }`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-none truncate">
              {notification.title}
            </p>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Only re-render if notification read status or id changes
  return prev.notification.id === next.notification.id &&
         prev.notification.read === next.notification.read;
});

NotificationItem.displayName = 'NotificationItem';

// ============================================
// CRITICAL: Separate component for user info to prevent parent re-renders
// ============================================
const UserInfo = memo(({ admin, onLogout }: { admin: Admin; onLogout: () => void }) => {
  const initials = useMemo(() =>
    admin.name.split(' ').map(n => n[0]).join('').toUpperCase(),
    [admin.name]
  );

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{admin.name}</p>
          <p className="text-xs text-muted-foreground truncate">{admin.role.replace('_', ' ')}</p>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={onLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
});

UserInfo.displayName = 'UserInfo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // ============================================
  // CRITICAL: Throttled notification refresh
  // ============================================
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        headers: { 'Cache-Control': 'max-age=10' }
      });

      if (!res.ok) return;

      const json = await res.json();
      if (!json.success) return;

      // Use startTransition for non-urgent state updates
      startTransition(() => {
        setNotifications(
          json.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            createdAt: n.created_at,
            read: n.read,
          }))
        );
        setUnreadCount(json.unreadCount || 0);
      });
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  // ============================================
  // CRITICAL: Aggressive auth caching
  // ============================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try cache first (10 min validity instead of 5)
        const cachedAdmin = sessionStorage.getItem('admin_profile');
        const cacheTimestamp = sessionStorage.getItem('admin_profile_timestamp');

        if (cachedAdmin && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < 10 * 60 * 1000) { // 10 minutes
            setAdmin(JSON.parse(cachedAdmin));
            setIsLoading(false);

            // Background verification (don't await)
            if (age > 5 * 60 * 1000) { // Only verify if > 5 min old
              supabaseAdminAuth.isAuthenticated().then(isAuth => {
                if (!isAuth) {
                  sessionStorage.removeItem('admin_profile');
                  sessionStorage.removeItem('admin_profile_timestamp');
                  window.location.href = "/admin/login";
                }
              });
            }
            return;
          }
        }

        // Full auth check
        const isAuth = await supabaseAdminAuth.isAuthenticated();
        if (!isAuth) {
          sessionStorage.removeItem('admin_profile');
          sessionStorage.removeItem('admin_profile_timestamp');
          window.location.href = "/admin/login";
          return;
        }

        const adminProfile = await supabaseAdminAuth.getCurrentAdmin();
        if (!adminProfile) {
          await supabaseAdminAuth.signOut();
          sessionStorage.removeItem('admin_profile');
          sessionStorage.removeItem('admin_profile_timestamp');
          window.location.href = "/admin/login";
          return;
        }

        sessionStorage.setItem('admin_profile', JSON.stringify(adminProfile));
        sessionStorage.setItem('admin_profile_timestamp', Date.now().toString());
        setAdmin(adminProfile);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth init error:', error);
        window.location.href = "/admin/login";
      }
    };

    initAuth();
  }, []);

  // ============================================
  // CRITICAL: Much longer polling + visibility optimization
  // ============================================
  useEffect(() => {
    if (!admin) return;

    refreshNotifications();

    // Increase to 120 seconds
    const interval = setInterval(refreshNotifications, 120000);

    let lastRefresh = Date.now();
    const handleVisibilityChange = () => {
      // Only refresh if tab was hidden for more than 60 seconds
      if (!document.hidden && Date.now() - lastRefresh > 60000) {
        refreshNotifications();
        lastRefresh = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [admin, refreshNotifications]);

  // ============================================
  // CRITICAL: No prefetch on mount - prefetch on hover instead
  // ============================================
  useEffect(() => {
    // Only prefetch current active route's neighbors
    const currentIndex = navigation.findIndex(item => pathname?.startsWith(item.href));
    if (currentIndex !== -1) {
      // Prefetch previous and next routes only
      if (currentIndex > 0) {
        router.prefetch(navigation[currentIndex - 1].href);
      }
      if (currentIndex < navigation.length - 1) {
        router.prefetch(navigation[currentIndex + 1].href);
      }
    }
  }, [pathname, router]);

  // ============================================
  // CRITICAL: Static navigation array (never changes)
  // ============================================
  const navigation = useMemo(() => [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: null },
    { name: "Customers", href: "/admin/customers", icon: Users, permission: "customers" as const },
    { name: "Businesses", href: "/admin/businesses", icon: Building2, permission: "businesses" as const },
    { name: "Passes", href: "/admin/passes", icon: CreditCard, permission: "passes" as const },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart, permission: "orders" as const },
    { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone, permission: "settings" as const },
    { name: "Messages", href: "/admin/messages", icon: MessageSquare, permission: "settings" as const },
    { name: "Support", href: "/admin/support", icon: Bell, permission: "support" as const },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: "analytics" as const },
    { name: "Settings", href: "/admin/settings", icon: Settings, permission: "settings" as const },
  ], []);

  const filteredNavigation = useMemo(() => {
    if (!admin) return [];
    return navigation.filter(item => {
      if (!item.permission) return true;
      if (admin.role === 'super_admin') return true;
      return admin.permissions[item.permission] === true;
    });
  }, [admin, navigation]);

  const handleLogout = useCallback(async () => {
    sessionStorage.clear();
    await supabaseAdminAuth.signOut();
    window.location.href = "/admin/login";
  }, []);

  const handleMarkAsRead = useCallback((notificationId: string) => {
    // Immediate optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Fire and forget API call
    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {/* Deleteent fail */});
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllAsRead: true }),
    }).catch(() => {/* Deleteent fail */});
  }, []);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // ============================================
  // CRITICAL: Render navigation links directly (no wrapper component)
  // ============================================
  const navLinks = useMemo(() =>
    filteredNavigation.map((item) => {
      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
      return (
        <NavLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          name={item.name}
          isActive={isActive}
          onClick={closeMobile}
        />
      );
    }),
    [filteredNavigation, pathname, closeMobile]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar - Use will-change for smooth transitions */}
      <div className="hidden md:flex md:w-64 md:flex-col border-r will-change-transform">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-bold text-lg">TuristPass</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        {/* CRITICAL: Use CSS containment for better performance */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto" style={{ contain: 'layout style paint' }}>
          {navLinks}
        </nav>

        <UserInfo admin={admin} onLogout={handleLogout} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center gap-2 border-b px-6">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="font-bold text-lg">TuristPass</h1>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <nav className="flex-1 space-y-1 p-4">
                {navLinks}
              </nav>
              <UserInfo admin={admin} onLogout={handleLogout} />
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h2 className="text-lg font-semibold md:hidden">Admin Panel</h2>
          </div>

          {/* Notifications - Only render when needed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-8 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ contain: 'layout style' }}>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild className="hidden md:flex">
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {admin.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{admin.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{admin.name}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* CRITICAL: Add CSS containment and will-change */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{
            contain: 'layout style paint',
            willChange: 'scroll-position'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
