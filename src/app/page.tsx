import HomePage from '@/components/frontend/HomePage'
import React from 'react'
import { createMetadata } from '../../lib/metadata';

export const metadata = createMetadata({
  title: "Home",
  description: "Automate local SEO growth for your Google Business Profile.",
  slug: "/",
});

function page() {
  return (
    <div>
      <HomePage />
    </div>
  )
}

export default page