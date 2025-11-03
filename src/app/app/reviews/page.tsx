import DashboardLayout from '@/app/layouts/DashboardLayout'
import UnrepliedReviewsComponent from '@/components/unreplied-reviews/UnrepliedReviewsComponent'
import React from 'react'

export const metadata = {
  title: `Reviews | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><UnrepliedReviewsComponent /></DashboardLayout>
  )
}

export default page