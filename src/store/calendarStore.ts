import { create } from 'zustand'
import { CalendarEvent } from '@/components/calendar/calendar-types'

interface CalendarStore {
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  removeEvent: (eventId: string) => void
  updateEvent: (eventId: string, updated: Partial<CalendarEvent>) => void
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],

  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    })),

  updateEvent: (eventId, updated) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, ...updated } : e
      ),
    })),
}))