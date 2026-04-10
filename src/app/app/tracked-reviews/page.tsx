import DashboardLayout from '@/app/layouts/DashboardLayout'
import TrackedReviewsPage from '@/components/tracked-review/TrackedReviewsPage'
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tracked reviews | Rankerly",
};

function page() {
    return (
        <DashboardLayout>
            <TrackedReviewsPage />
        </DashboardLayout>
    )
}

export default page