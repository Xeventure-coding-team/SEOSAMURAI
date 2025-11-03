import * as React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { colorOptions } from '../calendar/calendar-tailwind-classes'

interface ColorPickerProps {
    field: {
        value: string
        onChange: (value: string) => void
    }
}

export function ColorPicker({ field }: ColorPickerProps) {
    return (
        <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="flex gap-2"
        >
            {colorOptions.map((color) => (
                <RadioGroupItem
                    key={color.value}
                    value={color.value}
                    id={color.value}
                    className={cn(
                        'size-6 border-2 shadow-none transition-all duration-200 rounded-full',
                        color.class.base,
                        // Add checked state styling
                        `data-[state=checked]:${color.class.base} data-[state=checked]:ring-2 data-[state=checked]:ring-offset-2`
                    )}
                />
            ))}
        </RadioGroup>
    )
}   