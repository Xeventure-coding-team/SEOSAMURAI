"use client"

import React, { useCallback, useRef, useEffect, useState } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps"

interface MapComponentProps {
  position: [number, number]   // marker + initial center
  name: string
  showPopup: boolean
  onMapLoad: () => void
  onMapError: (error: any) => void
  onMarkerClick: () => void
  onPopupClose: () => void
}

const MapComponent: React.FC<MapComponentProps> = ({
  position,
  name,
  showPopup,
  onMapLoad,
  onMapError,
  onMarkerClick,
  onPopupClose,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null)
  const isInitializedRef = useRef(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  const markerPos = { lat: position[0], lng: position[1] }

  // Pan map imperatively only when position actually changes from a search
  const prevPositionRef = useRef<[number, number]>(position)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const [prevLat, prevLng] = prevPositionRef.current
    const latDiff = Math.abs(position[0] - prevLat)
    const lngDiff = Math.abs(position[1] - prevLng)
    if (latDiff > 0.001 || lngDiff > 0.001) {
      mapRef.current.panTo(markerPos)
      prevPositionRef.current = position
    }
  }, [position, mapLoaded])

  const handleTilesLoaded = useCallback(
    (event: any) => {
      if (isInitializedRef.current) return
      isInitializedRef.current = true
      mapRef.current = event.map
      setMapLoaded(true)
      onMapLoad?.()
    },
    [onMapLoad]
  )

  return (
    <div className="w-full h-full min-h-[300px] rounded-lg overflow-hidden bg-gray-100">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
        <Map
          // ✅ Uncontrolled: set once, never re-controlled by React state
          defaultCenter={markerPos}
          defaultZoom={15}
          mapId="default-map"
          className="w-full h-full"
          disableDefaultUI={true}
          clickableIcons={false}
          gestureHandling="greedy"
          zoomControl={true}
          onTilesLoaded={handleTilesLoaded}
          draggableCursor="grab"
          draggingCursor="grabbing"
        >
          {mapLoaded && (
            <>
              <AdvancedMarker position={markerPos} onClick={onMarkerClick}>
                <Pin
                  background="#2563eb"
                  borderColor="#1d4ed8"
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>

              {showPopup && (
                <InfoWindow position={markerPos} onCloseClick={onPopupClose}>
                  <div className="p-2 bg-white rounded-md">
                    <div className="font-semibold text-sm text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {position[0].toFixed(4)}°, {position[1].toFixed(4)}°
                    </div>
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </Map>
      </APIProvider>
    </div>
  )
}

export default React.memo(MapComponent)