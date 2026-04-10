import DashboardLayout from "@/app/layouts/DashboardLayout";
import SharedGoogleReviewPosterCreate from "@/components/shared-google-review-poster/SharedGoogleReviewPosterCreate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Review Poster | Rankerly",
};

export default function SharedGoogleReviewPosterCreatePage() {
  return (
    <DashboardLayout>
      <SharedGoogleReviewPosterCreate />
    </DashboardLayout>
  );
}
