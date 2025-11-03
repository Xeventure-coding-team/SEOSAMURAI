"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
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
  return loc.formattedAddress || loc.storefrontAddress?.addressLines?.join(", ") || "";
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by business name, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 text-base"
              />
            </div>

            {/* Filter Toggle and Active Filters */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-10">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </Button>

              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <>
                    <Badge variant="secondary" className="px-3 py-1">
                      {
                        [
                          searchTerm,
                          categoryFilter !== "all" ? categoryFilter : null,
                          locationFilter !== "all" ? locationFilter : null,
                          websiteFilter !== "all" ? websiteFilter : null,
                        ].filter(Boolean).length
                      }{" "}
                      filters active
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </div>

 {/* Advanced Filters */}
{showFilters && (
  <div className="grid gap-4 md:grid-cols-3 p-6 bg-muted/30 rounded-lg border">
    <div className="space-y-2">
      <label className="text-sm font-medium">Business Category</label>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="h-10 mt-2 w-full">
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

    <div className="space-y-2">
      <label className="text-sm font-medium">Location</label>
      <Select value={locationFilter} onValueChange={setLocationFilter}>
        <SelectTrigger className="h-10 mt-2 w-full">
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
  </div>
)}


          </CardContent>
        </Card>

        {/* Results Summary and Pagination Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium">
              Showing{" "}
              <span className="text-primary">
                {startIndex + 1}-{Math.min(endIndex, filteredAndSortedLocations.length)}
              </span>{" "}
              of <span className="text-primary">{filteredAndSortedLocations.length}</span> locations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Show:</span>
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

        {/* Data Table */}
        {filteredAndSortedLocations.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[350px] py-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("name")}
                      className="h-auto p-2 font-semibold text-left justify-start"
                    >
                      Business Information
                      {sortBy === "name" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="h-4 w-4 ml-2" />
                        ) : (
                          <SortDesc className="h-4 w-4 ml-2" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead className="py-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("category")}
                      className="h-auto p-2 font-semibold text-left justify-start"
                    >
                      Category
                      {sortBy === "category" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="h-4 w-4 ml-2" />
                        ) : (
                          <SortDesc className="h-4 w-4 ml-2" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead className="py-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("location")}
                      className="h-auto p-2 font-semibold text-left justify-start"
                    >
                      Location
                      {sortBy === "location" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="h-4 w-4 ml-2" />
                        ) : (
                          <SortDesc className="h-4 w-4 ml-2" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead className="py-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort("website")}
                      className="h-auto p-2 font-semibold text-left justify-start"
                    >
                      Website
                      {sortBy === "website" &&
                        (sortDirection === "asc" ? (
                          <SortAsc className="h-4 w-4 ml-2" />
                        ) : (
                          <SortDesc className="h-4 w-4 ml-2" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center py-4 font-semibold">Actions</TableHead>
                  <TableHead className="text-center py-4 font-semibold"></TableHead>
                  <TableHead className="text-center py-4 font-semibold"></TableHead>
                  <TableHead className="text-center py-4 font-semibold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {paginatedLocations.map((location) => (
                  <TableRow key={location.location_id || location.name} className="hover:bg-muted/30">

                    <TableCell className="py-6">
                      <div className="space-y-2">
                        <div className="font-semibold">{location.title || "Untitled Location"}</div>

                        {location.profile?.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-[320px] leading-relaxed">
                            {location.profile.description}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-6">
                      {location.categories?.primaryCategory?.displayName ? (
                        <Badge variant="secondary" className="px-3 py-1">
                          {location.categories.primaryCategory.displayName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="px-3 py-1">
                          Uncategorized
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-6">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="capitalize break-words whitespace-pre-line">
                          {getPreferredLocality(location) || "Location not specified"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-6">
                      {location.websiteUri ? (
                        <Button asChild variant="outline" size="sm" className="bg-transparent">
                          <a
                            href={location.websiteUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Globe className="h-4 w-4" />
                            <span>Visit Website</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4" />
                          <span>No website</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/app/${location.name}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </TableCell>

                    <TableCell className="py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/app/${location.name}/manage`}>
                          <Button variant="outline" size="sm">
                            <Wrench className="h-4 w-4 mr-2" />
                            Manage Location
                          </Button>
                        </Link>
                      </div>
                    </TableCell>

                    <TableCell className="py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/app/${location.name}/manage?active=posts`}>
                          <Button variant="ghost" size="sm">
                            Manage Posts
                          </Button>
                        </Link>
                      </div>
                    </TableCell>

                    <TableCell className="py-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/app/${location.name}/manage?active=reviews`}>
                          <Button variant="ghost" size="sm">
                            Manage Reviews
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Enhanced empty state with better messaging and clearer actions */
          <Card className="border-dashed border-2">
            <CardContent className="text-center py-16 space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-xl">
                  {hasActiveFilters ? "No locations match your filters" : "No locations found"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting your search terms or filters to find the locations you're looking for."
                    : "Get started by connecting your first Google Business location to begin managing your online presence."}
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters} size="lg">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link href="/app/locations/add">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Location
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
