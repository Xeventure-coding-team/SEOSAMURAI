"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Search,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  MapPin,
  SlidersHorizontal,
} from "lucide-react"
import stringSimilarity from "string-similarity"
import { toast } from "react-hot-toast"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "../Error"
import { TooltipProvider } from "@/components/ui/tooltip"
import LocationCardList from "./LocationTable"
import { UsageGate } from "../usage-gate"
import { SlotBadge } from "../slot-badge"
import { ChooseActiveLocation } from "./ChooseActiveLocation"
import { usePlanLimits } from "@/lib/use-plan-limits"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { SlotInfoBanner } from "../SlotInfoBanner"

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

type SortOption = "name" | "category" | "location" | "website"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const getPreferredLocality = (loc: Location) =>
  loc.formattedAddress ||
  loc.storefrontAddress?.locality ||
  loc.storefrontAddress?.addressLines?.join(", ") ||
  ""

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen  px-4 sm:px-6 py-8 space-y-6 x-auto">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocationsTable() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationChoiceMade, setLocationChoiceMade] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [websiteFilter, setWebsiteFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const limits = usePlanLimits()
  const planLimit = limits?.locations ?? 1
  const [showPicker, setShowPicker] = useState(false)

  const hasInactive = locations.some((l) => l.is_active === false)
  const isOverLimit = locations.length > planLimit

  const accountId = useGMBStore((s) => s.accountId)
  const accessToken = useGMBStore((s) => s.accessToken)
  const router = useRouter()

  const fetchLocations = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!accountId || !accessToken) {
        setError("Missing credentials in DB.")
        setLoading(false)
        return
      }
      const res = await fetch(
        `/api/gmb/locations?account_id=${accountId}&accessToken=${accessToken}`,
        { headers: { Authorization: accessToken } }
      )
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to fetch locations.")
      }
      const data = await res.json()
      setLocationChoiceMade(data.locationChoiceMade)
      setLocations(data.accounts || [])
    } catch (err: any) {
      setError(err.message || "Error loading locations.")
      toast.error(err.message || "Error loading locations.")
      
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLocations() }, [])

  const filterOptions = useMemo(() => {
    const normalize = (str?: string) =>
      str?.replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim().toLowerCase()

    const dedupeFuzzy = (list: string[]) => {
      const result: string[] = []
      list.forEach((item) => {
        const norm = normalize(item)
        const isDuplicate = result.some(
          (e) => stringSimilarity.compareTwoStrings(normalize(e)!, norm!) > 0.85
        )
        if (!isDuplicate) result.push(item)
      })
      return result
    }

    const categories = dedupeFuzzy(
      locations.map((l) => l.categories?.primaryCategory?.displayName).filter(Boolean) as string[]
    ).sort()
    const locationsList = dedupeFuzzy(
      locations.map((l) => getPreferredLocality(l)).filter(Boolean) as string[]
    ).sort()
    return { categories, locations: locationsList }
  }, [locations])

  const filteredAndSortedLocations = useMemo(() => {
    const filtered = locations.filter((loc) => {
      const matchesSearch =
        !searchTerm ||
        loc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.profile?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.categories?.primaryCategory?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        categoryFilter === "all" || loc.categories?.primaryCategory?.displayName === categoryFilter
      const matchesLocation =
        locationFilter === "all" || getPreferredLocality(loc) === locationFilter
      const matchesWebsite =
        websiteFilter === "all" ||
        (websiteFilter === "with" && loc.websiteUri) ||
        (websiteFilter === "without" && !loc.websiteUri)
      return matchesSearch && matchesCategory && matchesLocation && matchesWebsite
    })

    filtered.sort((a, b) => {
      // Active always before inactive
      const aActive = a.is_active !== false ? 0 : 1
      const bActive = b.is_active !== false ? 0 : 1
      if (aActive !== bActive) return aActive - bActive

      // Then apply the selected sort within each group
      let aValue = "", bValue = ""
      switch (sortBy) {
        case "name": aValue = a.title || ""; bValue = b.title || ""; break
        case "category": aValue = a.categories?.primaryCategory?.displayName || ""; bValue = b.categories?.primaryCategory?.displayName || ""; break
        case "location": aValue = getPreferredLocality(a); bValue = getPreferredLocality(b); break
        case "website": aValue = a.websiteUri ? "1" : "0"; bValue = b.websiteUri ? "1" : "0"; break
      }
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })

    return filtered
  }, [locations, searchTerm, categoryFilter, locationFilter, websiteFilter, sortBy, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLocations = filteredAndSortedLocations.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, categoryFilter, locationFilter, websiteFilter, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm(""); setCategoryFilter("all"); setLocationFilter("all")
    setWebsiteFilter("all"); setSortBy("name"); setSortDirection("asc")
    setCurrentPage(1); toast.success("Filters cleared")
  }

  const hasActiveFilters = !!(searchTerm || categoryFilter !== "all" || locationFilter !== "all" || websiteFilter !== "all")

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else { setSortBy(option); setSortDirection("asc") }
  }

  const showBanner = hasInactive && isOverLimit && !locationChoiceMade
  const inactiveCount = locations.filter((l) => l.is_active === false).length
  const withWebsite = locations.filter((l) => l.websiteUri).length

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorRender error={error} />

  return (
    <TooltipProvider>

      <SlotInfoBanner
        slot="locations"
        resourceName="Locations"
        upgradeHref="/app/settings/billing"
      />

      <div className="min-h-screen">
        <div className="max-w-8xl mx-auto m:px-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Locations
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {locations.length > 0
                  ? `Managing ${locations.length} Google Business location${locations.length !== 1 ? "s" : ""}`
                  : "Manage your Google Business locations"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">


              <UsageGate slot="locations">
                <Button
                  asChild
                  variant="default"
                  className="h-8 rounded-full gap-1.5 text-sm font-medium"
                >
                  <Link href="/app/locations/add">
                    <Plus className="h-3.5 w-3.5" />
                    Add location
                  </Link>
                </Button>
              </UsageGate>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          {locations.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={locations.length} />
              <StatCard label="With website" value={withWebsite} />
              <StatCard label="Categories" value={filterOptions.categories.length} />
            </div>
          )}

          {/* ── Plan limit banner ── */}
          {showBanner && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/40 px-4 py-4">
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                  <span className="font-semibold">Plan limit reached</span>
                  {" — "}your Starter plan includes {planLimit} active location.{" "}
                  {inactiveCount} location{inactiveCount !== 1 ? "s are" : " is"} paused until you upgrade.
                </p>
                <div className="h-1 w-full rounded-full bg-red-200 dark:bg-red-900">
                  <div
                    className="h-1 rounded-full bg-red-500"
                    style={{ width: `${Math.min((planLimit / locations.length) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="shrink-0 h-9 rounded-xl border-red-300 text-red-800 hover:bg-red-100 dark:border-red-700 dark:text-red-300 font-medium"
              >
                <Link href="/app/locations/settings/billing">Upgrade plan ↗</Link>
              </Button>
            </div>
          )}

          {/* ── Search & Filters ── */}
          {paginatedLocations && paginatedLocations?.length !== 0 ? <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, category, or location…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-border bg-background text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen((v) => !v)}
                className={cn(
                  "h-11 px-4 rounded-xl gap-2 text-sm font-medium",
                  filtersOpen && ""
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </Button>
            </div>

            {filtersOpen && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-background">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-sm w-auto min-w-[140px] rounded-lg">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {filterOptions.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9 text-sm w-auto min-w-[140px] rounded-lg">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {filterOptions.locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                  <SelectTrigger className="h-9 text-sm w-auto min-w-[110px] rounded-lg">
                    <SelectValue placeholder="Website" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="with">Has website</SelectItem>
                    <SelectItem value="without">No website</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-sm text-muted-foreground rounded-lg">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            )}

            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground px-1">
                {filteredAndSortedLocations.length} result{filteredAndSortedLocations.length !== 1 ? "s" : ""}
                {searchTerm && <> for <span className="font-medium text-foreground">"{searchTerm}"</span></>}
              </p>
            )}
          </div> : null }
          

          {/* ── Location Cards ── */}
          <LocationCardList
            filteredAndSortedLocations={filteredAndSortedLocations}
            paginatedLocations={paginatedLocations}
            sortBy={sortBy}
            sortDirection={sortDirection}
            toggleSort={toggleSort}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            getPreferredLocality={getPreferredLocality}
          />

          {/* ── Pagination ── */}
          {filteredAndSortedLocations.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">

              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Showing
                <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground tabular-nums">
                  {startIndex + 1}–
                  {Math.min(
                    startIndex + itemsPerPage,
                    filteredAndSortedLocations.length
                  )}
                </span>
                of
                <span className="font-semibold text-foreground tabular-nums">
                  {filteredAndSortedLocations.length}
                </span>
                locations
              </p>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Per page</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="h-8 w-16 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((o) => <SelectItem key={o} value={o.toString()}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 w-8 p-0 rounded-lg" aria-label="First">
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0 rounded-lg" aria-label="Previous">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pg = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                      return (
                        <Button key={pg} variant={currentPage === pg ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pg)} className="h-8 w-8 p-0 text-xs rounded-lg">
                          {pg}
                        </Button>
                      )
                    })}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 w-8 p-0 rounded-lg" aria-label="Next">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 p-0 rounded-lg" aria-label="Last">
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Location Picker Modal ── */}
        <ChooseActiveLocation
          open={showPicker}
          locations={locations.map((l) => ({
            id: l.location_id ?? l.name,
            location_id: l.location_id ?? "",
            location_name: l.title || l.location_name || "Unknown",
            is_active: l.is_active ?? true,
          }))}
          limit={planLimit}
          onConfirm={async (selectedIds) => {
            await fetch("/api/gmb/locations/set-active", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ selectedIds }),
            })
            setShowPicker(false)
            router.refresh()
          }}
          onClose={() => setShowPicker(false)}
        />
      </div>
    </TooltipProvider>
  )
}