import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCalendarContext } from '../../calendar-context'

interface CalendarHeaderActionsProps {
  selectedLocation?: string | null
}

export default function CalendarHeaderActionsAdd({selectedLocation}: CalendarHeaderActionsProps) {
  const { setNewEventDialogOpen } = useCalendarContext()
  return (
    <Button
      className="flex items-center gap-1 bg-primary text-background"
      onClick={() => setNewEventDialogOpen(true)}
    >
      <Plus />
      Schedule Post
    </Button>
  )
}
