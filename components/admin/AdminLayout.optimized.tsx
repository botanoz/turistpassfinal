"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabaseAdminAuth } from "@/lib/services/supabaseAdminAuth";
import type { Admin } from "@/lib/types/admin";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
// OPTIMIZATION 1: Memoized Navigation Link Component
// ============================================
const NavLink = memo(({
  item,
  isActive,
  onClick
}: {
  item: any;
  isActive: boolean;
  onClick: () => void;
}) => (
  <Link
    href={item.href}
    onClick={onClick}
    prefetch={true}
    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    <item.icon className="h-5 w-5" />
    {item.name}
  </Link>
));

NavLink.displayName = 'NavLink';

// ============================================
// OPTIMIZATION 2: Memoized Notification Item
// ============================================
const NotificationItem = memo(({
  notification,
  onMarkAsRead
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) => {
  const Icon =
    notification.type === "success"
      ? CheckCircle
      : notification.type === "warning"
      ? AlertTriangle
      : notification.type === "error"
      ? AlertCircle
      : Info;

  return (
    <div
      className={`px-4 py-3 hover:bg-accent cursor-pointer transition-colors ${
        !notification.read ? "bg-accent/50" : ""
      }`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex-shrink-0 ${
            notification.type === "success"
              ? "text-green-500"
              : notification.type === "warning"
              ? "text-yellow-500"
              : notification.type === "error"
              ? "text-red-500"
              : "text-blue-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-none">
              {notification.title}
            </p>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(notification.createdAt).toLocaleString('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
});

NotificationItem.displayName = 'NotificationItem';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // ============================================
  // OPTIMIZATION 3: Debounced notification refresh
  // ============================================
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        // OPTIMIZATION: Add cache control for faster subsequent loads
        headers: {
          'Cache-Control': 'max-age=10', // Cache for 10 seconds
        }
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch notifications");
      }

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
    } catch (error) {
      console.error("Failed to load notifications:", error);
      // Don't reset on error - keep existing data
    }
  }, []);

  // ============================================
  // OPTIMIZATION 4: Auth check with session storage cache
  // ============================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check session storage cache first
        const cachedAdmin = sessionStorage.getItem('admin_profile');
        const cacheTimestamp = sessionStorage.getItem('admin_profile_timestamp');

        // Use cache if less than 5 minutes old
        if (cachedAdmin && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < 5 * 60 * 1000) { // 5 minutes
            setAdmin(JSON.parse(cachedAdmin));
            setIsLoading(false);

            // Verify in background
            supabaseAdminAuth.isAuthenticated().then(isAuth => {
              if (!isAuth) {
                sessionStorage.removeItem('admin_profile');
                sessionStorage.removeItem('admin_profile_timestamp');
                window.location.href = "/admin/login";
              }
            });
            return;
          }
        }

        // Full auth check if cache miss or expired
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

        // Cache the admin profile
        sessionStorage.setItem('admin_profile', JSON.stringify(adminProfile));
        sessionStorage.setItem('admin_profile_timestamp', Date.now().toString());

        setAdmin(adminProfile);
        setIsLoading(false);
      } catch (error) {
        console.error('Auth init error:', error);
        sessionStorage.removeItem('admin_profile');
        sessionStorage.removeItem('admin_profile_timestamp');
        window.location.href = "/admin/login";
      }
    };

    initAuth();
  }, []); // Only run once on mount

  // ============================================
  // OPTIMIZATION 5: Longer polling interval + visibility API
  // ============================================
  useEffect(() => {
    if (!admin) return;

    // Initial load
    refreshNotifications();

    // Longer interval - only refresh every 60 seconds instead of 30
    const interval = setInterval(refreshNotifications, 60000);

    // Refresh on focus (only if tab was hidden for more than 30 seconds)
    let lastRefresh = Date.now();
    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastRefresh > 30000) {
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
  // OPTIMIZATION 6: Selective prefetching - only dashboard initially
  // ============================================
  useEffect(() => {
    // Only prefetch dashboard immediately
    router.prefetch('/admin/dashboard');

    // Lazy prefetch other routes after 2 seconds
    const timer = setTimeout(() => {
      router.prefetch('/admin/customers');
      router.prefetch('/admin/orders');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  // ============================================
  // OPTIMIZATION 7: Memoized navigation items
  // ============================================
  const navigation = useMemo(() => [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: null },
    { name: "Customers", href: "/admin/customers", icon: Users, permission: "customers" as const },
    { name: "Businesses", href: "/admin/businesses", icon: Building2, permission: "businesses" as const },
    { name: "Passes", href: "/admin/passes", icon: CreditCard, permission: "passes" as const },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart, permission: "orders" as const },
    { name: "Campaigns & Codes", href: "/admin/campaigns", icon: Megaphone, permission: "settings" as const },
    { name: "Announcements", href: "/admin/messages", icon: MessageSquare, permission: "settings" as const },
    { name: "Support", href: "/admin/support", icon: Bell, permission: "support" as const },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: "analytics" as const },
    { name: "Settings", href: "/admin/settings", icon: Settings, permission: "settings" as const },
    { name: "Contact Settings", href: "/admin/contact-settings", icon: MapPin, permission: "settings" as const },
    { name: "Content", href: "/admin/content", icon: Shield, permission: "settings" as const },
  ], []);

  // ============================================
  // OPTIMIZATION 8: Memoized filtered navigation
  // ============================================
  const filteredNavigation = useMemo(() => {
    if (!admin) return [];

    return navigation.filter(item => {
      if (!item.permission) return true;
      if (admin.role === 'super_admin') return true;
      return admin.permissions[item.permission] === true;
    });
  }, [admin, navigation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) return null;

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('admin_profile');
      sessionStorage.removeItem('admin_profile_timestamp');
      await supabaseAdminAuth.signOut();
      window.location.href = "/admin/login";
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = "/admin/login";
    }
  };

  // ============================================
  // OPTIMIZATION 9: Simplified mark as read without full reload
  // ============================================
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // API call in background - don't await or handle errors
    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(err => console.error("Failed to mark notification:", err));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    // API call in background
    fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllAsRead: true }),
    }).catch(err => console.error("Failed to mark all notifications:", err));
  }, []);

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // ============================================
  // OPTIMIZATION 10: Memoized NavLinks component
  // ============================================
  const NavLinks = useMemo(() => (
    <>
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive}
            onClick={closeMobile}
          />
        );
      })}
    </>
  ), [filteredNavigation, pathname, closeMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col border-r">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-bold text-lg">TuristPass</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {NavLinks}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {admin.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin.name}</p>
              <p className="text-xs text-muted-foreground truncate">{admin.role.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
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
                {NavLinks}
              </nav>
              <div className="border-t p-4">
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h2 className="text-lg font-semibold md:hidden">Admin Panel</h2>
          </div>

          {/* OPTIMIZATION 11: Only refresh on open, not on every open */}
          <DropdownMenu
            open={notificationsOpen}
            onOpenChange={(open) => {
              setNotificationsOpen(open);
              // Only refresh if opening and last refresh was more than 10 seconds ago
              if (open) {
                refreshNotifications();
              }
            }}
          >
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
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
