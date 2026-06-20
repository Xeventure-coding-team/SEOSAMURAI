import PageHeader from '@/components/admin/page-header'
import SettingsClient from '@/components/admin/settings-client'

export default function page() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account preferences, security, and application settings."
      />
      <div className="mt-8">
        <SettingsClient />
      </div>
    </div>
  )
}