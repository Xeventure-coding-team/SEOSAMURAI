import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import Link from "next/link";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  cardClassName?: string;
  showLogo?: boolean;
  logoSize?: "sm" | "md" | "lg";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",     // 384px
  md: "max-w-md",     // 448px
  lg: "max-w-lg",     // 512px
  xl: "max-w-xl",     // 576px
  "2xl": "max-w-2xl", // 672px
  "3xl": "max-w-3xl", // 768px
  "4xl": "max-w-4xl", // 896px
  "5xl": "max-w-5xl", // 1024px
  "6xl": "max-w-6xl", // 1152px
  "7xl": "max-w-7xl", // 1280px
  full: "max-w-full",
};

const logoSizeClasses = {
  sm: "h-8 w-auto",
  md: "h-10 w-auto",
  lg: "h-12 w-auto",
};

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
  cardClassName,
  showLogo = true,
  logoSize = "md",
  maxWidth = "4xl",
}: AuthCardProps) {
  return (
    <div className={cn("min-h-screen flex flex-col bg-muted/30", className)}>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:border focus:border-gray-300 focus:rounded focus:shadow-sm"
      >
        Skip to main content
      </a>

      {showLogo && (
        <div className="absolute top-6 left-6">
          <Link href="/">
            <Logo className={logoSizeClasses[logoSize]} />
          </Link>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card
          id="main-content"
          className={cn(
            "w-full", // Add this to make the card take full width of its container
            maxWidthClasses[maxWidth], // Apply the max-width class
            "border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-200",
            cardClassName
          )}
        >
          <CardHeader className="space-y-1.5 text-center pb-4 pt-6">
            <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm text-gray-600">
                {description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            {children}
            {footer && (
              <div className="pt-5 text-center text-sm text-gray-600 border-t border-gray-200/80">
                {footer}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}