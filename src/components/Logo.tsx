"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type LogoProps = {
  src?: string;
  darkSrc?: string;
  lightSrc?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  showText?: boolean;
  textClassName?: string;
  textColor?: "auto" | "dark" | "light";
} & React.HTMLAttributes<HTMLDivElement>;

export default function Logo({
  src = "/logo/logo_icon.png",
  darkSrc,
  lightSrc,
  alt = "Logo",
  width = 50,
  height = 50,
  className,
  priority = false,
  showText = true,
  textClassName,
  textColor = "auto",
  ...props
}: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Logo source based on theme
  const logoSrc = theme === "dark" 
    ? (darkSrc || src)
    : (lightSrc || src);

  // Fixed text color logic
  const textColorClass = 
    textColor === "auto" 
      ? "text-foreground" 
      : textColor === "dark" 
      ? "text-white" 
      : "text-gray-900"; // light mode

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <Image
        src={logoSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="shrink-0"
      />

      {showText && (
        <span
          className={cn(
            "text-[25px] font-semibold tracking-tight",
            textColorClass,
            textClassName
          )}
        >
          Rankerly
        </span>
      )}
    </div>
  );
}