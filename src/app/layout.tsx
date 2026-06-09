import type { Metadata } from "next";
import { HexclaveProvider, HexclaveTheme } from "@hexclave/next";
import { stackServerApp } from "../stack";
import {
  Outfit,
  Inter,
  Roboto,
  Open_Sans,
  Poppins,
  Montserrat,
  Lato,
  Nunito,
  Playfair_Display,
  Merriweather,
  DM_Sans,
  Plus_Jakarta_Sans,
  Space_Grotesk
} from "next/font/google";
import "./globals.css";
import { ClientThemeProvider } from "./layouts/ClientThemeProvider";
import { CurrencyProvider } from "@/providers/CurrencyProvider";
import ClarityInit from "@/components/tracking/ClarityInit";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ['400', '500', '700'],
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  weight: ['400', '700'],
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ['400', '700'],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.APP_NAME || "Rankerly",
  description:
    "Rankerly is your all-in-one tool to boost rankings, optimize local SEO, manage Google Business Profiles, and grow online visibility.",
};

const theme = {
  light: {
    background: '#fefefe',
    foreground: '#000000',
    card: '#fefefe',
    'card-foreground': '#000000',
    popover: '#fdfdfd',
    'popover-foreground': '#000000',

    primary: '#2563eb',
    'primary-foreground': '#ffffff',

    secondary: '#e0e7ff',
    'secondary-foreground': '#1e3a8a',

    muted: '#f1f5ff',
    'muted-foreground': '#6b7280',

    accent: '#dbeafe',
    'accent-foreground': '#2563eb',

    destructive: '#dc2626',
    'destructive-foreground': '#ffffff',

    border: '#e5e7eb',
    input: '#eff6ff',
    ring: '#2563eb',

    'chart-1': '#2563eb',
    'chart-2': '#1d4ed8',
    'chart-3': '#60a5fa',
    'chart-4': '#93c5fd',
    'chart-5': '#bfdbfe',

    sidebar: '#f8fafc',
    'sidebar-foreground': '#000000',
    'sidebar-primary': '#2563eb',
    'sidebar-primary-foreground': '#ffffff',
    'sidebar-accent': '#eff6ff',
    'sidebar-accent-foreground': '#2563eb',
    'sidebar-border': '#e5e7eb',
    'sidebar-ring': '#2563eb',
  },

  dark: {
    background: '#0f172a',
    foreground: '#f4f4f4',
    card: '#1e293b',
    'card-foreground': '#f4f4f4',
    popover: '#1e293b',
    'popover-foreground': '#f4f4f4',

    primary: '#2563eb',
    'primary-foreground': '#ffffff',

    secondary: '#1e293b',
    'secondary-foreground': '#e0e7ff',

    muted: '#1e293b',
    'muted-foreground': '#94a3b8',

    accent: '#1d4ed8',
    'accent-foreground': '#bfdbfe',

    destructive: '#ef4444',
    'destructive-foreground': '#ffffff',

    border: '#334155',
    input: '#334155',
    ring: '#2563eb',

    'chart-1': '#2563eb',
    'chart-2': '#60a5fa',
    'chart-3': '#93c5fd',
    'chart-4': '#1d4ed8',
    'chart-5': '#bfdbfe',

    sidebar: '#020617',
    'sidebar-foreground': '#f4f4f4',
    'sidebar-primary': '#2563eb',
    'sidebar-primary-foreground': '#ffffff',
    'sidebar-accent': '#1e293b',
    'sidebar-accent-foreground': '#60a5fa',
    'sidebar-border': '#334155',
    'sidebar-ring': '#2563eb',
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
        className={`${outfit.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} ${poppins.variable} ${montserrat.variable} ${lato.variable} ${nunito.variable} ${playfairDisplay.variable} ${merriweather.variable} ${dmSans.variable} ${plusJakartaSans.variable} ${spaceGrotesk.variable} font-outfit antialiased`}
        suppressHydrationWarning
      >

        {/* Mircosoft clarity */}
        <ClarityInit />

        <ClientThemeProvider>
          <HexclaveProvider app={stackServerApp}>
            <HexclaveTheme theme={theme}>
              <CurrencyProvider>
                {children}
              </CurrencyProvider>
            </HexclaveTheme >
          </HexclaveProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}