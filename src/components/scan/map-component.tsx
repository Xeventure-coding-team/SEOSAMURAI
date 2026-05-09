"use client"

import { useState, useCallback } from "react"
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
  if (rank <= 3) return "Excellent"
  if (rank <= 7) return "Good"
  if (rank <= 10) return "Fair"
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

function GridMarker({
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
    <div className="relative cursor-pointer select-none" onClick={onClick}>
      <div
        className={cn(
          "w-10 h-10 rounded-full border-2 shadow-md flex items-center justify-center text-white text-[11px] font-bold transition-all duration-150",
          isSelected
            ? "scale-125 border-white ring-4 ring-white/40 ring-offset-1"
            : "hover:scale-110 border-white/60"
        )}
        style={{ backgroundColor: color }}
      >
        {display}
      </div>
      {rank <= 3 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-black">★</span>
      )}
      {rank >= 20 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-600 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white">×</span>
      )}
    </div>
  )
}

// ─── Stat row inside panel ────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center py-3 gap-0.5">
      <span className={cn("text-base font-bold tabular-nums", color ?? "text-foreground")}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GridRankingMap({ data, mapKey, zoomLevel }: GridRankingMapProps) {
  const [selected, setSelected] = useState<RankingData | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const rankings = data?.rankings ?? []
  const hasPoints = rankings.length > 0
  const summary = data?.summary
  const TARGET_ID = data?.businessPlaceId

  const handleMarkerClick = useCallback((ranking: RankingData) => {
    setSelected(ranking)
    setPanelOpen(true)
  }, [])

  const handleClose = () => {
    setSelected(null)
    setPanelOpen(false)
  }

  const sov = calcSOV(summary)
  const ar = calcAR(summary)

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
                isSelected={selected?.gridPoint?.index === r.gridPoint?.index}
                onClick={() => handleMarkerClick(r)}
              />
            </AdvancedMarker>
          ))}
        </Map>

        {hasPoints && (
          <div className="absolute top-18 left-2  z-10">
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
        <div className="absolute bottom-3 left-3 z-10">
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
          {selected && (
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
          )}

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {selected.results && selected.results.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 z-10">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Search Results
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {selected.results.length} found
                  </Badge>
                </div>

                <div className="divide-y divide-border/60">
                  {selected.results.map((result, i) => {
                    const isTarget =
                      result.id === TARGET_ID ||
                      (selected.detectedBusinessName &&
                        result.displayName?.text
                          ?.toLowerCase()
                          .includes(selected.detectedBusinessName.toLowerCase()))

                    return (
                      <div
                        key={result.id}
                        className={cn(
                          "px-4 py-3 transition-colors",
                          isTarget ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Rank bubble */}
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold text-white shrink-0 shadow-sm mt-0.5"
                            style={{ backgroundColor: getRankColor(i + 1) }}
                          >
                            {i + 1 >= 20 ? "20+" : i + 1}
                          </span>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold leading-snug break-words">
                                {result.displayName?.text ?? "Unknown"}
                                {isTarget && (
                                  <span className="ml-1.5 text-[10px] font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                    Your Business
                                  </span>
                                )}
                              </p>
                              {result.rating && (
                                <div className="shrink-0 flex items-center gap-0.5 text-[11px] font-medium">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <span>{result.rating}</span>
                                  {result.userRatingCount && (
                                    <span className="text-muted-foreground">({result.userRatingCount})</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {result.formattedAddress && (
                              <p className="text-[11px] text-muted-foreground flex items-start gap-1 leading-snug">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="break-words">{result.formattedAddress}</span>
                              </p>
                            )}

                            {(result.businessStatus || result.types?.length) && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {result.businessStatus && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                    {result.businessStatus.toLowerCase().replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {result.types?.slice(0, 2).map((t) => (
                                  <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">
                                    {t.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <AlertCircle className="w-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-sm mb-1">No results for this point</p>
                <p className="text-xs text-muted-foreground">No businesses were found at this grid location.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}