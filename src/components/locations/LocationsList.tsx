"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
} from "lucide-react"
import stringSimilarity from "string-similarity"
import { toast } from "react-hot-toast"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "../Error"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import LocationTable from "./LocationTable"
import { UsageGate } from "../usage-gate"
import { SlotBadge } from "../slot-badge"
import { ChooseActiveLocation } from "./ChooseActiveLocation"
import { usePlanLimits } from "@/lib/use-plan-limits"
import { useRouter } from "next/navigation"

type Location = {
  id?: string
  name: string
  title: string
  formattedAddress: string
  profile?: {
    description?: string
  }
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

const getPreferredLocality = (loc: Location) => {
  return loc.formattedAddress || loc.storefrontAddress?.locality || loc.storefrontAddress?.addressLines?.join(", ") || "";
};

export default function LocationsTable() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationChoiceMade, setLocationChoiceMade] = useState<boolean>(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  const [websiteFilter, setWebsiteFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const limits = usePlanLimits()
  const planLimit = limits?.locations ?? 1
  const [showPicker, setShowPicker] = useState(false)
  const hasInactive = locations.some(l => l.is_active === false)
  const isOverLimit = locations.length > planLimit


  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

  const router = useRouter();

  const fetchLocations = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!accountId || !accessToken) {
        setError("Missing credentials in DB.")
        setLoading(false)
        return
      }

      const res = await fetch(`/api/gmb/locations?account_id=${accountId}&accessToken=${accessToken}`, {
        headers: {
          Authorization: accessToken,
        },
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to fetch locations.")
      }

      const data = await res.json()
      setLocationChoiceMade(data.locationChoiceMade);
      setLocations(data.accounts || [])

    } catch (err: any) {
      setError(err.message || "Error loading locations.")
      toast.error(err.message || "Error loading locations.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  const filterOptions = useMemo(() => {
    const normalize = (str?: string) =>
      str
        ?.replace(/\s+/g, " ")
        ?.replace(/[^\w\s]/g, "")
        ?.trim()
        ?.toLowerCase()

    const dedupeFuzzy = (list: string[]) => {
      const result: string[] = []
      list.forEach((item) => {
        const norm = normalize(item)
        const isDuplicate = result.some((existing) => {
          return stringSimilarity.compareTwoStrings(normalize(existing), norm) > 0.85
        })
        if (!isDuplicate) result.push(item)
      })
      return result
    }

    const categories = dedupeFuzzy(
      locations
        .map((loc) => loc.categories?.primaryCategory?.displayName)
        .filter((name): name is string => Boolean(name))
        .sort(),
    )

    const locationsList = dedupeFuzzy(
      locations
        .map((loc) => getPreferredLocality(loc))
        .filter((locality): locality is string => Boolean(locality))
        .sort(),
    )

    return { categories, locations: locationsList }
  }, [locations])

  const filteredAndSortedLocations = useMemo(() => {
    const filtered = locations.filter((location) => {
      const matchesSearch =
        !searchTerm ||
        location.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.profile?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.categories?.primaryCategory?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || location.categories?.primaryCategory?.displayName === categoryFilter

      const capitalizedLocationName = getPreferredLocality(location)
      const matchesLocation = locationFilter === "all" || capitalizedLocationName === locationFilter

      const matchesWebsite =
        websiteFilter === "all" ||
        (websiteFilter === "with" && location.websiteUri) ||
        (websiteFilter === "without" && !location.websiteUri)

      return matchesSearch && matchesCategory && matchesLocation && matchesWebsite
    })

    filtered.sort((a, b) => {
      let aValue = ""
      let bValue = ""

      switch (sortBy) {
        case "name":
          aValue = a.title || ""
          bValue = b.title || ""
          break
        case "category":
          aValue = a.categories?.primaryCategory?.displayName || ""
          bValue = b.categories?.primaryCategory?.displayName || ""
          break
        case "location":
          aValue = getPreferredLocality(a)
          bValue = getPreferredLocality(b)
          break
        case "website":
          aValue = a.websiteUri ? "with" : "without"
          bValue = b.websiteUri ? "with" : "without"
          break
      }

      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [locations, searchTerm, categoryFilter, locationFilter, websiteFilter, sortBy, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedLocations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLocations = filteredAndSortedLocations.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, locationFilter, websiteFilter, itemsPerPage])

  const clearFilters = () => {
    setSearchTerm("")
    setCategoryFilter("all")
    setLocationFilter("all")
    setWebsiteFilter("all")
    setSortBy("name")
    setSortDirection("asc")
    setCurrentPage(1)
    toast.success("All filters cleared")
  }

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || locationFilter !== "all" || websiteFilter !== "all"

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(option)
      setSortDirection("asc")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-11 w-36" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-5 w-24" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return <ErrorRender error={"We couldn't load this content. You can retry or report the issue."} />
  }

  const needsChoice = locations.some(l => l.is_active === false)
  const showBanner = hasInactive && isOverLimit && !locationChoiceMade

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background px-6">
        <div className="mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
              <p className="text-muted-foreground mt-1">
                Manage {locations.length > 0 ? `your ${locations.length}` : "your"} Google Business locations
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SlotBadge slot="locations" label="Locations" />
              <UsageGate slot="locations">
                <Button asChild size="sm">
                  <Link href="/app/locations/add">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Link>
                </Button>
              </UsageGate>

            </div>
          </div>

          {/* Stats Row */}
          {locations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Locations</p>
                <p className="text-2xl font-bold mt-1">{locations.length}</p>
              </div>
              {locations.filter((loc) => loc.websiteUri).length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">With Website</p>
                  <p className="text-2xl font-bold mt-1">{locations.filter((loc) => loc.websiteUri).length}</p>
                </div>
              )}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Categories</p>
                <p className="text-2xl font-bold mt-1">{filterOptions.categories.length}</p>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {/* Primary Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations by name, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-sm"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 text-sm w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-10 text-sm w-[160px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {filterOptions.locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                <SelectTrigger className="h-10 text-sm w-[160px]">
                  <SelectValue placeholder="Website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with">Has Website</SelectItem>
                  <SelectItem value="without">No Website</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10 text-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  Reset
                </Button>
              )}
            </div>

          </div>

          {showBanner && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800 dark:text-amber-400">
                  <span className="font-medium">{locations.filter(l => l.is_active === false).length} location{locations.filter(l => l.is_active === false).length > 1 ? "s" : ""} inactive</span>
                  {" "}— your plan allows {planLimit}. Choose which to keep active.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => setShowPicker(true)}
              >
                Manage
              </Button>
            </div>
          )}

          <ChooseActiveLocation
            open={showPicker}
            locations={locations.map(l => ({
              id: l.location_id ?? l.name,
              location_id: l.location_id ?? "",
              location_name: l.title || l.location_name || "Unknown",
              is_active: l.is_active ?? true
            }))}
            limit={planLimit}
            onConfirm={async (selectedIds) => {
              await fetch("/api/gmb/locations/set-active", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedIds })
              })
              setShowPicker(false)
              router.refresh()
            }}
            onClose={() => setShowPicker(false)}
          />


          {/* Table Section */}
          <LocationTable
            filteredAndSortedLocations={filteredAndSortedLocations}
            paginatedLocations={paginatedLocations}
            sortBy={sortBy}
            sortDirection={sortDirection}
            toggleSort={toggleSort}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            getPreferredLocality={getPreferredLocality}
          />

          {/* Pagination Section */}
          {filteredAndSortedLocations.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {startIndex + 1}–{Math.min(endIndex, filteredAndSortedLocations.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {filteredAndSortedLocations.length}
                </span>{" "}
                locations
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="h-9 w-16 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-0.5 mx-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber
                        if (totalPages <= 5) {
                          pageNumber = i + 1
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i
                        } else {
                          pageNumber = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            className="h-9 w-9 p-0 text-xs"
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  )
}
