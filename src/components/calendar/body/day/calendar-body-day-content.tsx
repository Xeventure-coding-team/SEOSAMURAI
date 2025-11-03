import { useCalendarContext } from '../../calendar-context'
import { isSameDay, format, getHours, getMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarBodyHeader from '../calendar-body-header'
import CalendarEvent from '../../calendar-event'

// Generate hours from 0 to 23
const hours = Array.from({ length: 24 }, (_, i) => i)

export default function CalendarBodyDayContent({ date }: { date: Date }) {
  const { events } = useCalendarContext()

  const dayEvents = events.filter((event) =>
    isSameDay(new Date(event.scheduledAt), date)
  )

  // Function to calculate event position and height
  const getEventStyle = (event: any) => {
    const eventDate = new Date(event.scheduledAt)
    const eventHour = getHours(eventDate)
    const eventMinute = getMinutes(eventDate)

    // Calculate top position (each hour is 8rem = 128px)
    const top = (eventHour * 128) + (eventMinute * 128 / 60)

    // Default event duration of 1 hour if not specified
    const duration = event.duration || 60 // minutes
    const height = (duration / 60) * 128 // convert to pixels using correct hour height

    return {
      position: 'absolute' as const,
      top: `${top}px`,
      height: `${Math.max(height, 32)}px`, // minimum height of 32px
      left: '8px',
      right: '8px',
      zIndex: 10
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
              {/* Time slot hover indicator */}
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          ))}
        </div>

        {/* Day content */}
        <div className="flex-1 relative bg-gradient-to-b from-background via-background to-muted/10">
          {/* Hour grid lines with enhanced styling */}
          {hours.map((hour) => (
            <div
              key={hour}
              className={cn(
                "h-32 border-b group relative transition-colors duration-200",
                hour === 0 ? "border-t border-border/60" : "border-border/30",
                "hover:bg-accent/5"
              )}
            >
              {/* Half-hour line */}
              <div className="absolute top-16 left-0 right-0 h-px bg-border/20" />
              
              {/* Quarter hour lines */}
              <div className="absolute top-8 left-0 right-4 h-px bg-border/10" />
              <div className="absolute top-24 left-0 right-4 h-px bg-border/10" />
            </div>
          ))}

          {/* Current time indicator */}
          <CurrentTimeIndicator date={date} />

          {/* Events with enhanced positioning */}
          {dayEvents.map((event, index) => (
            <div 
              key={event.id} 
              style={getEventStyle(event)}
              className="transform transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <CalendarEvent event={event} />
            </div>
          ))}

          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-background/5" />
        </div>
      </div>
    </div>
  )
}

// Enhanced current time indicator component
function CurrentTimeIndicator({ date }: { date: Date }) {
  const now = new Date()

  // Only show if viewing today
  if (!isSameDay(date, now)) return null

  const currentHour = getHours(now)
  const currentMinute = getMinutes(now)
  const top = (currentHour * 128) + (currentMinute * 128 / 60)

  return (
    <div
      className="absolute left-0 right-0 z-30 flex items-center animate-pulse"
      style={{ top: `${top}px` }}
    >
      {/* Current time dot */}
      <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-lg border-2 border-background relative">
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-30" />
      </div>
      
      {/* Current time line */}
      <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-400/60 flex-1 shadow-sm" />
      
      {/* Time label */}
      <div className="absolute -top-6 left-4 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded shadow-lg">
        {format(now, 'h:mm a')}
      </div>
    </div>
  )
}