"use client";

import { useState, useCallback } from "react";
import type { Photo } from "./types";

export function PhotoGrid({
  photos,
  placeId,
}: {
  photos: Photo[];
  placeId?: string;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const valid = photos.filter((p) => p.googleUrl);
  if (!valid.length) return null;

  const MAX_DISPLAY = 9;
  const hasMore = valid.length > MAX_DISPLAY;
  const displayed = valid.slice(0, MAX_DISPLAY);

  const gmbPhotosUrl = placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}&hl=en`
    : undefined;

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  }, []);

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {displayed.map((photo, i) => {
          const isFailed = failedImages.has(i);
          const isLoaded = loadedImages.has(i);

          if (isFailed) return null;

          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gray-200 aspect-square group cursor-pointer"
            >
              {!isLoaded && (
                <div className="absolute inset-0 bg-gray-300 animate-pulse" />
              )}
              <img
                src={photo.googleUrl}
                alt={`Business photo ${i + 1}`}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                decoding="async"
                onLoad={() => handleImageLoad(i)}
                onError={() => handleImageError(i)}
              />
            </div>
          );
        })}
      </div>

      {gmbPhotosUrl && (
        <div className="mt-6 text-center">
          <a
            href={gmbPhotosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border border-gray-200 text-gray-700 hover:shadow-sm hover:bg-gray-50 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            View Photos on Google
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}