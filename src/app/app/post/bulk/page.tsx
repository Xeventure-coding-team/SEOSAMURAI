import DashboardLayout from '@/app/layouts/DashboardLayout'
import GMBLocationSelector from '@/components/bulk/GMBLocationSelector'
import React from 'react'

export const metadata = {
  title: `Bulk Posting | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout>
      <GMBLocationSelector />
    </DashboardLayout>
  )
}

export default page