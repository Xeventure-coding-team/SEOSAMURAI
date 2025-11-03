import DashboardLayout from '@/app/layouts/DashboardLayout'
import ManageLocation from '@/components/locations/ManageLocation'
import React from 'react'

export const metadata = {
  title: `${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><ManageLocation /></DashboardLayout>
  )
}

export default page