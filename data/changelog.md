# Changelog

All notable changes to Rankerly are documented here, in reverse chronological order.

---

## [1.8.0] — 2026-06-12

### Added — Geo-Grid Scan

Visualize your true map pack visibility across a geographic grid, not just a single point. You can configure the grid from 3×3 up to 9×9, with a color-coded rank heatmap per keyword so you can see exactly where your GBP ranks strong and where it drops off. Grids can be exported as PNG for client reports.

---

## [1.7.2] — 2026-06-03

### Fixed

Geo-grid scans were timing out in dense urban areas on larger grid sizes. The progress indicator was also freezing mid-scan instead of updating in real time, and scan history wasn't persisting after page navigation. All three are resolved in this patch.

---

## [1.7.0] — 2026-05-22

### Added — Competitor Tracking

Benchmark your local SEO performance against nearby competitors. Add up to 10 competitors per location and compare keyword rankings side by side. You can also see competitor review counts and average ratings at a glance, with a weekly movement summary surfaced directly in your dashboard.

---

## [1.6.2] — 2026-05-14

### Fixed

The competitor list was not saving correctly when more than 5 entries were added. The rank comparison chart was rendering blank on Safari, and competitor names were truncating incorrectly on mobile screens. All fixed in this release.

---

## [1.6.0] — 2026-05-06

### Added — AI Poster

Turn your best customer reviews into shareable branded graphics. Pick from multiple layout templates, and Rankerly auto-pulls your business name and location details to populate the design. Download as PNG sized for Instagram, Facebook, and WhatsApp. Available on Growth and Pro plans.

---

## [1.5.3] — 2026-04-28

### Fixed

PNG export was broken on Safari 17 due to a difference in the canvas API — a fallback renderer has been added for WebKit browsers. The poster preview dimensions were also not matching the final export, and business names longer than ~25 characters were overflowing the poster layout. Both are fixed.

---

## [1.5.0] — 2026-04-17

### Added — Tracked Reviews

Monitor reviews that get deleted or removed by Google. Rankerly now automatically detects removed reviews per location and keeps a full archive with the review content, star rating, and removal date. You'll receive an email notification whenever a review disappears.

---

## [1.4.4] — 2026-04-09

### Fixed

Some users were receiving duplicate removal alert emails for the same review. Alert emails were also missing the location name in the subject line, making them hard to act on quickly. The removed review count on the dashboard was also showing stale data until a manual refresh — all resolved.

---

## [1.4.2] — 2026-04-02

### Changed — Performance

Dashboard load time has been reduced from around 4 seconds to under 1 second for accounts with 5 or more locations. Location cards below the fold now load lazily, and skeleton loaders that were getting stuck on slow connections now clear correctly once data arrives.

---

## [1.4.0] — 2026-03-28

### Changed — Keyword Tracking overhaul

Keyword tracking has been rebuilt from the ground up. Each keyword now has a rank history graph, and you can see local pack and organic rank as separate views. Keyword suggestions based on your GBP category are also available to help you expand your tracking. Ranks now refresh daily on all plans instead of weekly.

---

## [1.3.3] — 2026-03-19

### Fixed

Keywords containing special characters like &, /, and + were not being tracked at all. A separate caching bug was causing some keywords to always return position 1 regardless of actual rank. Rank cards now also display the last updated timestamp so you always know how fresh the data is.

---

## [1.3.0] — 2026-03-05

### Added — Scheduled Posts

Plan your GBP content calendar and automate post delivery. You can queue posts up to 90 days in advance, set weekly or monthly recurring schedules, and use draft mode to review content before it goes live. A calendar view gives you a full picture of your upcoming post schedule at a glance.

---

## [1.2.4] — 2026-02-25

### Fixed

Scheduled posts were publishing one hour early for users in IST and other UTC+ timezones. Timezone is now stored per location rather than inferred from the browser, and a timezone selector has been added to the scheduling flow. Recurring posts that were stopping after the first occurrence are also fixed.

---

## [1.2.0] — 2026-02-12

### Added — Bulk Posting

Publish the same post across multiple locations in a single action. You can select any combination of your locations, use per-location variable substitution with tags like `{{location_name}}` and `{{city}}`, and preview each variation before publishing. Bulk post history is tracked per location.

---

## [1.1.4] — 2026-02-05

### Fixed

When a GBP OAuth token expired, users were landing on a blank locations page with no way to recover without contacting support. A reconnect prompt now appears automatically. Disconnected locations were also still showing as active in the sidebar, and location sync was failing silently for accounts with more than 3 locations.

---

## [1.1.2] — 2026-01-29

### Fixed

Pro plan users were incorrectly hitting Starter-tier AI reply limits. The reply quota was also not resetting at the start of a new billing cycle, and the quota counter wasn't updating in real time after a reply was sent. All three issues are resolved.

---

## [1.1.0] — 2026-01-20

### Changed — Improved AI review reply accuracy

The AI reply engine has been significantly updated to produce more natural, context-aware responses. Replies now reference your business name and location, and tone is matched to the sentiment of the review — a response to a 1★ review reads differently from one to a 5★. Generic phrasing that didn't address the actual review content has been reduced, and replies are shorter and more conversational by default.

---

## [1.0.4] — 2026-01-08

### Added — Websites

Build SEO-optimized local landing pages for each of your GBP locations. Pages are auto-populated with your business name, address, hours, and top reviews, and each location gets a custom subdomain. Pages are optimized for Core Web Vitals out of the box and indexed automatically by Google.

---

## [1.0.2] — 2025-12-29

### Fixed

The billing page was returning blank for accounts created before December 15. The plan badge was showing Starter for active Pro subscribers, and downloading invoices older than 30 days was returning an error. All fixed in this patch.

---

## [1.0.1] — 2025-12-19

### Fixed

AI review replies were silently failing to post for a subset of users due to unhandled rate limit responses from the GBP API. A reply status indicator has been added to each review card showing Pending, Posted, or Failed so you always know what happened. The review list was also not paginating past the first 10 entries.

---

## [1.0.0] — 2025-12-10

### Rankerly public launch

Rankerly is live. The initial release includes location management for Google Business Profiles, review monitoring with AI-powered reply suggestions, keyword rank tracking, and Review Poster for turning reviews into social graphics. Starter, Growth, and Pro plans are available via Stripe with full billing and subscription management.