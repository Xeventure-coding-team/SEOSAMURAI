import DashboardLayout from "@/app/layouts/DashboardLayout";
import SharedGoogleReviewPosterList from "@/components/shared-google-review-poster/SharedGoogleReviewPosterList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Poster | GMB Samurai",
};

export default function SharedGoogleReviewPosterPage() {
  return (
    <DashboardLayout>
       <SharedGoogleReviewPosterList />
    </DashboardLayout>
  );
}
