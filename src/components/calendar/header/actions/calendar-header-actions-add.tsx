import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCalendarContext } from '../../calendar-context'
import { UsageGate } from '@/components/usage-gate'

interface CalendarHeaderActionsProps {
  selectedLocation?: string | null
}

export default function CalendarHeaderActionsAdd({ selectedLocation }: CalendarHeaderActionsProps) {
  const { setNewEventDialogOpen } = useCalendarContext()
  return (
    <UsageGate metric="scheduledPostsUsed">
      <Button
        className="flex items-center gap-1 bg-primary text-background"
        onClick={() => setNewEventDialogOpen(true)}
      >
        <Plus />
        Schedule Post
      </Button>
    </UsageGate>
  )
}
