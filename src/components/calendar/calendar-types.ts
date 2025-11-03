export type CalendarProps = {
  businessName?: string | null
  accountId?: string | null
  locationId?: string | null
  selectedLocation?: string | null
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  mode: Mode
  setMode: (mode: Mode) => void
  date: Date
  setDate: (date: Date) => void
  calendarIconIsToday?: boolean
}

export type CalendarContextType = CalendarProps & {
  newEventDialogOpen: boolean
  setNewEventDialogOpen: (open: boolean) => void
  manageEventDialogOpen: boolean
  setManageEventDialogOpen: (open: boolean) => void
  selectedEvent: CalendarEvent | null
  setSelectedEvent: (event: CalendarEvent | null) => void
}
export type CalendarEvent = {
  id: string;
  summary: string;
  scheduledAt: Date;
  viewColor: string;
  accessToken?: string;
  accountId?: string;
  status?: string;
  locationId?: string;
  postName?: string;
  actionType?: string;
  actionUrl?: string;
  callPhone?: string;
  imageUrl?: string;
  color?: string;
};

export const calendarModes = ['day', 'week', 'month'] as const
export type Mode = (typeof calendarModes)[number]
