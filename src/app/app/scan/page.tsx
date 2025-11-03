import DashboardLayout from '@/app/layouts/DashboardLayout'
import GMBLocationMapInterface from '@/components/scan/GMBLocationMapInterface'
import React from 'react'

export const metadata = {
  title: `Run a Scan | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><GMBLocationMapInterface /></DashboardLayout>
  )
}

export default page