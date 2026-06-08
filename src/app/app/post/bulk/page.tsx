import DashboardLayout from '@/app/layouts/DashboardLayout'
import GMBLocationSelector from '@/components/bulk/GMBLocationSelector'
import { PlanGate } from '@/components/PlanGate'
import React from 'react'

export const metadata = {
  title: `Bulk Posting | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout>
      <PlanGate mode={{ type: "feature", feature: "bulkPosts" }} featureName="Bulk Posting">
        <GMBLocationSelector />
      </PlanGate>
    </DashboardLayout>
  )
}

export default page