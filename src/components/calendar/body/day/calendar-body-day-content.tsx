import { useCalendarContext } from '../../calendar-context'
import { isSameDay, format, getHours, getMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarBodyHeader from '../calendar-body-header'
import CalendarEvent from '../../calendar-event'

const hours = Array.from({ length: 24 }, (_, i) => i)

// 🔥 Detect overlaps properly
const getEventLayout = (events: any[]) => {
  const sorted = [...events].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )

  const layouts: any[] = []

  sorted.forEach((event) => {
    const start = new Date(event.scheduledAt).getTime()
    const end = start + (event.duration || 60) * 60000

    // Find overlapping events
    const overlapping = layouts.filter((l) => {
      return start < l.end && end > l.start
    })

    // Find available column
    let column = 0
    while (overlapping.some((o) => o.column === column)) {
      column++
    }

    layouts.push({
      event,
      start,
      end,
      column,
      group: overlapping,
    })
  })

  // 🔥 Calculate max columns per group
  layouts.forEach((layout) => {
    const group = layouts.filter(
      (l) =>
        layout.start < l.end &&
        layout.end > l.start
    )

    const maxColumn = Math.max(...group.map((g) => g.column))
    layout.totalColumns = maxColumn + 1
  })

  return layouts
}

export default function CalendarBodyDayContent({ date }: { date: Date }) {
  const { events } = useCalendarContext()

  const dayEvents = events.filter((event) =>
    isSameDay(new Date(event.scheduledAt), date)
  )

  const layouts = getEventLayout(dayEvents)

  const getEventStyle = (layout: any) => {
    const eventDate = new Date(layout.event.scheduledAt)
    const eventHour = getHours(eventDate)
    const eventMinute = getMinutes(eventDate)

    const top = (eventHour * 128) + (eventMinute * 128 / 60)

    const duration = layout.event.duration || 60
    const height = (duration / 60) * 128

    const width = 100 / layout.totalColumns
    const left = layout.column * width

    return {
      position: 'absolute' as const,
      top: `${top}px`,
      height: `${Math.max(height, 32)}px`,
      width: `calc(${width}% - 6px)`,
      left: `calc(${left}% + 3px)`,
      zIndex: 10,
    }
  }

  return (
    <div className="flex flex-col flex-grow bg-background">
      <CalendarBodyHeader date={date} />

      <div className="flex flex-grow overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Time column */}
        <div className="w-20 flex-shrink-0 border-r border-border/50 bg-muted/20">
          {hours.map((hour) => (
            <div key={hour} className="h-32 flex items-start justify-end pr-3 pt-2 relative group">
              <span className="text-xs font-medium text-muted-foreground/80 group-hover:text-muted-foreground transition-colors select-none">
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </span>
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          ))}
        </div>

        {/* Day content */}
        <div className="flex-1 relative bg-gradient-to-b from-background via-background to-muted/10">
          {hours.map((hour) => (
            <div
              key={hour}
              className={cn(
                "h-32 border-b group relative transition-colors duration-200",
                hour === 0 ? "border-t border-border/60" : "border-border/30",
                "hover:bg-accent/5"
              )}
            >
              <div className="absolute top-16 left-0 right-0 h-px bg-border/20" />
              <div className="absolute top-8 left-0 right-4 h-px bg-border/10" />
              <div className="absolute top-24 left-0 right-4 h-px bg-border/10" />
            </div>
          ))}

          <CurrentTimeIndicator date={date} />

          {/* 🔥 Events */}
          {layouts.map((layout) => (
            <div
              key={layout.event.id}
              style={getEventStyle(layout)}
              className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <CalendarEvent event={layout.event} />
            </div>
          ))}

          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-background/5" />
        </div>
      </div>
    </div>
  )
}

// ✅ Current time indicator (unchanged)
function CurrentTimeIndicator({ date }: { date: Date }) {
  const now = new Date()

  if (!isSameDay(date, now)) return null

  const currentHour = getHours(now)
  const currentMinute = getMinutes(now)
  const top = (currentHour * 128) + (currentMinute * 128 / 60)

  return (
    <div
      className="absolute left-0 right-0 z-30 flex items-center animate-pulse"
      style={{ top: `${top}px` }}
    >
      <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-lg border-2 border-background relative">
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30" />
      </div>

      <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-400/60 flex-1 shadow-sm" />

      <div className="absolute -top-6 left-4 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded shadow-lg">
        {format(now, 'h:mm a')}
      </div>
    </div>
  )
}