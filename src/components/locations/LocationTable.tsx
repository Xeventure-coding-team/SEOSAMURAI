import React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  MapPin,
  Eye,
  Settings2,
  Building2,
  Plus,
  RotateCcw,
  MoreHorizontal,
  Lock,
  ArrowUpRight,
  Globe,
  Globe2,
  Zap,
  FileText,
  BarChart3,
  TrendingUp,
  Share2,
  MessageSquare,
  MapPinned,
  Clock,
  Image,
  Activity,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Tag,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Location = {
  _id?: string
  id?: string
  name: string
  title: string
  formattedAddress: string
  profile?: { description?: string }
  websiteUri?: string
  categories?: { primaryCategory?: { displayName: string } }
  storefrontAddress?: { addressLines?: string[]; locality?: string }
  location_id?: string
  location_name?: string
  is_active?: boolean
}

interface LocationCardListProps {
  filteredAndSortedLocations: Location[]
  paginatedLocations: Location[]
  sortBy: string
  sortDirection: "asc" | "desc"
  toggleSort: (field: string) => void
  hasActiveFilters: boolean
  clearFilters: () => void
  getPreferredLocality: (location: Location) => string
}

// ─── Meta pill ────────────────────────────────────────────────────────────────
const MetaPill: React.FC<{
  icon: React.ReactNode
  label: string
  variant?: "default" | "category" | "muted"
}> = ({ icon, label, variant = "default" }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
      variant === "category" && "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
      variant === "default" && "text-muted-foreground",
      variant === "muted" && "text-muted-foreground/60"
    )}
  >
    {icon}
    {label}
  </span>
)

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/50">
      <CheckCircle2 className="h-3 w-3" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50">
      <AlertCircle className="h-3 w-3" />
      Inactive
    </span>
  )

// ─── More dropdown ────────────────────────────────────────────────────────────
const MoreDropdown: React.FC<{ locationSlug: string }> = ({ locationSlug }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" aria-label="More options">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide font-medium">View</DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#overview`} className="flex items-center gap-2.5">
          <Eye className="h-4 w-4 text-muted-foreground" /> Overview
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#reviews`} className="flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Reviews
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#hours`} className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-muted-foreground" /> Hours
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#media`} className="flex items-center gap-2.5">
          <Image className="h-4 w-4 text-muted-foreground" /> Media
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#location-map`} className="flex items-center gap-2.5">
          <MapPinned className="h-4 w-4 text-muted-foreground" /> Location map
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#health`} className="flex items-center gap-2.5">
          <Activity className="h-4 w-4 text-muted-foreground" /> Health
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Manage</DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#tasks`} className="flex items-center gap-2.5">
          <Zap className="h-4 w-4 text-muted-foreground" /> Tasks
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#keywords`} className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" /> Keywords
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#analytics`} className="flex items-center gap-2.5">
          <BarChart3 className="h-4 w-4 text-muted-foreground" /> Analytics
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#competitor-insights`} className="flex items-center gap-2.5">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Competitor insights
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#social-posts`} className="flex items-center gap-2.5">
          <Share2 className="h-4 w-4 text-muted-foreground" /> Social posts
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#customer-reviews`} className="flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Customer reviews
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

// ─── Active location card ─────────────────────────────────────────────────────
const ActiveLocationCard: React.FC<{
  location: Location
  getPreferredLocality: (l: Location) => string
}> = ({ location, getPreferredLocality }) => {
  const slug = location.id
  const category = location.categories?.primaryCategory?.displayName
  const locality = getPreferredLocality(location)
  const hasWebsite = !!location.websiteUri

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">
            {location.title || "Untitled location"}
          </h3>
          <StatusBadge active={true} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" asChild className="h-8 rounded-lg gap-1.5 text-sm font-medium">
            <Link href={`/app/locations/${slug}`}>
              <Eye className="h-3.5 w-3.5" />
              Details
            </Link>
          </Button>
          <Button size="sm" asChild className="h-8 rounded-lg gap-1.5 text-sm font-medium">
            <Link href={`/app/locations/${slug}/manage`}>
              <Settings2 className="h-3.5 w-3.5" />
              Manage
            </Link>
          </Button>
          <MoreDropdown locationSlug={slug!} />
        </div>
      </div>

      {/* Description */}
      {location.profile?.description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {location.profile.description}
        </p>
      )}

      {/* Meta pills */}
      <div className="flex flex-wrap items-center gap-2">
        {category && (
          <MetaPill
            icon={<Tag className="h-3 w-3" />}
            label={category}
            variant="category"
          />
        )}
        {locality && (
          <MetaPill
            icon={<MapPin className="h-3 w-3" />}
            label={locality}
          />
        )}
        <MetaPill
          icon={<Globe className="h-3 w-3" />}
          label={hasWebsite ? "Website live" : "No website"}
          variant={hasWebsite ? "default" : "muted"}
        />
      </div>
    </div>
  )
}

// ─── Inactive location card ───────────────────────────────────────────────────
const InactiveLocationCard: React.FC<{
  location: Location
  getPreferredLocality: (l: Location) => string
}> = ({ location, getPreferredLocality }) => {
  const category = location.categories?.primaryCategory?.displayName
  const locality = getPreferredLocality(location)
  const hasWebsite = !!location.websiteUri

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 opacity-70">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">
            {location.title || "Untitled location"}
          </h3>
          <StatusBadge active={false} />
        </div>
        <Button
          size="sm"
          variant="outline"
          asChild
          className="shrink-0 h-8 rounded-lg gap-1.5 text-sm font-medium"
        >
          <Link href="/app/settings/billing">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Upgrade to activate
          </Link>
        </Button>
      </div>

      {/* Description */}
      {location.profile?.description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 opacity-70">
          {location.profile.description}
        </p>
      )}

      {/* Meta pills */}
      <div className="flex flex-wrap items-center gap-2 opacity-60">
        {category && (
          <MetaPill
            icon={<Tag className="h-3 w-3" />}
            label={category}
            variant="category"
          />
        )}
        {locality && (
          <MetaPill
            icon={<MapPin className="h-3 w-3" />}
            label={locality}
          />
        )}
        <MetaPill
          icon={<Globe className="h-3 w-3" />}
          label={hasWebsite ? "Website locked" : "No website"}
          variant="muted"
        />
      </div>

      {/* Inactive notice */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2.5">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This location is paused — your Starter plan only includes 1 active location. Upgrade to make it visible on Google Business.
        </p>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ hasFilters: boolean; clearFilters: () => void }> = ({
  hasFilters,
  clearFilters,
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <Building2 className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-base mb-1.5">
      {hasFilters ? "No matches found" : "No locations yet"}
    </h3>
    <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
      {hasFilters
        ? "Try adjusting your search or filters to find what you're looking for."
        : "Get started by adding your first Google Business location."}
    </p>
    {hasFilters ? (
      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 rounded-xl">
        <RotateCcw className="h-3.5 w-3.5" /> Clear filters
      </Button>
    ) : (
      <Button size="sm" asChild className="gap-1.5 rounded-xl">
        <Link href="/app/locations/add">
          <Plus className="h-3.5 w-3.5" /> Add first location
        </Link>
      </Button>
    )}
  </div>
)

// ─── Main export ──────────────────────────────────────────────────────────────
const LocationCardList: React.FC<LocationCardListProps> = ({
  filteredAndSortedLocations,
  paginatedLocations,
  hasActiveFilters,
  clearFilters,
  getPreferredLocality,
}) => {
  if (filteredAndSortedLocations.length === 0) {
    return <EmptyState hasFilters={hasActiveFilters} clearFilters={clearFilters} />
  }

  return (
    <div className="space-y-3">
      {paginatedLocations.map((location) => {
        const isActive = location.is_active !== false
        return isActive ? (
          <ActiveLocationCard
            key={location.location_id || location.name}
            location={location}
            getPreferredLocality={getPreferredLocality}
          />
        ) : (
          <InactiveLocationCard
            key={location.location_id || location.name}
            location={location}
            getPreferredLocality={getPreferredLocality}
          />
        )
      })}
    </div>
  )
}

export default LocationCardList