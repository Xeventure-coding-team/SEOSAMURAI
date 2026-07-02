"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface KeywordEntry {
  keyword: string
  rank: number | null
  rankChangeValue: number
  location: string
}

export function KeywordsPerformanceChart({ keywords }: { keywords: KeywordEntry[] }) {
  const chartData = useMemo(() => {
    // Show top 10 keywords by rank
    const ranked = keywords
      .filter(k => k.rank && k.rank !== null)
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, 10)

    if (!ranked.length) {
      return [{ keyword: "No Data", rank: 0 }]
    }

    return ranked.map(k => ({
      keyword: k.keyword.substring(0, 12) + (k.keyword.length > 12 ? "..." : ""),
      rank: k.rank || 0,
      fullKeyword: k.keyword,
    }))
  }, [keywords])

  if (chartData[0]?.keyword === "No Data") {
    return (
      <div className="w-full h-80 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No ranking data available</p>
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <ChartContainer
        config={{
          rank: { label: "Rank", color: "var(--chart-1)" },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="keyword" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={["dataMin - 1", "dataMax + 1"]}
              label={{ value: "Rank (lower is better)", angle: -90, position: "insideLeft" }}
              reversed
            />
            <Tooltip
              formatter={(value: number) => [`Rank #${value}`, "Position"]}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
              labelFormatter={(label) => `Keyword: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="rank" 
              stroke="var(--color-rank)"
              strokeWidth={2}
              dot={{ fill: "var(--color-rank)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
