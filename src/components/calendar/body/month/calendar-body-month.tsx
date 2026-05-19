import { useCalendarContext } from '../../calendar-context'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
} from 'date-fns'
import { cn } from '@/lib/utils'
import CalendarEvent from '../../calendar-event'

export default function CalendarBodyMonth() {
  const { date, events, setDate, setMode } = useCalendarContext()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const today = new Date()

  const visibleEvents = events.filter((event) =>
    isWithinInterval(new Date(event.scheduledAt), {
      start: calendarStart,
      end: calendarEnd,
    })
  )

  return (
    <div className="flex flex-col flex-grow overflow-hidden border border-border rounded-xl bg-background">
      {/* Day headers */}
      <div className="hidden md:grid grid-cols-7 border-b border-border">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-xs font-semibold tracking-wider uppercase text-muted-foreground",
              index < 6 && "border-r border-border",
              index >= 5 && "text-rose-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid md:grid-cols-7 sm:grid-cols-3 grid-cols-2 flex-grow overflow-y-auto divide-x divide-y divide-border">
        {calendarDays.map((day) => {
          const dayEvents = visibleEvents.filter((event) =>
            isSameDay(new Date(event.scheduledAt), day)
          )
          const isToday = isSameDay(day, today)
          const isCurrentMonth = isSameMonth(day, date)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'relative flex flex-col p-3 min-h-[120px] cursor-pointer',
                'transition-colors duration-150 hover:bg-muted/40',
                !isCurrentMonth && 'hidden md:flex bg-muted/20',
                isWeekend && isCurrentMonth && 'bg-muted/10',
                isToday && 'bg-primary/5'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setDate(day)
                setMode('day')
              }}
            >
              {/* Day number */}
              <span
                className={cn(
                  'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-2 shrink-0',
                  isToday && 'bg-primary text-primary-foreground',
                  !isToday && isCurrentMonth && 'text-foreground',
                  !isToday && !isCurrentMonth && 'text-muted-foreground/40',
                  isWeekend && !isToday && isCurrentMonth && 'text-rose-400'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Events */}
              <div className="flex flex-col gap-1 flex-grow overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEvent
                    key={event.id}
                    event={event}
                    className="h-auto"
                    month
                  />
                ))}

                {dayEvents.length > 3 && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 text-left transition-colors duration-150"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDate(day)
                      setMode('day')
                    }}
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}