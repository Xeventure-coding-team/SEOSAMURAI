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
    "bulk-posting": "/mock/bulk.png",
    "scheduled-posts": "/mock/schedule.png",
    reviews: "/mock/reviews.png",
    "review-poster": "/mock/review-poster.png",
    "tracked-reviews": "/mock/tracked-reviews.png",
    "keyword-tracking": "/mock/keywords.png",
    "competitor-tracking": "/mock/comp.png",
    websites: "/mock/websites.png",
    "geo-grid-scan": "/mock/geo-grid.png",
  };

  return imageMap[slug] || "/features/bulk-f.png";
};

export default function MockupDisplay({ feature }: MockupDisplayProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="overflow-hidden rounded-md  border border-gray-200  bg-background">
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