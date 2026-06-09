"use client";

// app/admin/_components/admin-nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Logo from "../Logo";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users",     label: "Users",     icon: Users },
  { href: "/admin/billing",   label: "Billing",   icon: CreditCard },
  { href: "/admin/usage",     label: "Usage",     icon: BarChart2 },
  { href: "/admin/settings",  label: "Settings",  icon: Settings },
];

interface AdminNavProps {
  pathname: string;
  initials: string;
  displayName: string;
  email: string;
}

export default function AdminNav({
  initials,
  displayName,
  email,
}: AdminNavProps) {
  // Use client-side pathname for accurate active state
  const pathname = usePathname();

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0 shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal py-2">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings" className="cursor-pointer">
            <Settings className="mr-2 h-3.5 w-3.5" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/handler/sign-out"
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        <Separator orientation="vertical" className="h-5 mx-1" />
        <nav className="flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Button
                key={href}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-sm font-normal px-3",
                  isActive && "font-medium"
                )}
                asChild
              >
                <Link href={href}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>

      {/* ── Mobile nav ──────────────────────────────────────────── */}
      <div className="flex md:hidden items-center gap-2 ml-auto">
        <UserMenu />

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="px-4 py-4 border-b">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <Logo />
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  Admin
                </Badge>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col gap-1 p-3">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Button
                    key={href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start gap-3 h-9 px-3 text-sm font-normal w-full",
                      isActive && "font-medium"
                    )}
                    asChild
                  >
                    <Link href={href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </Button>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
              <div className="flex items-center gap-3 px-2 py-1.5 mb-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="justify-start gap-3 h-9 px-3 text-sm w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                asChild
              >
                <Link href="/handler/sign-out">
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}