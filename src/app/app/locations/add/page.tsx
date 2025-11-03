import DashboardLayout from '@/app/layouts/DashboardLayout'
import AddLocations from '@/components/locations/AddLocations'
import React from 'react'

export const metadata = {
  title: `Add Location | ${process.env.APP_NAME}`,
}


function page() {
  return (
    <DashboardLayout><AddLocations /></DashboardLayout>
  )
}

export default page