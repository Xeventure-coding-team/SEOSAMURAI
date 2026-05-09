"use client";

import { useState } from "react";
import { ReviewCard } from "./review-card";
import { Section } from "./section";
import { StarRating } from "./star-rating";
import { buildGmbReviewsUrl } from "./helpers";
import type { Review, BusinessInfo } from "./types";

const INITIAL_SHOW = 6;

export function ReviewsSection({
  reviews,
  rating,
  primary,
  bi,
}: {
  reviews: Review[];
  rating?: number;
  primary: string;
  bi: BusinessInfo;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());
  
  const displayed = showAll ? reviews : reviews.slice(0, INITIAL_SHOW);
  const hasMore = reviews.length > INITIAL_SHOW;

  const toggleReadMore = (index: number) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const gmbUrl = buildGmbReviewsUrl(
    bi.placeId,
    bi.displayName,
    bi.formattedAddress
  );

  return (
    <Section
      id="reviews"
      title="Customer Reviews"
      primary={primary}
      action={
        rating ? (
          <div 
            className="flex items-center gap-2 text-xs sm:text-sm rounded-full sm:px-4 py-1.5 sm:py-2 border" 
            style={{ borderColor: primary, backgroundColor: `${primary}08` }}
          >
            <StarRating rating={rating} size="sm" />
            <span className="font-bold" style={{ color: primary }}>{Number(rating).toFixed(1)}</span>
            <span style={{ color: primary }} className="opacity-60">/ 5</span>
          </div>
        ) : null
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {displayed.map((review, i) => (
          <ReviewCard 
            key={i} 
            review={review} 
            index={i} 
            primary={primary}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border transition-all hover:shadow-sm"
            style={{ 
              borderColor: primary, 
              color: primary,
              backgroundColor: showAll ? primary : 'transparent'
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              if (!showAll) {
                btn.style.backgroundColor = primary;
                btn.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              if (!showAll) {
                btn.style.backgroundColor = "transparent";
                btn.style.color = primary;
              }
            }}
          >
            {showAll ? "Show Less" : `Show All ${reviews.length}`}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {gmbUrl && (
          <a
            href={gmbUrl}
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
            View on Google
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </Section>
  );
}