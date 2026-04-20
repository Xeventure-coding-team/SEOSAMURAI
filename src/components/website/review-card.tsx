"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import type { Review } from "./types";

const PREVIEW_LINES = 3; // Number of lines to show before truncation

export function getRating(review: Review): number {
  if (review.rating) return Number(review.rating);
  const map: Record<string, number> = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };
  return map[review.starRating || ""] || 0;
}

export function getReviewText(review: Review): string {
  return review.comment || review.text || (review.review as any)?.comment || "";
}

export function getReviewAuthor(review: Review): string {
  return review.author || review.reviewer?.displayName || "Anonymous";
}

export function getReviewDate(review: Review): string | null {
  const d = review.createTime || review.date || review.time;
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export function ReviewCard({
  review,
  index,
  primary,
}: {
  review: Review;
  index: number;
  primary: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rating = getRating(review);
  const text = getReviewText(review);
  const author = getReviewAuthor(review);
  const date = getReviewDate(review);
  const initials = author
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Check if text needs truncation (rough estimate based on length)
  const needsTruncation = text.length > 150;

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: primary }}
        >
          {initials || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{author}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={rating} size="sm" />
            {date && <span className="text-xs text-gray-400">{date}</span>}
          </div>
        </div>
      </div>
      
      {text ? (
        <div className="space-y-2">
          <p 
            className={`text-gray-600 text-sm leading-relaxed ${
              !isExpanded && needsTruncation ? `line-clamp-${PREVIEW_LINES}` : ""
            }`}
          >
            {text}
          </p>
          {needsTruncation && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium transition-colors hover:opacity-70 inline-flex items-center gap-1"
              style={{ color: primary }}
            >
              {isExpanded ? "Show less" : "Read more"}
              <svg 
                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-sm italic">No review text.</p>
      )}
    </div>
  );
}