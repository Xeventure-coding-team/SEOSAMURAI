"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

interface MapComponentProps {
  viewState: any
  position: [number, number]
  name: string
  showPopup: boolean
  onViewStateChange: (viewState: any) => void
  onMapLoad: () => void
  onMapError: (error: any) => void
  onMarkerClick: () => void
  onPopupClose: () => void
}

const MapComponent: React.FC<MapComponentProps> = ({
  viewState,
  position,
  name,
  showPopup,
  onViewStateChange,
  onMapLoad,
  onMapError,
  onMarkerClick,
  onPopupClose,
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const popupRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Leaflet from CDN
    const loadLeaflet = async () => {
      try {
        // Check if Leaflet is already loaded
        if (typeof window !== 'undefined' && (window as any).L) {
          setIsLoaded(true)
          return
        }

        // Load CSS
        const cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(cssLink)

        // Load JS
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => setIsLoaded(true)
        script.onerror = (error) => {
          console.error('Failed to load Leaflet:', error)
          onMapError(error)
        }
        document.head.appendChild(script)
      } catch (error) {
        console.error('Error loading Leaflet:', error)
        onMapError(error)
      }
    }

    loadLeaflet()
  }, [onMapError])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    if (!L) return

    try {
      // Initialize the map
      const map = L.map(mapRef.current).setView([position[0], position[1]], viewState.zoom)

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      // Custom marker icon
      const customIcon = L.divIcon({
        html: `
          <div style="color: #dc2626; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        `,
        className: "custom-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      // Add marker
      const marker = L.marker([position[0], position[1]], { icon: customIcon }).addTo(map)
      marker.on("click", onMarkerClick)

      // Handle map events
      map.on("moveend", () => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        onViewStateChange({
          latitude: center.lat,
          longitude: center.lng,
          zoom: zoom,
        })
      })

      mapInstanceRef.current = map
      markerRef.current = marker

      // Call onMapLoad after initialization
      setTimeout(onMapLoad, 100)
    } catch (error) {
      console.error("Map initialization error:", error)
      onMapError(error)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isLoaded, position, viewState.zoom, onMapLoad, onMapError, onMarkerClick, onViewStateChange])

  // Update marker position when position changes
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([position[0], position[1]])
      mapInstanceRef.current.setView([position[0], position[1]], viewState.zoom)
    }
  }, [position, viewState.zoom])

  // Handle popup visibility
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    const L = (window as any).L
    if (!L) return

    if (showPopup && !popupRef.current) {
      const popup = L.popup()
        .setLatLng([position[0], position[1]])
        .setContent(`
          <div style="padding: 8px;">
            <div style="font-weight: 500; font-size: 14px;">${name}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${position[0].toFixed(4)}, ${position[1].toFixed(4)}
            </div>
          </div>
        `)
        .openOn(mapInstanceRef.current)

      popup.on("remove", onPopupClose)
      popupRef.current = popup
    } else if (!showPopup && popupRef.current) {
      mapInstanceRef.current.closePopup(popupRef.current)
      popupRef.current = null
    }
  }, [isLoaded, showPopup, name, position, onPopupClose])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading map...</span>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} className="rounded-lg overflow-hidden" />
}

export default MapComponent
