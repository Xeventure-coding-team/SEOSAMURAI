import PageHeader from '@/components/admin/page-header'
import UsageDashboard from '@/components/admin/UsageDashboard'
import React from 'react'

function page() {
    return (
        <div>
            <div>
                <PageHeader
                    title="Usage Analytics Dashboard"
                    description="View, manage, and monitor all payments and bills."
                />
                <div className="mt-8">
                   <UsageDashboard />
                </div>
            </div>
        </div>
    )
}

export default page