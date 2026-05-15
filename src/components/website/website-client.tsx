"use client";

import { Navbar } from "./navbar";
import { Section, ContactRow } from "./section";
import { StarRating } from "./star-rating";
import { PhotoGrid } from "./photo-grid";
import { ReviewsSection } from "./reviews-section";
import { parseOpeningHours, isOpenNow } from "./helpers";
import type { WebsiteData, Review, Photo } from "./types";

export default function WebsiteClient({ website }: { website: WebsiteData }) {
    const bi = website.cachedData?.businessInfo || {};
    const reviews = (website.cachedData?.reviews || []) as Review[];
    const photos = (website.cachedData?.photos || []) as Photo[];
    const sections = website.enabledSections || [];
    const primary = website.primaryColor || "#3b82f6";
    const secondary = website.secondaryColor || "#2563eb";

    const hours = parseOpeningHours(bi);
    const openNow = isOpenNow(bi);
    const totalReviews =
        bi.totalReviewCount || bi._rawLocationData?.user_ratings_total || reviews.length;
    const rating = bi.rating || bi._rawLocationData?.rating;
    const phone =
        bi.phoneNumber ||
        bi._rawLocationData?.formatted_phone_number ||
        bi._rawLocation?.data?.phoneNumbers?.primaryPhone ||
        bi.phoneNumbers?.primaryPhone;
    const websiteUri = bi.websiteUri || bi._rawLocationData?.website;
    const placeId = bi.placeId;

    const hasReviews = sections.includes("reviews") && reviews.length > 0;
    const hasGallery = sections.includes("gallery") && photos.some((p) => p.googleUrl);
    const hasContact =
        sections.includes("contact") && (phone || bi.formattedAddress || websiteUri);
    const hasHours = sections.includes("hours") && !!hours;
    const hasAbout = sections.includes("about") && !!website.description;
    const hasHero = sections.includes("hero") && !!website.description;

    const activeSections = [
        hasAbout && "about",
        hasReviews && "reviews",
        hasGallery && "gallery",
        hasHours && "hours",
        hasContact && "contact",
    ].filter(Boolean) as string[];


    return (
        <div
            className="min-h-screen bg-gray-50"
            style={
                {
                    "--primary": primary,
                    "--secondary": secondary,
                    fontFamily:
                        website.fontFamily === "Inter"
                            ? "'DM Sans', sans-serif"
                            : website.fontFamily || "sans-serif",
                } as React.CSSProperties
            }
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        html { scroll-behavior: smooth; }
        .line-clamp-4 { display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden; }
      `}</style>

            <Navbar website={website} sections={activeSections} phone={phone} primaryColor={website.primaryColor} />

            {/* ── Hero ── */}
            {hasHero && <div
                className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28 lg:pt-48 lg:pb-40"
                style={{ backgroundColor: primary }}
            >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30 pointer-events-none" />

                {/* Glow Effect */}
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-3xl opacity-30" />

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

                    {/* Main Heading */}
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                        {website.title}
                    </h1>

                    {/* Rating & Reviews */}
                    {rating && (
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <div className="flex items-center gap-1">
                                <StarRating rating={rating} size="md" />
                                <span className="text-lg font-semibold text-white">
                                    {Number(rating).toFixed(1)}
                                </span>
                            </div>

                            {totalReviews > 0 && (
                                <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(
                                        website.title
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-white/80 hover:text-white transition underline underline-offset-4"
                                >
                                    {totalReviews} reviews
                                </a>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    {website.cachedData?.businessInfo?.description && (
                        <p className="text-base sm:text-lg lg:text-xl text-white/85 max-w-6xl mx-auto leading-relaxed mb-12">
                            {website.cachedData?.businessInfo?.description.length > 800
                                ? website.cachedData?.businessInfo?.description.slice(0, 800) + "…"
                                : website.cachedData?.businessInfo?.description}
                        </p>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

                        {phone && (
                            <a
                                href={`tel:${phone}`}
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-white 
          bg-white/20 backdrop-blur-md border border-white/30 
          transition-all duration-300 
          hover:bg-white/30 hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                </svg>
                                Call Us
                            </a>
                        )}

                        {/* Optional Secondary CTA */}
                        <a
                            href="#contact"
                            className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-medium 
        text-white/90 border border-white/30 
        hover:bg-white/10 transition-all duration-300"
                        >
                            Get Directions →
                        </a>
                    </div>
                </div>
            </div>}

            {/* ── Main content ── */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

                {/* ── About ── */}
                {hasAbout && (
                    <Section id="about" title="About Us" primary={primary}>
                        <div className="max-w-full space-y-8">
                            {/* Description */}
                            <div className="prose prose-lg prose-gray max-w-none">
                                <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                                    {website.description}
                                </p>
                            </div>

                            {/* Rating and Reviews Section - Modern Card Design */}
                            {(website.cachedData?.businessInfo?.totalReviewCount || website.cachedData?.businessInfo?._rawLocationData?.rating) && (
                                <div
                                    className="rounded-2xl overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, ${primary}08 0%, ${primary}02 100%)`,
                                        border: `1px solid ${primary}15`
                                    }}
                                >
                                    <div className="px-4 py-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-8">

                                            {/* LEFT: Rating Display */}
                                            {website.cachedData?.businessInfo?._rawLocationData?.rating && (
                                                <div className="flex items-center gap-6">
                                                    {/* Rating Number */}
                                                    <div className="text-center">
                                                        <div
                                                            className="text-5xl sm:text-6xl font-bold leading-none tracking-tight"
                                                            style={{ color: primary }}
                                                        >
                                                            {website.cachedData.businessInfo._rawLocationData.rating}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1.5">out of 5</p>
                                                    </div>

                                                    {/* Stars & Review Count */}
                                                    <div>
                                                        <div className="flex gap-1 mb-2">
                                                            {[...Array(5)].map((_, i) => {
                                                                const rating = parseFloat(website.cachedData.businessInfo._rawLocationData.rating || 5);
                                                                const fullStars = Math.floor(rating);
                                                                const hasHalfStar = rating - fullStars >= 0.5;

                                                                if (i < fullStars) {
                                                                    return (
                                                                        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                        </svg>
                                                                    );
                                                                } else if (i === fullStars && hasHalfStar) {
                                                                    return (
                                                                        <svg key={i} className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                                            <defs>
                                                                                <linearGradient id={`half-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                                    <stop offset="50%" stopColor="currentColor" />
                                                                                    <stop offset="50%" stopColor="#D1D5DB" />
                                                                                </linearGradient>
                                                                            </defs>
                                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill={`url(#half-${i})`} />
                                                                        </svg>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <svg key={i} className="w-5 h-5 text-gray-300 fill-current" viewBox="0 0 20 20">
                                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                        </svg>
                                                                    );
                                                                }
                                                            })}
                                                        </div>
                                                        <p className="text-sm text-gray-500">
                                                            Based on {website.cachedData.businessInfo.totalReviewCount || 0} reviews
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Divider - Vertical on desktop, Horizontal on mobile */}
                                            {website.cachedData?.businessInfo?._rawLocationData?.rating &&
                                                website.cachedData?.businessInfo?.totalReviewCount && (
                                                    <div className="hidden lg:block h-12 w-px" style={{ backgroundColor: `${primary}15` }} />
                                                )}

                                            {/* RIGHT: Trust Badges */}
                                            {website.cachedData?.businessInfo?.totalReviewCount && (
                                                <div className="flex flex-wrap items-center gap-6">
                                                    {/* Verified Badge */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-50">
                                                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Verified Business</p>
                                                            <p className="text-xs text-gray-500">Google guaranteed</p>
                                                        </div>
                                                    </div>

                                                    {/* Satisfaction Badge */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}10` }}>
                                                            <svg className="w-5 h-5" style={{ color: primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">Highly Rated</p>
                                                            <p className="text-xs text-gray-500">Trusted by students</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Optional: Google Review Link */}
                                    {website.cachedData?.businessInfo?.totalReviewCount > 0 && (
                                        <div
                                            className="px-6 sm:px-8 py-3 border-t text-right"
                                            style={{ borderColor: `${primary}10` }}
                                        >
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(website.title)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70"
                                                style={{ color: primary }}
                                            >
                                                Read all reviews on Google
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Reviews */}
                {hasReviews && (
                    <ReviewsSection
                        reviews={reviews}
                        rating={rating}
                        primary={primary}
                        bi={bi}
                    />
                )}

                {/* Gallery */}
                {hasGallery && (
                    <Section id="gallery" title="Gallery" primary={primary}>
                        <PhotoGrid photos={photos} placeId={placeId} />
                    </Section>
                )}


 {/* Contact */}
{hasContact && (
    <Section id="contact" title="Contact" primary={primary}>
        <div className="space-y-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {phone && (
                        <ContactRow
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            }
                            label="Phone"
                            primary={primary}
                        >
                            <div className="flex items-center gap-2">
                                <a
                                    href={`tel:${phone}`}
                                    className="text-gray-900 font-medium hover:text-gray-600 transition"
                                >
                                    {phone}
                                </a>
                                <button
                                    onClick={() => navigator.clipboard.writeText(phone)}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition"
                                    aria-label="Copy phone number"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </ContactRow>
                    )}

                    {bi.formattedAddress && (
                        <ContactRow
                            icon={
                                <>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </>
                            }
                            label="Address"
                            primary={primary}
                        >
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(bi.formattedAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 font-medium hover:text-gray-600 transition"
                            >
                                {bi.formattedAddress}
                            </a>
                        </ContactRow>
                    )}

                    {websiteUri && (
                        <ContactRow
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9"
                                />
                            }
                            label="Website"
                            primary={primary}
                        >
                            <a
                                href={websiteUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 font-medium hover:text-gray-600 transition"
                            >
                                {websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                        </ContactRow>
                    )}
                </div>
            </div>

            {/* Map Card - Separate */}
            {bi.formattedAddress && (
                <div className="bg-white rounded-xl border  overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5" style={{ color: primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Location Map
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{bi.formattedAddress}</p>
                    </div>

                    <div className="relative w-full h-[280px] bg-gray-100">
                        <iframe
                            suppressHydrationWarning
                            title="Location map"
                            width="100%"
                            height="100%"
                            loading="lazy"
                            className="w-full h-full"
                            style={{ border: 0 }}
                            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_PLACES_KEY}&q=${encodeURIComponent(bi.formattedAddress)}`}
                            onError={(e) => {
                                const iframe = e.target as HTMLIFrameElement;
                                iframe.style.display = 'none';
                                const parent = iframe.parentElement;
                                if (parent) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4';
                                    fallback.innerHTML = `
                                        <svg class="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        </svg>
                                        <p class="text-gray-600 text-sm text-center">View on Google Maps</p>
                                        <a href="https://maps.google.com/?q=${encodeURIComponent(bi.formattedAddress)}" 
                                           target="_blank" rel="noopener noreferrer"
                                           class="mt-2 text-sm font-medium hover:underline"
                                           style="color: ${primary}">
                                            Open in Google Maps →
                                        </a>
                                    `;
                                    parent.appendChild(fallback);
                                }
                            }}
                        />
                    </div>

                    <div className="p-3 bg-gray-50/50 text-center border-t border-gray-100">
                        <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(bi.formattedAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-80"
                            style={{ color: primary }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Get Directions on Google Maps
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            )}
        </div>
    </Section>
)}
                {/* Hours */}
                {hasHours && hours && (
                    <Section id="hours" title="Business Hours" primary={primary}>

                        {/* Status */}
                        {openNow !== null && (
                            <div className="mb-4 text-base font-medium">
                                <span className={openNow ? "text-emerald-600" : "text-red-600"}>
                                    {openNow ? "Open now" : "Closed now"}
                                </span>
                            </div>
                        )}

                        {/* Hours List */}
                        <div className="divide-y divide-gray-200">
                            {hours.map((line, i) => {
                                const colonIdx = line.indexOf(":");
                                const day = line.slice(0, colonIdx);
                                const time = line.slice(colonIdx + 1).trim();
                                const isClosed = time.toLowerCase() === "closed";

                                const today = new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                });
                                const isToday = day.toLowerCase() === today.toLowerCase();

                                return (
                                    <div
                                        key={i}
                                        className="flex justify-between items-center py-3 text-base"
                                    >
                                        <span
                                            className={`${isToday
                                                ? "text-gray-900 font-semibold"
                                                : "text-gray-700"
                                                }`}
                                        >
                                            {day}
                                        </span>

                                        <span
                                            className={`${isClosed
                                                ? "text-red-600 font-medium"
                                                : "text-gray-700"
                                                }`}
                                        >
                                            {time}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                    </Section>
                )}



                {/* Empty state */}
                {activeSections.length === 0 && (
                    <div className="text-center py-24">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                            style={{ backgroundColor: `${primary}15` }}
                        >
                            <svg
                                className="w-10 h-10"
                                style={{ color: primary }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Coming Soon</h3>
                        <p className="text-gray-500">This website is being set up. Check back soon.</p>
                    </div>
                )}

                {/* ── CTA Section ── */}
                {activeSections.length > 0 && (
                    <section className="py-12 px-4">
                        <div className="max-w-5xl mx-auto">
                            <div
                                className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-center"
                                style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}DD 100%)` }}
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

                                <div className="relative z-10">
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">
                                        Ready to Get Started?
                                    </h2>

                                    <p className="text-white/85 text-sm md:text-base max-w-2xl mx-auto mb-6">
                                        Take the next step toward your goals. Reach out today!
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        {phone && (
                                            <a href={`tel:${phone}`}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-white/20 backdrop-blur-sm border border-white/30 transition hover:bg-white/30 hover:scale-105">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                Call Now
                                            </a>
                                        )}

                                        {bi.formattedAddress && (
                                            <a href={`https://maps.google.com/?q=${encodeURIComponent(bi.formattedAddress)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 transition hover:bg-white/20 hover:scale-105">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Directions
                                            </a>
                                        )}
                                    </div>


                                </div>
                            </div>
                        </div>
                    </section>
                )}

            </main>





            {/* ── Footer ── */}
            <footer
                className="text-white"
                style={{ backgroundColor: primary }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Main Content */}
                    <div className="py-14 sm:py-18 border-b border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">

                            {/* Brand Section */}
                            <div className="md:col-span-1">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-white tracking-tight">{website.title}</h3>
                                </div>
                                {website.description && (
                                    <p className="text-white/70 text-sm leading-relaxed max-w-xs">
                                        {website.description.slice(0, 100)}
                                        {website.description.length > 100 ? "..." : ""}
                                    </p>
                                )}
                            </div>

                            {/* Contact Info */}
                            <div className="md:col-span-1">
                                <p className="text-xs font-bold text-white/90 uppercase tracking-widest mb-6">
                                    Contact
                                </p>
                                <div className="space-y-4">
                                    {phone && (
                                        <a
                                            href={`tel:${phone}`}
                                            className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors group"
                                        >
                                            <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span>{phone}</span>
                                        </a>
                                    )}
                                    {bi?.formattedAddress && (
                                        <a
                                            href={`https://maps.google.com/?q=${encodeURIComponent(bi.formattedAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 text-sm text-white/80 hover:text-white transition-colors group"
                                        >
                                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="line-clamp-2">{bi.formattedAddress}</span>
                                        </a>
                                    )}
                                    {websiteUri && (
                                        <a
                                            href={websiteUri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors group"
                                        >
                                            <svg className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4-3-9s1.34-9 3-9" />
                                            </svg>
                                            <span className="truncate">{websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Navigation */}
                            {activeSections.length > 0 && (
                                <div className="md:col-span-1">
                                    <p className="text-xs font-bold text-white/90 uppercase tracking-widest mb-6">
                                        Navigate
                                    </p>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                                        {activeSections.map((s) => (
                                            <a
                                                key={s}
                                                href={`#${s}`}
                                                className="relative text-sm text-white/80 hover:text-white transition-all duration-300 capitalize font-medium group"
                                            >
                                                <span className="relative inline-block transition-transform duration-300 group-hover:translate-x-2">
                                                    {s}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                        <span className="text-white/60">
                            © {new Date().getFullYear()} {website.title}. All rights reserved.
                        </span>

                        <div className="flex items-center gap-1.5 text-white/60">
                            <span>Powered by</span>
                            <a
                                href="https://rankerly.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                Rankerly
                            </a>
                        </div>
                    </div>
                </div>
            </footer>



        </div>
    );
}
