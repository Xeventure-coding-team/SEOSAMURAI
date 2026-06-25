import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-all duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Primary ───────────────────────────────────────────────────────────
        default: 'from-primary to-primary/85 text-primary-foreground border border-zinc-950/25 bg-gradient-to-t shadow-md shadow-zinc-950/20 ring-1 ring-inset ring-white/20 transition-[filter] duration-200 hover:brightness-110 active:brightness-90 dark:border-white/20 dark:ring-transparent',


        // ── Destructive ───────────────────────────────────────────────────────
        destructive: 'from-destructive to-destructive/85 text-destructive-foreground border border-zinc-950/25 bg-gradient-to-t shadow-md shadow-zinc-950/20 ring-1 ring-inset ring-white/20 transition-[filter] duration-200 hover:brightness-110 active:brightness-90 dark:border-white/15 dark:ring-transparent',


        // ── Outline ───────────────────────────────────────────────────────────
        outline: 'bg-muted hover:bg-background dark:bg-muted/25 dark:hover:bg-muted/50 dark:border-border inset-shadow-2xs inset-shadow-white dark:inset-shadow-transparent relative flex border border-zinc-300 shadow-sm shadow-zinc-950/10 ring-0 duration-150',


        // ── Secondary ─────────────────────────────────────────────────────────
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/70",

        // ── Ghost ─────────────────────────────────────────────────────────────
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/40",

        // ── Link ──────────────────────────────────────────────────────────────
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100",

        // ── Success ───────────────────────────────────────────────────────────
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500/40 dark:bg-emerald-600 dark:hover:bg-emerald-500",

        // ── Warning ───────────────────────────────────────────────────────────
        warning:
          "bg-amber-400 text-amber-950 shadow-sm hover:bg-amber-500 focus-visible:ring-amber-400/40 dark:bg-amber-400/90 dark:hover:bg-amber-300",

        // ── Info ──────────────────────────────────────────────────────────────
        info:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500/40 dark:bg-blue-500 dark:hover:bg-blue-400",

        // ── Soft variants (tinted bg, colored text — great for inline CTAs) ───
        "soft-destructive":
          "bg-destructive/10 text-destructive hover:bg-destructive/15 dark:bg-destructive/20 dark:hover:bg-destructive/30",

        "soft-success":
          "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/20",

        "soft-warning":
          "bg-amber-400/10 text-amber-700 hover:bg-amber-400/15 dark:text-amber-400 dark:hover:bg-amber-400/20",

        "soft-info":
          "bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/20",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md text-xs gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg text-base px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg text-base px-8 has-[>svg]:px-5",
        icon: "size-9 rounded-md",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }