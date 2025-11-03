import { CalendarContext } from './calendar-context'
import { CalendarEvent, Mode } from './calendar-types'
import { useState } from 'react'
import CalendarNewEventDialog from './dialog/calendar-new-event-dialog'
import CalendarManageEventDialog from './dialog/calendar-manage-event-dialog'

export default function CalendarProvider({
  accountId,
  locationId,
  businessName,
  selectedLocation,
  events,
  setEvents,
  mode,
  setMode,
  date,
  setDate,
  calendarIconIsToday = true,
  children,
}: {
  businessName: string | null
  accountId: string | null
  locationId: string | null
  selectedLocation: string | null | undefined
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday: boolean
  children: React.ReactNode
}) {
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false)
  const [manageEventDialogOpen, setManageEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  
  return (
    <CalendarContext.Provider
      value={{
        businessName,
        selectedLocation,
        events,
        setEvents,
        mode,
        setMode,
        date,
        setDate,
        calendarIconIsToday,
        newEventDialogOpen,
        setNewEventDialogOpen,
        manageEventDialogOpen,
        setManageEventDialogOpen,
        selectedEvent,
        setSelectedEvent,
      }}
    >
      <CalendarNewEventDialog accountId={accountId} locationId={locationId} businessName={businessName ?? ''} selectedLocation={selectedLocation ?? undefined} />
      <CalendarManageEventDialog accountId={accountId} locationId={locationId} businessName={businessName ?? ''} selectedLocation={selectedLocation ?? undefined} />
      {children}
    </CalendarContext.Provider>
  )
}




