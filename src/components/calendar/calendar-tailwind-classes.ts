// Fixed colorOptions with explicit classes for proper Tailwind detection
export const colorOptions = [
  {
    value: 'blue',
    label: 'Blue',
    bgColor: '#3b82f6',
    class: {
      base: 'bg-blue-500 border-blue-500 text-blue-500',
      light: 'bg-blue-300 border-blue-300 text-blue-300',
      dark: 'bg-blue-700 border-blue-700 text-blue-700',
    },
  },
  {
    value: 'indigo',
    label: 'Indigo', 
    bgColor: '#6366f1',
    class: {
      base: 'bg-indigo-500 border-indigo-500 text-indigo-500',
      light: 'bg-indigo-300 border-indigo-300 text-indigo-300',
      dark: 'bg-indigo-700 border-indigo-700 text-indigo-700',
    },
  },
  {
    value: 'pink',
    label: 'Pink',
    bgColor: '#ec4899',
    class: {
      base: 'bg-pink-500 border-pink-500 text-pink-500',
      light: 'bg-pink-300 border-pink-300 text-pink-300',
      dark: 'bg-pink-700 border-pink-700 text-pink-700',
    },
  },
  {
    value: 'red',
    label: 'Red',
    bgColor: '#ef4444',
    class: {
      base: 'bg-red-500 border-red-500 text-red-500',
      light: 'bg-red-300 border-red-300 text-red-300',
      dark: 'bg-red-700 border-red-700 text-red-700',
    },
  },
  {
    value: 'orange',
    label: 'Orange',
    bgColor: '#f97316',
    class: {
      base: 'bg-orange-500 border-orange-500 text-orange-500',
      light: 'bg-orange-300 border-orange-300 text-orange-300',
      dark: 'bg-orange-700 border-orange-700 text-orange-700',
    },
  },
  {
    value: 'amber',
    label: 'Amber',
    bgColor: '#f59e0b',
    class: {
      base: 'bg-amber-500 border-amber-500 text-amber-500',
      light: 'bg-amber-300 border-amber-300 text-amber-300',
      dark: 'bg-amber-700 border-amber-700 text-amber-700',
    },
  },
  {
    value: 'emerald',
    label: 'Emerald',
    bgColor: '#10b981',
    class: {
      base: 'bg-emerald-500 border-emerald-500 text-emerald-500',
      light: 'bg-emerald-300 border-emerald-300 text-emerald-300',
      dark: 'bg-emerald-700 border-emerald-700 text-emerald-700',
    },
  },
]