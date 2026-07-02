"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface PostStatusData {
  pending: number
  published: number
  failed: number
}

export function PostStatusChart({ data }: { data: PostStatusData }) {
  const chartData = [
    { name: "Pending", value: data.pending, color: "var(--chart-1)" },
    { name: "Published", value: data.published, color: "var(--chart-2)" },
    { name: "Failed", value: data.failed, color: "var(--chart-3)" },
  ].filter(item => item.value > 0)

  if (!chartData.length) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No post data available</p>
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <ChartContainer
        config={{
          pending: { label: "Pending", color: "var(--chart-1)" },
          published: { label: "Published", color: "var(--chart-2)" },
          failed: { label: "Failed", color: "var(--chart-3)" },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
            <Tooltip 
              formatter={(value: number) => [`${value} posts`, "Count"]}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
