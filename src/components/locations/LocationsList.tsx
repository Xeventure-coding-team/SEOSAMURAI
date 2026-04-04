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
  MapPin,
  Globe,
  Building2,
  SortAsc,
  SortDesc,
  Filter,
  X,
  Eye,
  ExternalLink,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  Wrench,
} from "lucide-react"
import stringSimilarity from "string-similarity"
import { toast } from "react-hot-toast"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "../Error"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import LocationTable from "./LocationTable"

type Location = {
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
}

type SortOption = "name" | "category" | "location" | "website"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const getPreferredLocality = (loc: Location) => {
  return loc.formattedAddress || loc.storefrontAddress?.locality || loc.storefrontAddress?.addressLines?.join(", ") || ""
    // loc.formattedAddress || loc.storefrontAddress?.addressLines?.join(", ") || ""
    ;
};

export default function LocationsTable() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")

  const [websiteFilter, setWebsiteFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showFilters, setShowFilters] = useState(false)

  const accountId = useGMBStore((state) => state.accountId)
  const accessToken = useGMBStore((state) => state.accessToken)

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

  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Your Business Locations</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Manage all your Google Business locations in one place. View details, track performance, and keep your
              business information up to date.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{locations.length} locations connected</span>
              </div>
              {locations.filter((loc) => loc.websiteUri).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>{locations.filter((loc) => loc.websiteUri).length} with websites</span>
                </div>
              )}
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/app/locations/add">
              <Plus className="h-5 w-5 mr-2" />
              Add New Location
            </Link>
          </Button>
        </div>

        <Card className="gap-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search & Filter Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Search and Filters Row */}
            <div className="flex gap-3 items-end">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business name, category, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="All Categories" />
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
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="All Locations" />
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
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9 px-3">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Results Summary and Pagination Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {startIndex + 1}-{Math.min(endIndex, filteredAndSortedLocations.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredAndSortedLocations.length}
              </span>{" "}
              locations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="h-9 w-20">
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
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>

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

        {totalPages > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>

                <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-1">
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
                          className="h-9 w-9 p-0"
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
