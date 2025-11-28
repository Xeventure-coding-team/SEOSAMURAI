import DashboardLayout from '@/app/layouts/DashboardLayout'
import HelpDeskPage from '@/components/help-desk/HelpDeskPage'
import React from 'react'

export default function page() {
    return (
        <DashboardLayout>
            <HelpDeskPage />
        </DashboardLayout>
    )
}
