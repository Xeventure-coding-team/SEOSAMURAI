import { useCalendarContext } from '@/components/calendar/calendar-context'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import { motion, MotionConfig, AnimatePresence } from 'framer-motion'

export default function CalendarEvent({
  event,
  month = false,
  className,
}: {
  event: any
  month?: boolean
  className?: string
}) {
  const { setSelectedEvent, setManageEventDialogOpen } = useCalendarContext()
  const eventDate = new Date(event.scheduledAt)
  const isExpired = isPast(eventDate)

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          className={cn(
            `px-2 py-1 rounded-md truncate cursor-pointer transition-all duration-300 border text-sm relative`,
            month ? 'mb-1' : 'h-full flex flex-col justify-start',
            isExpired && 'opacity-60',
            className
          )}
          style={{
            backgroundColor: `${event.viewColor}20`,
            borderColor: event.viewColor,
            color: event.viewColor,
          }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedEvent(event)
            setManageEventDialogOpen(true)
          }}
          initial={{ opacity: 0, y: -3, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
            opacity: { duration: 0.2, ease: 'linear' },
            layout: { duration: 0.2, ease: 'easeOut' },
          }}
          layoutId={`event-${event.id}-${month ? 'month' : 'day'}`}
        >
          {/* Expired indicator */}
          {isExpired && (
            <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-b-[8px] border-l-transparent border-b-red-500" />
          )}
          
          <motion.div
            className={cn(
              `flex flex-col w-full`,
              month && 'flex-row items-center justify-between'
            )}
            layout="position"
          >
            <p className={cn(
              'font-medium truncate leading-tight', 
              month ? 'text-md' : 'text-sm mb-1',
              isExpired && 'line-through'
            )}>
              {event.summary}
            </p>
            {!month && (
              <p className={cn(
                "text-md opacity-80 leading-tight",
                isExpired && 'line-through'
              )}>
                {format(eventDate, 'h:mm a')}
                {isExpired && <span className="ml-1 text-red-500">•</span>}
              </p>
            )}
            {month && (
              <p className={cn(
                "text-xs opacity-80",
                isExpired && 'line-through'
              )}>
                {format(eventDate, 'h:mm a')}
                {isExpired && <span className="ml-1 text-red-500">•</span>}
              </p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}
