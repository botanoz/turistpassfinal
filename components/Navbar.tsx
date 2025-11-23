"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Globe, ChevronDown, Home, Map, Ticket, HelpCircle, CalendarDays, Phone, LogIn, UserPlus, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import UserProfileDropdown from "./UserProfileDropdown";



type NavbarUser = {
  displayName: string;
  email: string;
  initials: string;
  subtitle?: string;
  type: "customer" | "business";
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const [currentUser, setCurrentUser] = useState<NavbarUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    let isActive = true;

    const buildInitials = (value: string) => {
      return value
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("") || "TP";
    };

    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (isActive) setCurrentUser(null);
        return;
      }

      const accountType = (session.user.user_metadata?.account_type as "customer" | "business" | undefined) ?? "customer";

      try {
        if (accountType === "business") {
          const response = await fetch("/api/business/account");
          if (!response.ok) throw new Error("Business account not found");
          const result = await response.json();
          const account = result.account;

          if (isActive) {
            setCurrentUser({
              displayName: account?.business_name || session.user.email || "Business Partner",
              email: session.user.email || account?.contact_email,
              initials: buildInitials(account?.business_name || session.user.email || "Business"),
              subtitle: account?.status === "pending" ? "Pending approval" : "Business Partner",
              type: "business",
            });
          }
        } else {
          const response = await fetch("/api/customer/profile");
          if (!response.ok) throw new Error("Profile not found");
          const result = await response.json();
          const profile = result.profile;

          if (isActive) {
            const name = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || session.user.email || "Customer";
            setCurrentUser({
              displayName: name,
              email: profile?.email || session.user.email || "",
              initials: buildInitials(name || profile?.email || "Customer"),
              subtitle: typeof profile?.stats?.totalSavings === "number"
                ? `$${Number(profile.stats.totalSavings).toFixed(2)} saved`
                : undefined,
              type: "customer",
            });
          }
        }
      } catch (error) {
        console.error("Navbar user fetch error:", error);
        if (isActive) setCurrentUser(null);
      }
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const isHomePage = pathname === "/";

  const getMenuItems = () => {
    return [
      { 
        href: "/", 
        label: "Welcome", 
        icon: Home
      },
      { 
        href: isHomePage ? "#passes-section" : "/#passes-section", 
        label: "S&F Passes", 
        icon: Ticket
      },
      { 
        href: "/places", 
        label: "Shop & Dine Locations", 
        icon: Map
      },
      { 
        href: isHomePage ? "#how" : "/how-it-works", 
        label: "How It Works", 
        icon: HelpCircle
      },
      { 
        href: "/plan-your-visit", 
        label: "Plan Your Visit", 
        icon: CalendarDays
      },
      { 
        href: isHomePage ? "/contact" : "/contact", 
        label: "Contact", 
        icon: Phone
      },
    ];
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push("/");
    router.push("/");
  };

  const menuItems = getMenuItems();

  const languages = [
    { code: "tr", label: "Türkçe" },
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl text-primary">
            TuristPass
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Right Side */}
        <div className="hidden lg:flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mr-2"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span>EN</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((lang) => (
                <DropdownMenuItem key={lang.code}>
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {currentUser ? (
            <UserProfileDropdown
              user={currentUser}
              onLogout={handleLogout}
            />
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground gap-2">
                  <LogIn className="h-4 w-4" />
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="text-left text-primary">TuristPass</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <div className="border-t my-4" />

              {/* Mobile Auth Buttons */}
              {currentUser ? (
                <div className="px-4 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {currentUser.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{currentUser.displayName}</p>
                      {currentUser.subtitle && (
                        <p className="text-xs text-muted-foreground">{currentUser.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 px-4">
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button className="w-full" variant="outline">
                      <LogIn className="h-4 w-4 mr-2" />
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
              
              <div className="border-t my-4" />
              
              {/* Mobile Settings */}
              <div className="px-4 space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full gap-2"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light Theme" : "Dark Theme"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Language</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {languages.map((lang) => (
                      <DropdownMenuItem key={lang.code}>
                        {lang.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
