export interface BusinessInfo {
  displayName?: string;
  formattedAddress?: string;
  phoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  totalReviewCount?: number;
  description?: string;
  openingHours?:
    | Record<string, { open?: string; close?: string; isClosed?: boolean }>
    | {
        periods?: any[];
        weekday_text?: string[];
        open_now?: boolean;
      };
  placeId?: string;
  categories?: { primaryCategory?: { displayName?: string } };
  _rawLocationData?: {
    opening_hours?: {
      periods?: any[];
      weekday_text?: string[];
      open_now?: boolean;
    };
    formatted_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
  };
}

export interface Review {
  author?: string;
  reviewer?: { displayName?: string };
  rating?: number;
  starRating?: string;
  text?: string;
  comment?: string;
  review?: { comment?: string };
  createTime?: string;
  date?: string;
  time?: string;
}

export interface Photo {
  googleUrl?: string;
  name?: string;
  mediaFormat?: string;
}

export interface WebsiteData {
  id: string;
  title: string;
  description?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  enabledSections: string[];
  cachedData?: {
    businessInfo?: BusinessInfo;
    reviews?: Review[];
    photos?: Photo[];
    posts?: any[];
  };
}