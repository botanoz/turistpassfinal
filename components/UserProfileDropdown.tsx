"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User as UserIcon,
  Ticket,
  Heart,
  MessageSquare,
  LogOut,
  ChevronDown,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

interface NavbarUser {
  displayName: string;
  email: string;
  initials: string;
  subtitle?: string;
  avatarUrl?: string | null;
  type: "customer" | "business";
}

interface UserProfileDropdownProps {
  user: NavbarUser;
  onLogout: () => void;
}

export default function UserProfileDropdown({
  user,
  onLogout,
}: UserProfileDropdownProps) {
  const menuItems =
    user.type === "business"
      ? [
          {
            href: "/business/dashboard",
            label: "Business Dashboard",
            icon: LayoutDashboard,
          },
          {
            href: "/business/profile",
            label: "Business Profile",
            icon: UserIcon,
          },
        ]
      : [
          { href: "/profile", label: "My Profile", icon: UserIcon },
          { href: "/my-passes", label: "My Passes", icon: Ticket },
          { href: "/favorites", label: "Favorites", icon: Heart },
          { href: "/messages", label: "Messages", icon: MessageSquare },
          { href: "/savings", label: "My Savings", icon: Wallet },
        ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium">{user.displayName}</span>
          {user.subtitle && (
            <span className="text-xs text-muted-foreground">{user.subtitle}</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {menuItems.map((item) => (
          <DropdownMenuItem asChild key={item.href}>
            <Link href={item.href} className="cursor-pointer">
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onLogout}
          className="text-red-600 focus:text-red-600 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
