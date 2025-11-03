import { useCalendarContext } from '../../calendar-context'
import { isSameDay, format } from 'date-fns'

export default function CalendarBodyDayEvents() {
  const { events, date, setManageEventDialogOpen, setSelectedEvent } =
    useCalendarContext();

  // Filter and sort events by time
  const dayEvents = events
    .filter((event) => isSameDay(new Date(event.scheduledAt), date))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return !!dayEvents.length ? (
    <div className="flex flex-col gap-2">
      <p className="font-medium p-2 pb-0 font-heading">
        Posts scheduled {format(date, 'MMM d, yyyy')}
      </p>
      <div className="flex flex-col gap-2 px-2">
        {dayEvents.map((event) => {
          const eventDate = new Date(event.scheduledAt)
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/5 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedEvent(event)
                setManageEventDialogOpen(true)
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: event.viewColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium \truncate">
                  {event.summary}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(eventDate, 'h:mm a')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  ) : (
    <div className="p-2 text-muted-foreground text-center">
      Posts scheduled for {format(date, 'MMM d, yyyy')}
    </div>
  )
}