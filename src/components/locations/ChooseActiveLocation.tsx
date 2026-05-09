"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MapPin, Check, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface Location {
  _id?: string
  id: string
  location_id: string
  location_name: string
  is_active: boolean
}

interface ChooseActiveLocationProps {
  open: boolean
  locations: Location[]
  limit: number
  onConfirm: (selectedIds: string[]) => Promise<void>
  onClose?: () => void 
}

export function ChooseActiveLocation({
  open,
  locations,
  limit,
  onConfirm,
  onClose
}: ChooseActiveLocationProps) {
  const [selected, setSelected] = useState<string[]>(
    // pre-select currently active ones up to limit
    locations.filter(l => l.is_active).slice(0, limit).map(l => l.id)
  )
  const [loading, setLoading] = useState(false)
  
 
  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(s => s !== id)
      }
      if (prev.length >= limit) {
        // Swap — remove first, add new
        return [...prev.slice(1), id]
      }
      return [...prev, id]
    })
  }

  const handleConfirm = async () => {
    if (selected.length !== limit) return
    setLoading(true)
    await onConfirm(selected)
    setLoading(false)
  }

  return (
    <Dialog  open={open} onOpenChange={(o) => { if (!o) onClose?.() }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={e => e.preventDefault()} // force choice
      >
        <DialogHeader>
          <DialogTitle>Choose your active location</DialogTitle>
          <DialogDescription>
            Your current plan allows <strong>{limit}</strong> active location{limit > 1 ? "s" : ""}.
            Select which to keep — the rest will be paused but data is preserved.
          </DialogDescription>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Inactive locations won't receive posts, scans, or replies until reactivated.</p>
        </div>

        {/* Location list */}
        <div className="flex flex-col gap-2 mt-1">
          {locations.map(location => {
            const isSelected = selected.includes(location.id)
            return (
              <button
                key={location.id}
                onClick={() => toggle(location.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className={cn(
                    "h-4 w-4 shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {location.location_name}
                  </span>
                </div>
                <div className={cn(
                  "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {selected.length}/{limit} selected
          </span>
          <Button
            onClick={handleConfirm}
            disabled={selected.length !== limit || loading}
            size="sm"
          >
            {loading ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}