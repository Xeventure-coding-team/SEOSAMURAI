import type { CalendarProps } from './calendar-types'
import CalendarHeader from './header/calendar-header'
import CalendarBody from './body/calendar-body'
import CalendarHeaderActions from './header/actions/calendar-header-actions'
import CalendarHeaderDate from './header/date/calendar-header-date'
import CalendarHeaderActionsMode from './header/actions/calendar-header-actions-mode'
import CalendarHeaderActionsAdd from './header/actions/calendar-header-actions-add'
import CalendarProvider from './calendar-provider'
import { Card, CardContent } from '../ui/card'

export default function Calendar({
  accountId = null,
  locationId = null,
  businessName = null,
  selectedLocation = null,
  events,
  setEvents,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = true,
}: CalendarProps) {
  return (
    <CalendarProvider
      accountId={accountId}
      locationId={locationId}
      businessName={businessName}
      selectedLocation={selectedLocation || ''}
      events={events}
      setEvents={setEvents}
      mode={mode}
      setMode={setMode}
      date={date}
      setDate={setDate}
      calendarIconIsToday={calendarIconIsToday}
    >
      <Card className='p-0 mb-4 bg-none' style={{ backgroundColor: 'transparent' }}>
      <CalendarHeader>
        <CalendarHeaderDate />
        <CalendarHeaderActions>
          <CalendarHeaderActionsMode selectedLocation={selectedLocation} />
          <CalendarHeaderActionsAdd selectedLocation={selectedLocation} />
        </CalendarHeaderActions>
      </CalendarHeader>
      </Card>
      <Card className='p-0 m-0 bg-none' style={{ backgroundColor: 'transparent' }}>
        <CalendarBody />
      </Card>
    </CalendarProvider>
  )
}
