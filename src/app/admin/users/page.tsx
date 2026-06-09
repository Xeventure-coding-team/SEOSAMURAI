import PageHeader from '@/components/admin/page-header'
import { UsersTable } from '@/components/admin/users-table'
import React from 'react'

function page() {
    return (
        <div>
            <PageHeader
                title="Users"
                description="View, manage, and monitor all registered users."
            />
            <div className="mt-8">
                <UsersTable />
            </div>
        </div>
    )
}

export default page