"use client";

import React from 'react';

export interface Feature {
  id: string;
  slug: string;
  label: string;
  // ... other properties
}

interface MockupDisplayProps {
  feature: Feature;
}

// Map feature slugs to their corresponding image paths
const getImagePath = (slug: string): string => {
  const imageMap: Record<string, string> = {
    'locations': '/features/bulk-f.png',
    'geo-grid-scan': '/features/geogrid-f.png',
    'reviews': '/features/review-f.png',
    'keyword-tracking': '/features/keywords-f.png',
    'bulk-posting': '/features/bulk-f.png',
    'scheduled-posting': '/features/schedule-f.png',
  };

  return imageMap[slug] || '/features/bulk-f.png';
};

// Get alt text for the image
const getImageAlt = (slug: string): string => {
  const altMap: Record<string, string> = {
    'locations': 'Locations management dashboard showing multiple business locations',
    'geo-grid-scan': 'Geo-grid scan visualization showing map pack visibility',
    'reviews': 'Reviews management dashboard with AI reply feature',
    'keyword-tracking': 'Keyword tracking dashboard showing ranking positions',
    'bulk-posting': 'Bulk posting interface for creating multiple posts',
    'scheduled-posting': 'Scheduled posting calendar and automation dashboard',
  };

  return altMap[slug] || 'Feature mockup';
};

const MockupDisplay: React.FC<MockupDisplayProps> = ({ feature }) => {
  const [imageError, setImageError] = React.useState(false);
  const imagePath = getImagePath(feature.slug);
  const altText = getImageAlt(feature.slug);

  // If image fails to load, show a fallback
  if (imageError) {
    return (
      <div className="w-full max-w-[400px] mx-auto aspect-[4/5] rounded-2xl overflow-hidden bg-transparent flex items-center justify-center">
        <div className="text-center text-white/30">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-sm">{feature.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] mx-auto aspect-[4/5] rounded-2xl overflow-hidden bg-transparent relative">
      <img
        src={imagePath}
        alt={altText}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default MockupDisplay;