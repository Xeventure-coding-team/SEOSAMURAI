import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ClientThemeProvider } from "./layouts/ClientThemeProvider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.APP_NAME || "SEO Samurai",
  description:
    "SEO Samurai is your all-in-one tool to boost rankings, optimize local SEO, manage Google Business Profiles, and grow online visibility.",
};

const theme = {
  light: {
    background: '#fefefe',
    foreground: '#000000',
    card: '#fefefe',
    'card-foreground': '#000000',
    popover: '#fdfdfd',
    'popover-foreground': '#000000',
    primary: '#8b5cf6',
    'primary-foreground': '#ffffff',
    secondary: '#f3f4f6',
    'secondary-foreground': '#1f2937',
    muted: '#f7f7f7',
    'muted-foreground': '#6b6b6b',
    accent: '#ede9fe',
    'accent-foreground': '#7c3aed',
    destructive: '#dc2626',
    'destructive-foreground': '#ffffff',
    border: '#e5e7eb',
    input: '#efefef',
    ring: '#000000',
    'chart-1': '#10b981',
    'chart-2': '#8b5cf6',
    'chart-3': '#f59e0b',
    'chart-4': '#6366f1',
    'chart-5': '#8e8e8e',
    sidebar: '#f9f9f9',
    'sidebar-foreground': '#000000',
    'sidebar-primary': '#000000',
    'sidebar-primary-foreground': '#ffffff',
    'sidebar-accent': '#efefef',
    'sidebar-accent-foreground': '#000000',
    'sidebar-border': '#efefef',
    'sidebar-ring': '#000000',
  },
  dark: {
    background: '#1a1625',
    foreground: '#f4f4f4',
    card: '#221d2e',
    'card-foreground': '#f4f4f4',
    popover: '#221d2e',
    'popover-foreground': '#f4f4f4',
    primary: '#a855f7',
    'primary-foreground': '#ffffff',
    secondary: '#2e2838',
    'secondary-foreground': '#f4f4f4',
    muted: '#2e2838',
    'muted-foreground': '#b4b4b4',
    accent: '#332d44',
    'accent-foreground': '#c4b5fd',
    destructive: '#ef4444',
    'destructive-foreground': '#ffffff',
    border: '#3d3750',
    input: '#3d3750',
    ring: '#a855f7',
    'chart-1': '#34d399',
    'chart-2': '#a855f7',
    'chart-3': '#fbbf24',
    'chart-4': '#818cf8',
    'chart-5': '#b4b4b4',
    sidebar: '#13101c',
    'sidebar-foreground': '#f4f4f4',
    'sidebar-primary': '#a855f7',
    'sidebar-primary-foreground': '#ffffff',
    'sidebar-accent': '#2e2838',
    'sidebar-accent-foreground': '#a855f7',
    'sidebar-border': '#3d3750',
    'sidebar-ring': '#a855f7',
  },
  fontFamily: {
    sans: 'Plus Jakarta Sans, sans-serif',
    serif: 'Lora, serif',
    mono: 'IBM Plex Mono, monospace',
  },
  borderRadius: {
    sm: '18.4px',
    md: '20.4px',
    lg: '22.4px',
    xl: '26.4px',
  },
  boxShadow: {
    '2xs': '0px 2px 3px 0px rgba(0, 0, 0, 0.08)',
    xs: '0px 2px 3px 0px rgba(0, 0, 0, 0.08)',
    sm: '0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 1px 2px -1px rgba(0, 0, 0, 0.16)',
    DEFAULT: '0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 1px 2px -1px rgba(0, 0, 0, 0.16)',
    md: '0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 2px 4px -1px rgba(0, 0, 0, 0.16)',
    lg: '0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 4px 6px -1px rgba(0, 0, 0, 0.16)',
    xl: '0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 8px 10px -1px rgba(0, 0, 0, 0.16)',
    '2xl': '0px 2px 3px 0px rgba(0, 0, 0, 0.40)',
  },
  letterSpacing: {
    tighter: '-0.075em',
    tight: '-0.05em',
    normal: '-0.025em',
    wide: '0em',
    wider: '0.025em',
    widest: '0.075em',
  },
  spacing: {
    DEFAULT: '0.27rem',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body
        className={`${outfit.variable} font-outfit antialiased`}
        suppressHydrationWarning
      >
        <ClientThemeProvider>
          <StackProvider app={stackServerApp}>
            <StackTheme theme={theme}>
              {children}
            </StackTheme>
          </StackProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}