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
import { AnimatePresence, motion } from 'framer-motion'

export default function CalendarBodyMonth() {
  const { date, events, setDate, setMode } = useCalendarContext()

  // Get the first day of the month
  const monthStart = startOfMonth(date)
  // Get the last day of the month
  const monthEnd = endOfMonth(date)

  // Get the first Monday of the first week (may be in previous month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  // Get the last Sunday of the last week (may be in next month)
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Get all days between start and end
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const today = new Date()

  // Filter events to only show those within the current month grid
  const visibleEvents = events.filter(
    (event) =>
      isWithinInterval(new Date(event.scheduledAt), {
        start: calendarStart,
        end: calendarEnd,
      })
  )

  return (
    <div className="flex flex-col flex-grow overflow-hidden bg-gradient-to-br from-background via-background to-muted/10 rounded-2xl">
      {/* Enhanced day headers */}
      <div className="hidden md:grid grid-cols-7 border-border divide-x divide-border/60 bg-muted/20 backdrop-blur-sm">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-sm font-semibold tracking-wide border-b border-border/60 relative group",
              "transition-colors duration-200 hover:bg-accent/5/5",
              index >= 5 && "text-red-500/80" // Weekend styling
            )}
          >
            <span className="relative z-10">{day}</span>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthStart.toISOString()}
          className="grid md:grid-cols-7 sm:grid-cols-3 grid-cols-2 flex-grow overflow-y-auto relative scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {calendarDays.map((day, index) => {
            const dayEvents = visibleEvents.filter((event) =>
              isSameDay(new Date(event.scheduledAt), day)
            )
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, date)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.01,
                  ease: 'easeOut'
                }}
                className={cn(
                  'relative flex flex-col border-b border-r p-3 aspect-square cursor-pointer group',
                  'transition-all duration-200 hover:bg-accent/5',
                  !isCurrentMonth && 'bg-muted/30 hidden md:flex opacity-60',
                  isWeekend && isCurrentMonth && 'bg-red-50/30 dark:bg-red-950/10',
                  isToday && 'bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDate(day)
                  setMode('day')
                }}
                whileTap={{ 
                  scale: 0.98,
                  transition: { duration: 0.1 }
                }}
              >
                {/* Enhanced day number */}
                <div
                  className={cn(
                    'text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 relative',
                    isToday && 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30',
                    !isToday && !isCurrentMonth && 'text-muted-foreground/60',
                    !isToday && isCurrentMonth && 'text-foreground hover:bg-accent/5',
                    isWeekend && !isToday && 'text-red-500/70'
                  )}
                >
                  {format(day, 'd')}
                  {isToday && (
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                  )}
                </div>

                {/* Enhanced events section */}
                <AnimatePresence mode="wait">
                  <div className="flex flex-col gap-1 mt-2 flex-grow overflow-hidden">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{
                          duration: 0.2,
                          delay: eventIndex * 0.05,
                        }}
                      >
                        <CalendarEvent
                          event={event}
                          className="relative h-auto transform transition-transform duration-150"
                          month
                        />
                      </motion.div>
                    ))}
                    
                    {/* Enhanced "more events" indicator */}
                    {dayEvents.length > 3 && (
                      <motion.div
                        key={`more-${day.toISOString()}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                          duration: 0.2,
                        }}
                        className={cn(
                          "text-xs font-medium px-2 py-1 cursor-pointer",
                          "bg-accent/30 text-accent-foreground hover:bg-accent/5",
                          "border border-accent/40 transition-all duration-200"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDate(day)
                          setMode('day')
                        }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        +{dayEvents.length - 3} more
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>

                {/* Subtle hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm pointer-events-none" />
                
                {/* Today indicator glow */}
                {isToday && (
                  <div className="absolute inset-0 bg-gradient-to-br rounded-sm pointer-events-none animate-pulse" />
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}