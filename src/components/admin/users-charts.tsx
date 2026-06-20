"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Area, AreaChart, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Activity, Shield, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface User {
  id: string
  signed_up_at_millis: number
  last_active_at_millis: number
  is_restricted: boolean
  is_anonymous: boolean
  primary_email_verified: boolean
  country_code?: string
  primary_email?: string
}

interface UsersChartsProps {
  users: User[]
}

export function UsersCharts({ users }: UsersChartsProps) {
  if (!users || users.length === 0) {
    return null
  }

  const processSignupsOverTime = () => {
    const signupsByMonth: Record<string, number> = {}

    users.forEach((user) => {
      const date = new Date(user.signed_up_at_millis)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      signupsByMonth[monthKey] = (signupsByMonth[monthKey] || 0) + 1
    })

    return Object.entries(signupsByMonth)
      .map(([key, count]) => ({
        month: key,
        monthName: new Date(key + "-01").toLocaleDateString("default", { month: "short", year: "2-digit" }),
        signups: count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
  }

  const processActivityData = () => {
    const last30Days: Record<string, number> = {}
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    users.forEach((user) => {
      if (user.last_active_at_millis > thirtyDaysAgo) {
        const date = new Date(user.last_active_at_millis)
        const dayKey = date.toISOString().split("T")[0]
        last30Days[dayKey] = (last30Days[dayKey] || 0) + 1
      }
    })

    const result = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dayKey = date.toISOString().split("T")[0]
      result.push({
        date: dayKey,
        dateLabel: date.toLocaleDateString("default", { month: "short", day: "numeric" }),
        active: last30Days[dayKey] || 0,
      })
    }

    return result
  }

  const processStatusDistribution = () => {
    const active = users.filter((u) => !u.is_restricted && !u.is_anonymous).length
    const banned = users.filter((u) => u.is_restricted).length
    const anonymous = users.filter((u) => u.is_anonymous).length

    return [
      { name: "Active", value: active, fill: "var(--color-chart-1)" },
      { name: "Banned", value: banned, fill: "var(--color-chart-2)" },
      { name: "Anonymous", value: anonymous, fill: "var(--color-chart-3)" },
    ].filter((item) => item.value > 0)
  }

  const processVerificationRate = () => {
    const verified = users.filter((u) => u.primary_email_verified).length
    const unverified = users.filter((u) => !u.primary_email_verified && u.primary_email).length
    const noEmail = users.filter((u) => !u.primary_email).length

    return [
      { name: "Verified", value: verified, fill: "var(--color-chart-1)" },
      { name: "Unverified", value: unverified, fill: "var(--color-chart-2)" },
      { name: "No email", value: noEmail, fill: "var(--color-chart-3)" },
    ].filter((item) => item.value > 0)
  }

  const signupsTrend = processSignupsOverTime()
  const activityData = processActivityData()
  const statusData = processStatusDistribution()
  const verificationData = processVerificationRate()

  const chartConfig = {
    signups: {
      label: "Signups",
      color: "var(--color-chart-1)",
    },
    active: {
      label: "Active Users",
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-6 mt-8">

      {/* User Growth */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <div>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New signups over the last 12 months</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={signupsTrend}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="monthName"
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

              <Bar
                dataKey="signups"
                fill="var(--color-signups)"
                radius={8}
                barSize={40}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <div>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Daily active users over the last 30 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-active)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-active)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} interval={6} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="active" stroke="var(--color-active)" fill="url(#colorActive)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <div>
                  <CardTitle>User Status</CardTitle>
                  <CardDescription>Distribution of user accounts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Verification */}
        {verificationData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <div>
                  <CardTitle>Email Verification</CardTitle>
                  <CardDescription>Verified vs unverified emails</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {verificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                {verificationData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
