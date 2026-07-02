import DashboardLayout from '@/app/layouts/DashboardLayout'
import AddLocations from '@/components/locations/AddLocations'
import { PlanGate } from '@/components/PlanGate'
import React from 'react'

export const metadata = {
  title: `Add Location — ${process.env.APP_NAME}`,
}


function page() {
  return (
    <DashboardLayout>
      <PlanGate mode={{ type: "slot", slot: "locations" }} featureName="Locations">
        <AddLocations />
      </PlanGate>
    </DashboardLayout>
  )
}

export default page