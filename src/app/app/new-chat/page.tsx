import DashboardLayout from '@/app/layouts/DashboardLayout'
import ChatPage from '@/components/chat/ChatPage'
import React from 'react'

function page() {
  return (
    <DashboardLayout>
      <ChatPage />
    </DashboardLayout>
  )
}

export default page