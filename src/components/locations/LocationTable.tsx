import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  SortAsc,
  SortDesc,
  MapPin,
  Eye,
  Wrench,
  Building2,
  Plus,
  RotateCcw,
  ChevronDown,
  Zap,
  FileText,
  BarChart3,
  TrendingUp,
  Share2,
  MessageSquare,
  MapPinned,
  Clock,
  Image,
} from "lucide-react";
import Link from "next/link";

interface Location {
  location_id?: string;
  name: string;
  title?: string;
  profile?: {
    description?: string;
  };
  categories?: {
    primaryCategory?: {
      displayName: string;
    };
  };
  websiteUri?: string;
}

interface LocationTableProps {
  filteredAndSortedLocations: Location[];
  paginatedLocations: Location[];
  sortBy: string;
  sortDirection: "asc" | "desc";
  toggleSort: (field: string) => void;
  hasActiveFilters: boolean | string;
  clearFilters: () => void;
  getPreferredLocality: (location: Location) => string;
}

const LocationTable: React.FC<LocationTableProps> = ({
  filteredAndSortedLocations,
  paginatedLocations,
  sortBy,
  sortDirection,
  toggleSort,
  hasActiveFilters,
  clearFilters,
  getPreferredLocality,
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (filteredAndSortedLocations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-16">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-50" />
          <h3 className="font-semibold text-xl mb-3">
            {hasActiveFilters ? "No matches found" : "No locations yet"}
          </h3>
          <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto">
            {hasActiveFilters
              ? "Your search didn't find any locations. Try adjusting your filters or search terms."
              : "You haven't added any business locations yet. Get started by adding your first location to manage it here."}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters & Try Again
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
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-[400px]">
              <SortButton
                field="name"
                label="Business Information"
                currentSort={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead className="w-[150px]">
              <SortButton
                field="category"
                label="Category"
                currentSort={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead className="w-[180px]">
              <SortButton
                field="location"
                label="Location"
                currentSort={sortBy}
                direction={sortDirection}
                onSort={toggleSort}
              />
            </TableHead>
            <TableHead className="w-[120px]">Website</TableHead>
            <TableHead className="w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedLocations.map((location) => (
            <React.Fragment key={location.location_id || location.name}>
              {/* Main Row */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="py-4">
                  <LocationInfoCell location={location} />
                </TableCell>
                <TableCell>
                  <CategoryBadge
                    category={
                      location.categories?.primaryCategory?.displayName ||
                      "Uncategorized"
                    }
                  />
                </TableCell>
                <TableCell>
                  <LocationCell
                    location={location}
                    getPreferredLocality={getPreferredLocality}
                  />
                </TableCell>
                <TableCell>
                  <WebsiteLink uri={location.websiteUri} />
                </TableCell>
                <TableCell>
                  <ActionButtons location={location} />
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// ============================================================================
// Sub-components for cleaner code
// ============================================================================

const SortButton: React.FC<{
  field: string;
  label: string;
  currentSort: string;
  direction: "asc" | "desc";
  onSort: (field: string) => void;
}> = ({ field, label, currentSort, direction, onSort }) => {
  const isActive = currentSort === field;

  return (
    <Button
      variant="ghost"
      onClick={() => onSort(field)}
      className="h-8 px-2 font-medium"
    >
      {label}
      {isActive && (
        <>
          {direction === "asc" ? (
            <SortAsc className="h-3 w-3 ml-1" />
          ) : (
            <SortDesc className="h-3 w-3 ml-1" />
          )}
        </>
      )}
    </Button>
  );
};

const LocationInfoCell: React.FC<{ location: Location }> = ({ location }) => {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-medium truncate max-w-[300px] cursor-pointer">
              {location.title || "Untitled Location"}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{location.title || "Untitled Location"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {location.profile?.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm text-muted-foreground truncate max-w-[350px] mt-1 cursor-pointer">
                {location.profile.description}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{location.profile.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const isUncategorized = category === "Uncategorized";

  return (
    <Badge variant={isUncategorized ? "outline" : "secondary"}>
      {category}
    </Badge>
  );
};

const LocationCell: React.FC<{
  location: Location;
  getPreferredLocality: (location: Location) => string;
}> = ({ location, getPreferredLocality }) => {
  const locality = getPreferredLocality(location) || "Not specified";
  const isLong = locality.length > 35;

  if (!isLong) {
    return (
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm capitalize truncate max-w-[180px]">
          {locality}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm capitalize truncate max-w-[180px]">
              {locality}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{locality}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const WebsiteLink: React.FC<{ uri?: string }> = ({ uri }) => {
  if (!uri) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <Button asChild variant="link" size="sm" className="h-auto p-0">
      <a href={uri} target="_blank" rel="noopener noreferrer">
        Visit
      </a>
    </Button>
  );
};

const ActionButtons: React.FC<{ location: Location }> = ({ location }) => {
  const locationSlug = location.name;

  return (
    <div className="flex items-center justify-start gap-2">
      {/* Primary Action: View Details */}
      <Link href={`/app/${locationSlug}`}>
        <Button variant="outline" size="sm" asChild>
          <span>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Details
          </span>
        </Button>
      </Link>

      {/* Secondary Action: Manage */}
      <Link href={`/app/${locationSlug}/manage`}>
        <Button variant="default" size="sm" asChild>
          <span>
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            Manage
          </span>
        </Button>
      </Link>

      {/* Quick Navigation Dropdown */}
      <QuickNavDropdown locationSlug={locationSlug} />
    </div>
  );
};

const QuickNavDropdown: React.FC<{ locationSlug: string }> = ({
  locationSlug,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          More
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Details Page Quick Links */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          View
        </div>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}#overview`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Overview</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}#reviews`} className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Reviews</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}#hours`} className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Hours</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}#media`} className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span>Media</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}#location-map`} className="flex items-center gap-2">
            <MapPinned className="h-4 w-4" />
            <span>Location Map</span>
          </Link>
        </DropdownMenuItem>

        <div className="h-px bg-border my-2" />

        {/* Manage Page Quick Links */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Manage
        </div>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#tasks`} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Tasks</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#keywords`} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Keywords</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#analytics`} className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#competitor-insights`} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Competitor Insights</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#social-posts`} className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span>Social Posts</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/app/${locationSlug}/manage#customer-reviews`} className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Customer Reviews</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LocationTable;