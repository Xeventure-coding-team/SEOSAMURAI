"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
  Book,
  Database,
  BarChart,
  ChevronDown,
  X,
  Home,
  Moon,
  Sun,
  Laptop,
  Mail,
  UserSquare2,
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
import { useUser } from "@hexclave/next";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

// Navigation configuration with sections.
// A nav item can optionally define `children` to render as a dropdown
// instead of a direct link (used here for Users -> All Users / Subscribers).
const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        children: [
          { href: "/admin/users", label: "All Users", icon: UserSquare2 },
          { href: "/admin/users/subscribers", label: "Newsletter Subscribers", icon: Mail },
        ],
      },
      { href: "/admin/billing", label: "Billing", icon: CreditCard },
      { href: "/admin/usage", label: "Usage", icon: BarChart2 },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blogs", icon: Book },
      { href: "/admin/changelog", label: "Changelog", icon: Database },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart },
    ],
  },
] as const;

const SETTINGS_ITEM = { href: "/admin/settings", label: "Settings", icon: Settings };

interface AdminNavProps {
  initials: string;
  displayName: string;
  email: string;
}

export default function AdminNav({ initials, displayName, email }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const userAuth = useUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle scroll effect for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Mount effect for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    return pathname === href;
  };

  // An item with children is "active" if the current path matches it OR any of its children
  const isItemActive = (item: { href: string; children?: readonly { href: string }[] }) => {
    if (item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return isActive(item.href);
  };

  async function handleSignout() {
    try {
      await userAuth?.signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error("The operation failed. Try again later.");
    }
  }

  // Get current section label for mobile header
  const getCurrentSection = () => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (isItemActive(item)) {
          return section.label;
        }
      }
    }
    return null;
  };

  // Theme Toggler Component
  const ThemeToggler = () => {
    if (!mounted) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : theme === "light" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Laptop className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
            <Sun className="h-4 w-4" />
            <span>Light</span>
            {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 cursor-pointer">
            <Laptop className="h-4 w-4" />
            <span>System</span>
            {theme === "system" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // User menu with improved responsiveness
  const UserMenu = () => (
    <div className="flex items-center gap-1">
      <ThemeToggler />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 gap-2 px-2 rounded-full hover:bg-accent transition-colors"
            aria-label="User menu"
          >
            <Avatar className="h-7 w-7 ring-2 ring-transparent transition-all hover:ring-primary/20">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block transition-transform duration-200 data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/" className="cursor-pointer w-full">
              <Home className="mr-2 h-4 w-4" />
              <span>Return to Home</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin/settings" className="cursor-pointer w-full">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <button
              onClick={handleSignout}
              className="flex w-full items-center text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Renders a single top-level nav item — either a plain link, or (if it has
  // `children`) a dropdown trigger that lists those children.
  const DesktopNavItem = ({
    item,
  }: {
    item: (typeof NAV_SECTIONS)[number]["items"][number];
  }) => {
    const active = isItemActive(item);

    if ("children" in item && item.children) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-sm font-normal px-3 whitespace-nowrap transition-all",
                active && "bg-secondary font-medium shadow-sm",
                !active && "hover:bg-accent/50"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {item.children.map(({ href, label, icon: Icon }) => {
              const childActive = isActive(href);
              return (
                <DropdownMenuItem key={href} asChild>
                  <Link
                    href={href}
                    className={cn("w-full cursor-pointer", childActive && "bg-secondary font-medium")}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button
        variant={active ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-8 gap-1.5 text-sm font-normal px-3 whitespace-nowrap transition-all",
          active && "bg-secondary font-medium shadow-sm",
          !active && "hover:bg-accent/50"
        )}
        asChild
      >
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </Button>
    );
  };

  // Desktop navigation with responsive overflow handling
  const DesktopNav = () => (
    <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
      <Separator orientation="vertical" className="h-6" />
      <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex items-center gap-0.5">
            {section.items.map((item) => (
              <DesktopNavItem key={item.href} item={item} />
            ))}
            {section !== NAV_SECTIONS[NAV_SECTIONS.length - 1] && (
              <Separator orientation="vertical" className="h-5 mx-0.5" />
            )}
          </div>
        ))}
      </nav>
      <div className="ml-auto shrink-0 flex items-center gap-2">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-primary transition-colors hidden sm:inline-block whitespace-nowrap"
        >
          Return to Home
        </Link>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <UserMenu />
      </div>
    </div>
  );

  // Tablet navigation (collapsed with dropdown)
  const TabletNav = () => {
    const [isTabletMenuOpen, setIsTabletMenuOpen] = useState(false);

    return (
      <div className="hidden md:flex lg:hidden items-center gap-2 flex-1 min-w-0">
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu open={isTabletMenuOpen} onOpenChange={setIsTabletMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <Menu className="h-3.5 w-3.5" />
              <span>Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </DropdownMenuLabel>
                {section.items.map((item) => {
                  const active = isItemActive(item);

                  if ("children" in item && item.children) {
                    return (
                      <div key={item.href}>
                        <DropdownMenuItem
                          disabled
                          className={cn(
                            "opacity-100 cursor-default text-xs font-medium text-muted-foreground pl-2",
                            active && "text-foreground"
                          )}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                        {item.children.map(({ href, label, icon: Icon }) => {
                          const childActive = isActive(href);
                          return (
                            <DropdownMenuItem key={href} asChild>
                              <Link
                                href={href}
                                className={cn(
                                  "w-full cursor-pointer pl-8",
                                  childActive && "bg-secondary font-medium"
                                )}
                              >
                                <Icon className="mr-2 h-3.5 w-3.5" />
                                <span>{label}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn("w-full cursor-pointer", active && "bg-secondary font-medium")}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </div>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/" className="w-full cursor-pointer">
                <Home className="mr-2 h-4 w-4" />
                <span>Return to Home</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto shrink-0">
          <UserMenu />
        </div>
      </div>
    );
  };

  // Mobile navigation with improved UX
  const MobileNav = () => (
    <div className="flex md:hidden items-center gap-2 ml-auto">
      <UserMenu />

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-accent transition-colors relative"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Logo />
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                Admin
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3 px-3 py-2.5 mb-4 rounded-lg bg-muted/30">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-4 px-4 pb-4" aria-label="Mobile navigation">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                    {section.label}
                  </h3>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const active = isItemActive(item);

                      if ("children" in item && item.children) {
                        return (
                          <div key={item.href} className="flex flex-col gap-0.5">
                            <div
                              className={cn(
                                "flex items-center gap-3 h-10 px-3 text-sm font-medium text-muted-foreground",
                                active && "text-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>{item.label}</span>
                            </div>
                            {item.children.map(({ href, label, icon: Icon }) => {
                              const childActive = isActive(href);
                              return (
                                <Button
                                  key={href}
                                  variant={childActive ? "secondary" : "ghost"}
                                  className={cn(
                                    "justify-start gap-3 h-9 pl-9 pr-3 text-sm font-normal w-full transition-all",
                                    childActive && "bg-secondary font-medium"
                                  )}
                                  asChild
                                >
                                  <Link href={href} aria-current={childActive ? "page" : undefined}>
                                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span>{label}</span>
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <Button
                          key={item.href}
                          variant={active ? "secondary" : "ghost"}
                          className={cn(
                            "justify-start gap-3 h-10 px-3 text-sm font-normal w-full transition-all",
                            active && "bg-secondary font-medium"
                          )}
                          asChild
                        >
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Return to Home in mobile nav */}
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="justify-start gap-3 h-10 px-3 text-sm font-normal w-full transition-all"
                asChild
              >
                <Link href="/">
                  <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Return to Home</span>
                </Link>
              </Button>
            </nav>
          </div>

          <div className="p-4 border-t bg-muted/5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="justify-start gap-3 h-9 px-3 text-sm transition-colors"
                asChild
              >
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              </Button>
              <Button
                onClick={handleSignout}
                variant="ghost"
                className="justify-start gap-3 h-9 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <div className={cn(
      "sticky top-0 z-50 w-full transition-shadow duration-200",
      isScrolled && "shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className="flex h-14 items-center px-4 max-w-7xl mx-auto">
        <DesktopNav />
        <TabletNav />
        <MobileNav />
      </div>
    </div>
  );
}