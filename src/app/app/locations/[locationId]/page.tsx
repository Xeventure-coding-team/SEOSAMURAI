import DashboardLayout from '@/app/layouts/DashboardLayout'
import LocationDetailsPage from '@/components/locations/LocationDetails'
import React from 'react'

export const metadata = {
  title: `${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><LocationDetailsPage /></DashboardLayout>
  )
}

export default page