import DashboardLayout from '@/app/layouts/DashboardLayout'
import LocationsList from '@/components/locations/LocationsList'
import React from 'react'

export const metadata = {
  title: `Locations | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><LocationsList /></DashboardLayout>
  )
}

export default page