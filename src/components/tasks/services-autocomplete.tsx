"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, X } from "lucide-react"
import CategoriesJSON from '@/data/categories.json'

const CATEGORIES = CategoriesJSON;

export default function ServicesTextareaAutocomplete({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (input.trim().length > 0) {
      const filtered = CATEGORIES.filter((cat) => cat.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
      setSuggestions(filtered)
      setIsOpen(true)
      setHighlightedIndex(-1)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [input])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAddService = (service: string) => {
    const services = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (!services.includes(service)) {
      const newServices = [...services, service].join(", ")
      onChange(newServices)
    }

    setInput("")
    setSuggestions([])
    setIsOpen(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "Enter" && input.trim()) {
        e.preventDefault()
        handleAddService(input.trim())
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleAddService(suggestions[highlightedIndex])
        } else if (input.trim()) {
          handleAddService(input.trim())
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  const handleRemoveService = (index: number) => {
    const services = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    services.splice(index, 1)
    onChange(services.join(", "))
  }

  const services = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  return (
    <div ref={containerRef} className="w-full space-y-3">
      <label className="block text-sm font-semibold text-foreground">Services</label>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input.trim().length > 0 && setIsOpen(true)}
          placeholder="Type to search services..."
          className="w-full min-h-24 p-4 border-2 border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleAddService(suggestion)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  index === highlightedIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 opacity-50" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
          {services.map((service, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-2 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium"
            >
              <span>{service}</span>
              <button
                onClick={() => handleRemoveService(index)}
                className="ml-1 hover:opacity-70 transition-opacity"
                aria-label={`Remove ${service}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
