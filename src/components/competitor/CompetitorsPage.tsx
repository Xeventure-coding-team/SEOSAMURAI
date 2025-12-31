"use client";

import React from 'react'
import { CompetitorAnalysisWithMap } from './CompetitorAnalysis';

function CompetitorsPage({
    locationId,
    businessType,
    coordinates,
      businessName
}: {
    locationId: string;
    businessType: string;
    businessName: string;
    coordinates: { lat: number; lng: number } | null;
}) {
    return (
        <div><CompetitorAnalysisWithMap locationId={locationId} businessType={businessType} coordinates={coordinates} businessName={businessName}/></div>
    )
}

export default CompetitorsPage