"use client";
import { usePageStore } from '@/store/usePageStore';
import React, { useEffect } from 'react'

function BillingsPage() {

  const setName = usePageStore((state) => state.setPageName);

  useEffect(() => {
    setName('Billing & Settings')
  }, [])

  return (
    <div>
      
    </div>
  )
}

export default BillingsPage