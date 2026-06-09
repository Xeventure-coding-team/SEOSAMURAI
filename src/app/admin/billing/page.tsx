import PageHeader from '@/components/admin/page-header'
import StripeDashboard from '@/components/admin/StripeDashboard'
import React from 'react'

function page() {
  return (
    <div>
      <div>
        <PageHeader
          title="Billing"
          description="View, manage, and monitor all payments and bills."
        />
        <div className="mt-8">
          <StripeDashboard />
        </div>
      </div>
    </div>
  )
}

export default page