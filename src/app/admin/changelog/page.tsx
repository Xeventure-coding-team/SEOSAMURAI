import PageHeader from '@/components/admin/page-header'
import ChangeLogPage from '@/components/changelog/ChangeLogPage'
import React from 'react'

function page() {
    return (
        <div>
            <div>
                <PageHeader
                    title="Changelog"
                    description="Track product updates, improvements, bug fixes, and new features."
                />
                <div className="mt-8">
                 <ChangeLogPage />
                </div>
            </div>
        </div>
    )
}

export default page