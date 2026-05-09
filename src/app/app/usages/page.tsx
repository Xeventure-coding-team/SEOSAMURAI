import DashboardLayout from '@/app/layouts/DashboardLayout'
import UsagePage from '@/components/usages/UsagePage'
import React from 'react'

export const metadata = {
  title: `Usages | ${process.env.APP_NAME}`,
}

function page() {
  return (
    <DashboardLayout><UsagePage /></DashboardLayout>
  )
}

export default page