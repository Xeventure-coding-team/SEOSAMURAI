"use client";

import React from "react";
import Image from "next/image";

export interface Feature {
  id: string;
  slug: string;
  label: string;
}

interface MockupDisplayProps {
  feature: Feature;
}

const getImagePath = (slug: string): string => {
  const imageMap: Record<string, string> = {
    locations: "/mock/locations.png",
    "bulk-posting": "/features/bulk-f.png",
    "scheduled-posts": "/features/schedule-f.png",
    reviews: "/features/review-f.png",
    "review-poster": "/features/review-poster-f.png",
    "tracked-reviews": "/features/tracked-reviews-f.png",
    "keyword-tracking": "/features/keywords-f.png",
    "competitor-tracking": "/features/competitor-f.png",
    websites: "/features/websites-f.png",
    "geo-grid-scan": "/features/geogrid-f.png",
  };

  return imageMap[slug] || "/features/bulk-f.png";
};

export default function MockupDisplay({ feature }: MockupDisplayProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="overflow-hidden rounded-md  border border-border shadow-2xl bg-background">
        <Image
          src={getImagePath(feature.slug)}
          alt={feature.label}
          width={1800}
          height={1200}
          className="w-full h-auto object-contain"
          priority
        />
      </div>
    </div>
  );
}