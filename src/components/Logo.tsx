import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type LogoProps = {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  showText?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export default function Logo({
  src = "/logo/logo_icon.png",
  alt = "Logo",
  width = 40,
  height = 40,
  className,
  priority = false,
  showText = true,
  ...props
}: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const logoSrc =
    theme === "dark"
      ? "/logo/logo_icon_dark.png"
      : "/logo/logo_icon.png";

 
    

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
          className={`text-xl font-semibold tracking-tight text-white`}
        >
          Rankerly
        </span>
      )}
    </div>
  );
}