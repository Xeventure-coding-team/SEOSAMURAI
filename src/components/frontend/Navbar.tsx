"use client"

import { Menu, User, LogOut, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Navbar as NavbarComponent, NavbarLeft, NavbarRight } from "@/components/ui/navbar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { siteConfig } from "@/config/site"
import { useStackApp, useUser } from "@stackframe/stack"
import toast from "react-hot-toast"
import Link from "next/link"

interface NavbarLink {
  text: string
  href: string
}

interface NavbarActionProps {
  text: string
  href: string
  variant?: any
  icon?: ReactNode
  iconRight?: ReactNode
  isButton?: boolean
}

interface NavbarProps {
  logo?: ReactNode
  name?: string
  homeUrl?: string
  mobileLinks?: NavbarLink[]
  actions?: NavbarActionProps[]
  showNavigation?: boolean
  customNavigation?: ReactNode
  className?: string
}

export default function Navbar({
  logo = "SEO Samurai",
  name = "SEO Samurai",
  homeUrl = siteConfig.url,
  mobileLinks = [],
  actions = [],
  showNavigation = true,
  customNavigation,
  className,
}: NavbarProps) {
  const user = useUser()
  const app = useStackApp()
  const [isOpen, setIsOpen] = useState(false)

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Checking session...</p>
      </div>
    )
  }

  async function handleSignout() {
    try {
      await user?.signOut()
      toast.success("Signed out successfully")
    } catch (error) {
      toast.error("The operation failed. Try again later.")
    }
  }

  return (
    <header className={cn("sticky top-0 z-50 -mb-4 px-4 sm:px-6 lg:px-8 py-4", className)}>
      <div className="max-w-screen-xl relative mx-auto">
        <NavbarComponent className="bg-transparent dark:bg-transparent rounded-full px-6 py-2.5 shadow-sm shadow-gray-200/50 dark:shadow-gray-800/50 backdrop-blur-md border border-gray-200/30 dark:border-gray-500/30">
          <NavbarLeft>
            <Link
              href={"#"}
              className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white tracking-tight hover:opacity-90 transition-opacity duration-300"
            >
              {logo}
            </Link>
            {/* {showNavigation && (customNavigation || <Navigation />)} */}
          </NavbarLeft>

          <NavbarRight className="flex items-center gap-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:inline-flex text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white rounded-full px-4 py-1.5 transition-all duration-300"
                >
                  <Link href="/app/dashboard">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSignout}                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:inline-flex text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white rounded-full px-4 py-1.5 transition-all duration-300"
                >
                  <Link href="/handler/signin">Sign in</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                >
                  <Link href="/handler/signup">Get Started</Link>
                </Button>
              </>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-full p-2 transition-all duration-300 hover:scale-110"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  {<Menu className="size-6" />}
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-l border-gray-200/30 dark:border-gray-700/30 rounded-l-2xl w-[280px] sm:w-[320px] p-6"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="grid gap-4 text-base font-medium">
                  <Link
                    href={homeUrl}
                    className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white hover:opacity-90 transition-opacity duration-300"
                  >
                    <span>{name}</span>
                  </Link>
                  {mobileLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-300 hover:scale-105"
                    >
                      {link.text}
                    </Link>
                  ))}

                  <div className="mt-6 flex flex-col gap-3">
                    {user ? (
                      <>
                        <Button
                          asChild
                          variant="ghost"
                          className="justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-full px-4 py-1.5 transition-all duration-300 hover:scale-105"
                        >
                          <Link href="/app/dashboard">Dashboard</Link>
                        </Button>
                        <Button
                          onClick={handleSignout}                        >
                          Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          asChild
                          variant="ghost"
                          className="justify-start text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-full px-4 py-1.5 transition-all duration-300 hover:scale-105"
                        >
                          <Link href="/handler/signin">Sign in</Link>
                        </Button>
                        <Button
                          asChild
                          variant="default"
                        >
                          <Link href="/handler/signup">Get Started</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </NavbarRight>
        </NavbarComponent>
      </div>
    </header>
  )
}
