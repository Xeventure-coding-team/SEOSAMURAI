import { useCalendarContext } from '../../calendar-context'
import { format } from 'date-fns'
import CalendarHeaderDateIcon from './calendar-header-date-icon'
import CalendarHeaderDateChevrons from './calendar-header-date-chevrons'
import CalendarHeaderDateBadge from './calendar-header-date-badge'

export default function CalendarHeaderDate() {
  const { date } = useCalendarContext()

  return (
    <div
      className="
        flex flex-col sm:flex-row
        sm:items-center
        gap-3 sm:gap-2
        w-full sm:w-auto
      "
    >
      <CalendarHeaderDateIcon />

      <div className="flex flex-col gap-1 min-w-0">
        <div
          className="
            flex flex-wrap
            items-center
            gap-1
          "
        >
          <p className="text-base sm:text-lg font-semibold truncate">
            {format(date, 'MMMM yyyy')}
          </p>

          <CalendarHeaderDateBadge />
        </div>

        <CalendarHeaderDateChevrons />
      </div>
    </div>
  )
}