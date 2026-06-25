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
  Phone, ExternalLink, FilterX, Star, Users, Calendar,
  ChevronRight, Award, Briefcase, Mail, Link2,
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
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
      </span>
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
        className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 p-1">
      <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-2 py-1.5">View</DropdownMenuLabel>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#overview`} className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-slate-500" /> Overview
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#reviews`} className="flex items-center gap-3">
          <MessageSquare className="h-4 w-4 text-slate-500" /> Customer Reviews
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#hours`} className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-slate-500" /> Hours
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#media`} className="flex items-center gap-3">
          <Image className="h-4 w-4 text-slate-500" /> Media
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#location-map`} className="flex items-center gap-3">
          <MapPinned className="h-4 w-4 text-slate-500" /> Location map
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}#health`} className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-slate-500" /> Health
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-2 py-1.5">Manage</DropdownMenuLabel>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}/manage#tasks`} className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-slate-500" /> Tasks
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}/manage#keywords`} className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-slate-500" /> Keywords
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}/manage#analytics`} className="flex items-center gap-3">
          <BarChart3 className="h-4 w-4 text-slate-500" /> Analytics
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}/manage#competitor-insights`} className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-slate-500" /> Competitor insights
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer rounded-md">
        <Link href={`/app/locations/${locationSlug}/manage#social-posts`} className="flex items-center gap-3">
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
    <div className="group relative bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">

      
      <div className="p-6 space-y-4">
        {/* Top row - Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight truncate">
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="soft-info"
              size="sm"
              asChild
              className="h-9 px-3 rounded-xl gap-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <Link href={`/app/locations/${slug}`}>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">View</span>
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 px-4 rounded-xl gap-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all duration-200"
            >
              <Link href={`/app/locations/${slug}/manage`}>
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Manage</span>
              </Link>
            </Button>
            <MoreDropdown locationSlug={slug!} />
          </div>
        </div>

        {/* Meta pills - Enhanced styling */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {category && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40">
              <Tag className="h-3 w-3" />
              {category}
            </span>
          )}
          {locality && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40">
              <MapPin className="h-3 w-3" />
              {locality}
            </span>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/40 transition-colors"
            >
              <Phone className="h-3 w-3" />
              {phone}
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Website
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {mapsUri && (
            <a
              href={mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/40 transition-colors"
            >
              <MapPinned className="h-3 w-3" />
              Maps
              <ExternalLink className="h-2.5 w-2.5" />
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
    <div className="group relative bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
      <div className="p-6 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight truncate">
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
            className="shrink-0 h-9 px-4 rounded-xl gap-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all duration-200"
          >
            <Link href="/app/settings/billing">
              <ArrowUpRight className="h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {category && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40 opacity-60">
              <Tag className="h-3 w-3" />
              {category}
            </span>
          )}
          {locality && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40 opacity-60">
              <MapPin className="h-3 w-3" />
              {locality}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40 opacity-60">
              <Phone className="h-3 w-3" />
              {phone}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/40 opacity-60">
            <Globe className="h-3 w-3" />
            {website ? "Website" : "No website"}
          </span>
        </div>

        {/* Inactive notice */}
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 border-l-4 border-l-amber-500 px-4 py-3 mt-2">
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
  <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner">
      {hasFilters ? (
        <FilterX className="h-8 w-8 text-slate-500 dark:text-slate-400" />
      ) : (
        <Building2 className="h-8 w-8 text-slate-500 dark:text-slate-400" />
      )}
    </div>

    <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
      {hasFilters ? "No matching locations" : "No locations yet"}
    </h3>

    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
      {hasFilters
        ? "Try adjusting your search terms or clearing active filters to see more locations."
        : "Connect your first Google Business Profile location to start managing posts, reviews, and business information."}
    </p>

    <div className="mt-8">
      {hasFilters ? (
        <Button 
          variant="outline" 
          onClick={clearFilters} 
          className="gap-2 rounded-xl border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4" />
          Clear Filters
        </Button>
      ) : (
        <UsageGate slot="locations">
          <Button 
            asChild 
            size="lg" 
            className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all duration-200"
          >
            <Link href="/app/locations/add">
              <Plus className="h-4 w-4" />
              Add Location
            </Link>
          </Button>
        </UsageGate>
      )}
    </div>
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
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {paginatedLocations.map((location, index) => {
        const isActive = location.is_active === true
        return isActive ? (
          <div 
            key={location.id || location.location_id || index}
            className="animate-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ActiveLocationCard location={location} />
          </div>
        ) : (
          <div 
            key={location.id || location.location_id || index}
            className="animate-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <InactiveLocationCard location={location} />
          </div>
        )
      })}
    </div>
  )
}

export default LocationCardList