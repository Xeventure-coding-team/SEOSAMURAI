import DashboardLayout from '@/app/layouts/DashboardLayout'
import DashboardStats from '@/components/dashboard/DashboardStats'

import React from 'react'

export const metadata = {
  title: `Dashboard | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout>
      <DashboardStats />
    </DashboardLayout>
  )
}

export default page 