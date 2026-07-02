"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"

interface RankingData {
  keyword: string
  rank: number | null
  location: string
}

interface ChartData {
  name: string
  top3: number
  top10: number
  outside: number
}

export function RankingTrendChart({ keywords }: { keywords: RankingData[] }) {
  const data = useMemo(() => {
    if (!keywords.length) {
      return [{ name: "No Data", top3: 0, top10: 0, outside: 0 }]
    }

    const top3Count = keywords.filter(k => k.rank && k.rank <= 3).length
    const top10Count = keywords.filter(k => k.rank && k.rank > 3 && k.rank <= 10).length
    const outsideCount = keywords.filter(k => !k.rank || k.rank > 10).length

    return [
      {
        name: "Rankings",
        top3: top3Count,
        top10: top10Count,
        outside: outsideCount,
      },
    ]
  }, [keywords])

  return (
    <div className="w-full h-80">
      <ChartContainer
        config={{
          top3: {
            label: "Top 3",
            color: "var(--chart-1)",
          },
          top10: {
            label: "Top 4-10",
            color: "var(--chart-2)",
          },
          outside: {
            label: "Outside Top 10",
            color: "var(--chart-3)",
          },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="top3" fill="var(--color-top3)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="top10" fill="var(--color-top10)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="outside" fill="var(--color-outside)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
