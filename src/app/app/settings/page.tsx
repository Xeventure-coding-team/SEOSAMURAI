import DashboardLayout from '@/app/layouts/DashboardLayout'
import { AccountSettings } from '@hexclave/next'
import React from 'react'

export const metadata = {
  title: `Account Settings | ${process.env.APP_NAME}`,
}

export default function Page() {
  return (
    <DashboardLayout>
      <AccountSettings fullPage={true} />
    </DashboardLayout>
  )
}
