"use client"

import { Menu, ChevronDown, User, ArrowRight } from "lucide-react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { siteConfig } from "@/config/site"
import { useUser } from "@hexclave/next"
import toast from "react-hot-toast"
import Link from "next/link"
import Logo from "../Logo"

// ─── Menu card ────────────────────────────────────────────────────────────────
function MenuCard({ item }: { item: typeof siteConfig.products[0] }) {
  return (
    <Link
      href={item.url}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors duration-150",
        "hover:bg-accent"
      )}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg mt-0.5 bg-primary/10 text-primary"
        style={{ width: 36, height: 36 }}
      >
        <item.icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
        <p className="text-xs mt-1 leading-snug text-muted-foreground">{item.desc}</p>
      </div>
    </Link>
  )
}

// ─── Mega Menu ────────────────────────────────────────────────────────────────
function MegaMenu({ open }: { open: boolean }) {
  if (!open) return null

  const half = Math.ceil(siteConfig.products.length / 2)
  const col1 = siteConfig.products.slice(0, half)
  const col2 = siteConfig.products.slice(half)

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 z-50" style={{ width: 700 }}>
      <div className="h-2" />
      <div className="rounded-xl overflow-hidden border border-border bg-popover shadow-lg">
        <div className="p-2 grid grid-cols-2 gap-x-1">
          <div className="flex flex-col">
            {col1.map((item) => <MenuCard key={item.title} item={item} />)}
          </div>
          <div className="flex flex-col border-l border-border pl-1">
            {col2.map((item) => <MenuCard key={item.title} item={item} />)}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/40">
          <div>
            <p className="text-sm font-semibold text-foreground">Ready to grow your business?</p>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Start ranking higher with {siteConfig.name}.
            </p>
          </div>
          <Button size="sm" className="gap-2 flex-shrink-0" asChild>
            <Link href="/handler/signup">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Desktop nav ──────────────────────────────────────────────────────────────
function DesktopNav() {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-11 px-5 rounded-md text-[15px] font-medium transition-colors duration-300",
            open ? "text-primary" : "text-foreground/75 hover:text-primary"
          )}
          aria-expanded={open}
        >
          Product
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200 text-muted-foreground", open && "rotate-180")} />
        </button>
        <MegaMenu open={open} />
      </div>

      {siteConfig.navLinks.map((item) => (
        <Link
          key={item.title}
          href={item.url}
          className="inline-flex items-center h-11 px-5 rounded-md text-[15px] font-medium text-foreground/75 hover:text-primary transition-colors duration-300"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────
function MobileNav({ user, onSignout, homeUrl }: { user: any; onSignout: () => void; homeUrl: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* lg:hidden matches the template pattern */}
        <button
          type="button"
          className="p-2.5 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-primary/90 focus:outline-none lg:hidden"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="px-5 py-4 border-b border-border">
            <Link href={homeUrl}><Logo /></Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            <div>
              <button
                onClick={() => setOpenGroup(openGroup === "Product" ? null : "Product")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[15px] font-medium text-foreground rounded-md hover:bg-accent transition-colors"
              >
                Product
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openGroup === "Product" && "rotate-180")} />
              </button>

              {openGroup === "Product" && (
                <div className="mt-1 flex flex-col gap-0.5 px-1">
                  {siteConfig.products.map((item) => (
                    <Link key={item.title} href={item.url} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {siteConfig.navLinks.map((item) => (
              <Link key={item.title} href={item.url} className="px-3 py-2.5 text-[15px] font-medium text-foreground rounded-md hover:bg-accent transition-colors">
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-border flex flex-col gap-2.5">
            {user?.id ? (
              <Button className="w-full" asChild>
                <a href="/app/dashboard"><User className="mr-2 h-4 w-4" />Dashboard</a>
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/handler/signin">Sign In</a>
                </Button>
                <Button className="w-full" asChild>
                  <a href="/handler/signup">Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function Navbar({ homeUrl = siteConfig.url, className = "" }) {
  const user = useUser()
  if (user === undefined) return null

  async function handleSignout() {
    try {
      await user?.signOut()
      toast.success("Signed out successfully")
    } catch {
      toast.error("Sign out failed. Try again.")
    }
  }

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto flex py-2.5 px-4 sm:px-6 lg:px-8 items-center justify-between gap-6">

        {/* Logo */}
        <div className="shrink-0">
          <Link href={homeUrl} aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
        </div>

        {/* Center nav */}
        <div className="flex-1 flex items-center justify-center">
          <DesktopNav />
        </div>

        {/* Right side — matches template: login link + CTA + hamburger */}
        <div className="flex items-center gap-4 md:gap-6 justify-end shrink-0">
          {user?.id ? (
             <></>
          ) : (
            /* Logged out: Login link (desktop only) */
            <a href="/handler/signin" className="items-center gap-1 text-foreground/75 hover:text-primary transition-colors duration-300 lg:flex hidden">
              <User className="size-5" />
              <span>Login</span>
            </a>
          )}

          {/* CTA button — desktop only, always shown */}
          <a
            href={user?.id ? "/app/dashboard" : "/handler/signup"}
            className="justify-center items-center gap-2 bg-primary text-white rounded-md py-2.5 px-6 lg:flex hidden group hover:bg-primary/90 transition-colors duration-300"
          >
            <div className="size-5 bg-white/20 rounded-full flex justify-center items-center">
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:-rotate-45" />
            </div>
            <span className="text-sm font-semibold">
              {user?.id ? "Dashboard" : "Get Started"}
            </span>
          </a>

          {/* Hamburger — mobile/tablet only (lg:hidden) */}
          <MobileNav user={user} onSignout={handleSignout} homeUrl={homeUrl} />
        </div>

      </div>
    </header>
  )
}