"use client"

import { useState, useCallback, useMemo, memo } from "react"
import { AdvancedMarker, Map } from "@vis.gl/react-google-maps"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MapPin, Trophy, Star, X, TrendingUp,
  Eye, BarChart2, ChevronRight, Navigation2,
  AlertCircle, Building2
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GridPoint {
  lat: number
  lng: number
  index: number
}

interface SearchResult {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  types?: string[]
}

interface RankingData {
  gridPoint: GridPoint
  rank: number
  businessFound: boolean
  detectedBusinessName?: string
  matchDetails?: string
  results?: SearchResult[]
}

interface Summary {
  averageRank: number
  bestRank: number
  worstRank: number
  visibilityPercentage: number
  topRankings: number
  goodRankings: number
  poorRankings: number
  notFound: number
  totalGridPoints: number
}

interface GridRankingMapProps {
  data?: {
    center?: { lat: number; lng: number }
    gridSize?: string
    distance?: string
    businessPlaceId?: string
    keyword?: string
    businessName?: string
    rankings?: RankingData[]
    summary?: Summary
  }
  mapKey: number
  zoomLevel: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ZOOM_MAP: Record<string, number> = {
  "Close Zoom": 16,
  "Medium Zoom": 14,
  "Far Zoom": 12,
  "Default Zoom Level": 14,
}

function getRankColor(rank: number | null | undefined): string {
  if (rank == null || rank >= 20) return "#ef4444"
  if (rank <= 3) return "#10b981"
  if (rank <= 7) return "#f59e0b"
  if (rank <= 10) return "#f97316"
  return "#ef4444"
}

function getRankLabel(rank: number): string {
  if (rank <= 0) return "Invalid"
  if (rank <= 3) return "Excellent"
  if (rank <= 7) return "Good"
  if (rank <= 10) return "Fair"
  if (rank <= 20) return "Poor"
  return "Not Found"
}

function calcSOV(summary?: Summary): string {
  if (!summary || !summary.totalGridPoints) return "—"
  return ((summary.topRankings / summary.totalGridPoints) * 100).toFixed(0) + "%"
}

function calcAR(summary?: Summary): string {
  if (!summary || !summary.averageRank) return "—"
  return summary.averageRank.toFixed(1)
}

// ─── Grid Marker ─────────────────────────────────────────────────────────────
// Memoized: only re-renders when its own ranking/selected state actually changes,
// not when sibling markers or unrelated parent state changes.

const GridMarker = memo(function GridMarker({
  ranking,
  isSelected,
  onClick,
}: {
  ranking: RankingData
  isSelected: boolean
  onClick: () => void
}) {
  const rank = ranking.businessFound ? ranking.rank : 20
  const color = getRankColor(ranking.businessFound ? ranking.rank : null)
  const display = rank >= 20 ? "20+" : rank

  return (
    <div className="relative cursor-pointer select-none" onClick={onClick} style={{ willChange: 'transform' }}>
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold",
          isSelected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-black/10" : "hover:scale-110"
        )}
        style={{
          backgroundColor: color,
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        }}
      >
        {display}
      </div>
    </div>
  )
})

// ─── Stat row inside panel ────────────────────────────────────────────────────

const StatCell = memo(function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center py-3 gap-0.5">
      <span className={cn("text-base font-bold tabular-nums", color ?? "text-foreground")}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
})

// ─── Result row (extracted + memoized so the results list doesn't re-render
//      every row when only `selected` itself changes identity) ────────────────

const ResultRow = memo(function ResultRow({
  result,
  rank,
  isTarget,
}: {
  result: SearchResult
  rank: number
  isTarget: boolean
}) {
  return (
    <div
      className={cn(
        "px-4 py-2.5 transition-colors",
        isTarget ? "bg-primary/5" : "hover:bg-muted/30",
        isTarget && "border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank */}
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: getRankColor(rank) }}
        >
          {rank >= 20 ? "20+" : rank}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">
              {result.displayName?.text ?? "Unknown"}
              {isTarget && (
                <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  Your Business
                </span>
              )}
            </p>

            {result.rating && (
              <div className="shrink-0 flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{result.rating.toFixed(1)}</span>
                {result.userRatingCount && (
                  <span className="text-muted-foreground">
                    ({result.userRatingCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {result.formattedAddress && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{result.formattedAddress}</span>
            </p>
          )}

          {(result.businessStatus || result.types?.length) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {result.businessStatus && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                  {result.businessStatus.toLowerCase().replace(/_/g, " ")}
                </Badge>
              )}
              {result.types?.slice(0, 2).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                  {t.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GridRankingMap({ data, mapKey, zoomLevel }: GridRankingMapProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const rankings = data?.rankings ?? []
  const hasPoints = rankings.length > 0
  const summary = data?.summary
  const TARGET_ID = data?.businessPlaceId

  // Derive the selected ranking from the index + current rankings array,
  // instead of storing the whole object — avoids stale references and
  // lets us key marker callbacks off a stable primitive (the index).
  const selected = useMemo(
    () => (selectedIndex != null ? rankings.find(r => r.gridPoint.index === selectedIndex) ?? null : null),
    [selectedIndex, rankings]
  )

  // ONE stable callback shared by all markers. We pass the grid point's own
  // index as an argument from the DOM event instead of creating a new closure
  // per marker per render.
  const handleMarkerClick = useCallback((index: number) => {
    setSelectedIndex(index)
    setPanelOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedIndex(null)
    setPanelOpen(false)
  }, [])

  const sov = useMemo(() => calcSOV(summary), [summary])
  const ar = useMemo(() => calcAR(summary), [summary])

  return (
    <div className="relative flex h-full w-full overflow-hidden">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-w-0">
        <Map
          key={mapKey}
          defaultCenter={data?.center ?? { lat: 37.7749, lng: -122.4194 }}
          defaultZoom={ZOOM_MAP[zoomLevel] ?? 14}
          mapId="grid-ranking-map"
          className="w-full h-full"
          clickableIcons={false}
        >
          {rankings.map((r) => (
            <AdvancedMarker
              key={r.gridPoint.index}
              position={{ lat: r.gridPoint.lat, lng: r.gridPoint.lng }}
            >
              <GridMarker
                ranking={r}
                isSelected={selectedIndex === r.gridPoint.index}
                onClick={() => handleMarkerClick(r.gridPoint.index)}
              />
            </AdvancedMarker>
          ))}
        </Map>

        {hasPoints && (
          <div className="absolute top-18 left-2 z-10">
            <div className="flex items-center gap-2 bg-card/90 backdrop-blur border border-border/50 rounded-lg px-2 py-1 text-xs shadow">
              <span className="text-violet-600 font-semibold tabular-nums">
                SOV {sov}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-blue-600 font-semibold tabular-nums">
                AR #{ar}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2.5 shadow-lg space-y-1.5">
            {[
              { color: "#10b981", label: "#1–3  Excellent" },
              { color: "#f59e0b", label: "#4–7  Good" },
              { color: "#f97316", label: "#8–10  Fair" },
              { color: "#ef4444", label: "20+  Not found" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Click hint */}
        {hasPoints && !panelOpen && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2 shadow-lg text-xs text-muted-foreground">
              <Navigation2 className="w-3.5 h-3.5" />
              Click a marker to see details
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ──────────────────────────────────────────────────── */}
      {hasPoints && panelOpen && selected && (
        <div className="w-80 shrink-0 flex flex-col bg-card border-l border-border overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-muted/20">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-semibold text-sm">Grid Point {(selected.gridPoint?.index ?? 0) + 1}</span>
                <span
                  className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: getRankColor(selected.businessFound ? selected.rank : null) }}
                >
                  {selected.businessFound ? getRankLabel(selected.rank) : "Not Found"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {selected.gridPoint?.lat?.toFixed(5)}, {selected.gridPoint?.lng?.toFixed(5)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Grid Point Header */}
          <div className="border-b border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Point #{selected.gridPoint.index + 1}
              </span>
              <span className="text-muted-foreground">
                {selected.gridPoint.lat.toFixed(4)}, {selected.gridPoint.lng.toFixed(4)}
              </span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 divide-x divide-border mt-2 text-xs">
              <StatCell
                label="Here"
                value={selected.businessFound ? `#${selected.rank}` : "—"}
                color={selected.businessFound ? undefined : "text-muted-foreground"}
              />
              <StatCell label="Best" value={summary?.bestRank ? `#${summary.bestRank}` : "—"} color="text-emerald-600" />
              <StatCell label="SOV" value={sov} color="text-violet-600" />
              <StatCell
                label="Visible"
                value={summary?.visibilityPercentage != null ? `${summary.visibilityPercentage}%` : "—"}
                color="text-blue-600"
              />
            </div>
          </div>

          {/* Results list - scrollable */}
          <div className="divide-y divide-border/50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 310px)' }}>
            {selected.results && selected.results.length > 0 ? (
              selected.results.map((result, i) => {
                const rank = i + 1
                const isTarget =
                  result.id === TARGET_ID ||
                  (selected.detectedBusinessName &&
                    result.displayName?.text
                      ?.toLowerCase()
                      .includes(selected.detectedBusinessName.toLowerCase()))

                return (
                  <ResultRow
                    key={result.id}
                    result={result}
                    rank={rank}
                    isTarget={!!isTarget}
                  />
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  No businesses found at this grid location
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}