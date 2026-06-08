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
  MapPin, Eye, Settings2, Building2, Plus, RotateCcw,
  MoreHorizontal, ArrowUpRight, Globe, Zap, FileText,
  BarChart3, TrendingUp, Share2, MessageSquare, MapPinned,
  Clock, Image, Activity, AlertCircle, CheckCircle2, Tag,
  Phone, ExternalLink,
  FilterX,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { UsageGate } from "../usage-gate"

type StorefrontAddress = {
  locality?: string
  administrativeArea?: string
  postalCode?: string
  addressLines?: string[]
  regionCode?: string
}

type Location = {
  _id?: string
  id?: string
  name: string
  title: string
  displayName?: string
  formattedAddress: string
  profile?: { description?: string }
  websiteUri?: string
  businessWebsite?: string | null
  categories?: {
    primaryCategory?: { displayName: string }
    additionalCategories?: { displayName: string }[]
  }
  storefrontAddress?: StorefrontAddress
  phoneNumbers?: { primaryPhone?: string; additionalPhones?: string[] }
  metadata?: {
    placeId?: string
    mapsUri?: string
    newReviewUri?: string
    canDelete?: boolean
  }
  location_id?: string
  location_name?: string
  is_active?: boolean
  last_rank_updated?: string | null
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getLocality = (location: Location): string => {
  return (
    location.storefrontAddress?.locality ||
    location.storefrontAddress?.administrativeArea ||
    location.formattedAddress?.split(",")[1]?.trim() ||
    ""
  )
}

const getWebsite = (location: Location): string | null =>
  location.websiteUri || location.businessWebsite || null

const getCategoryName = (location: Location): string =>
  location.categories?.primaryCategory?.displayName || ""

const getPhone = (location: Location): string =>
  location.phoneNumbers?.primaryPhone || ""

const getMapsUri = (location: Location): string =>
  location.metadata?.mapsUri || ""

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shadow-sm">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/60 shadow-sm">
      <AlertCircle className="h-3.5 w-3.5" />
      Paused
    </span>
  )

// ─── More dropdown ────────────────────────────────────────────────────────────
const MoreDropdown: React.FC<{ locationSlug: string }> = ({ locationSlug }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-2 py-1.5">View</DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#overview`} className="flex items-center gap-3 cursor-pointer">
          <Eye className="h-4 w-4 text-slate-500" /> Overview
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#reviews`} className="flex items-center gap-3 cursor-pointer">
          <MessageSquare className="h-4 w-4 text-slate-500" /> Customer Reviews
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#hours`} className="flex items-center gap-3 cursor-pointer">
          <Clock className="h-4 w-4 text-slate-500" /> Hours
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#media`} className="flex items-center gap-3 cursor-pointer">
          <Image className="h-4 w-4 text-slate-500" /> Media
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#location-map`} className="flex items-center gap-3 cursor-pointer">
          <MapPinned className="h-4 w-4 text-slate-500" /> Location map
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}#health`} className="flex items-center gap-3 cursor-pointer">
          <Activity className="h-4 w-4 text-slate-500" /> Health
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-2 py-1.5">Manage</DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#tasks`} className="flex items-center gap-3 cursor-pointer">
          <Zap className="h-4 w-4 text-slate-500" /> Tasks
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#keywords`} className="flex items-center gap-3 cursor-pointer">
          <FileText className="h-4 w-4 text-slate-500" /> Keywords
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#analytics`} className="flex items-center gap-3 cursor-pointer">
          <BarChart3 className="h-4 w-4 text-slate-500" /> Analytics
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#competitor-insights`} className="flex items-center gap-3 cursor-pointer">
          <TrendingUp className="h-4 w-4 text-slate-500" /> Competitor insights
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/app/locations/${locationSlug}/manage#social-posts`} className="flex items-center gap-3 cursor-pointer">
          <Share2 className="h-4 w-4 text-slate-500" /> Social posts
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

// ─── Active location card ─────────────────────────────────────────────────────
const ActiveLocationCard: React.FC<{ location: Location }> = ({ location }) => {
  const slug = location.id
  const category = getCategoryName(location)
  const locality = getLocality(location)
  const website = getWebsite(location)
  const phone = getPhone(location)
  const mapsUri = getMapsUri(location)

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 hover:shadow-sm">


      <div className="p-5 space-y-4">
        {/* Top row - Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight truncate">
                {location.title}
              </h3>
              <StatusBadge active={true} />
            </div>
            {location.profile?.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-1">
                {location.profile.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 rounded-lg gap-2 text-sm font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Link href={`/app/locations/${slug}`}>
                <Eye className="h-4 w-4" />
                Details
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 rounded-lg gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Link href={`/app/locations/${slug}/manage`}>
                <Settings2 className="h-4 w-4" />
                Manage
              </Link>
            </Button>
            <MoreDropdown locationSlug={slug!} />
          </div>
        </div>

        {/* Meta pills - Enhanced styling */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {category && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50 shadow-sm">
              <Tag className="h-3.5 w-3.5" />
              {category}
            </span>
          )}
          {locality && (
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50">
              <MapPin className="h-3.5 w-3.5" />
              {locality}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50">
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </span>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors shadow-sm"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {mapsUri && (
            <a
              href={mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
            >
              <MapPinned className="h-3.5 w-3.5" />
              Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Inactive location card ───────────────────────────────────────────────────
const InactiveLocationCard: React.FC<{ location: Location }> = ({ location }) => {
  const category = getCategoryName(location)
  const locality = getLocality(location)
  const website = getWebsite(location)
  const phone = getPhone(location)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden opacity-75 hover:opacity-100 transition-opacity">


      <div className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight truncate">
                {location.title}
              </h3>
              <StatusBadge active={false} />
            </div>
            {location.profile?.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                {location.profile.description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            asChild
            className="shrink-0 h-9 rounded-lg gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link href="/app/settings/billing">
              <ArrowUpRight className="h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {category && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50 opacity-60">
              <Tag className="h-3.5 w-3.5" />
              {category}
            </span>
          )}
          {locality && (
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50 opacity-60">
              <MapPin className="h-3.5 w-3.5" />
              {locality}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50 opacity-60">
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </span>
          )}
          <span className="inline-flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-800/30 dark:text-slate-500 dark:border-slate-700/30 opacity-60">
            <Globe className="h-3.5 w-3.5" />
            {website ? "Website" : "No website"}
          </span>
        </div>

        {/* Inactive notice */}
        <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 border-l-4 border-l-amber-500 px-4 py-3 mt-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            This location is paused — your Starter plan only includes 1 active location.{" "}
            <Link href="/app/settings/billing" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Upgrade your plan
            </Link>{" "}
            to make it visible on Google Business.
          </p>
        </div>
      </div>
    </div>
  )
}

const EmptyState: React.FC<{ hasFilters: boolean; clearFilters: () => void }> = ({
  hasFilters,
  clearFilters,
}) => (
  <div className="flex flex-col items-center justify-center py-28 text-center px-6">
    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
      {hasFilters
        ? <FilterX className="h-7 w-7 text-muted-foreground" />
        : <Building2 className="h-7 w-7 text-muted-foreground" />
      }
    </div>

    <h3 className="text-lg font-medium text-foreground mb-2">
      {hasFilters ? "No locations found" : "No locations yet"}
    </h3>

    <p className="text-sm text-muted-foreground max-w-[300px] mb-7 leading-relaxed">
      {hasFilters
        ? "No results match your current filters. Try adjusting your search or clearing them."
        : "Add your first Google Business location to start managing your online presence."}
    </p>

    {hasFilters ? (
      <Button variant="outline" onClick={clearFilters} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        Clear filters
      </Button>
    ) : (
      <UsageGate slot="locations">
        <Button asChild className="gap-2">
          <Link href="/app/locations/add">
            <Plus className="h-4 w-4" />
            Add first location
          </Link>
        </Button>
      </UsageGate>
    )}
  </div>
)


// ─── Main export ──────────────────────────────────────────────────────────────
const LocationCardList: React.FC<LocationCardListProps> = ({
  filteredAndSortedLocations,
  paginatedLocations,
  hasActiveFilters,
  clearFilters,
}) => {
  if (filteredAndSortedLocations.length === 0) {
    return <EmptyState hasFilters={hasActiveFilters} clearFilters={clearFilters} />
  }

  return (
    <div className="space-y-3">
      {paginatedLocations.map((location) => {
        const isActive = location.is_active === true
        return isActive ? (
          <ActiveLocationCard
            key={location.id || location.location_id}
            location={location}
          />
        ) : (
          <InactiveLocationCard
            key={location.id || location.location_id}
            location={location}
          />
        )
      })}
    </div>
  )
}

export default LocationCardList
