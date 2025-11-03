import DashboardLayout from '@/app/layouts/DashboardLayout'
import SchedulePosts from '@/components/schedule/SchedulePosts'
import React from 'react'

export const metadata = {
  title: `Schedule Posting | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout>
      <SchedulePosts />
    </DashboardLayout>
  )
}

export default page