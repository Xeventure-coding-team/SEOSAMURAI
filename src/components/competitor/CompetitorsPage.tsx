"use client";

import React from 'react'
import { CompetitorAnalysisWithMap } from './CompetitorAnalysis';

function CompetitorsPage({
    locationId,
    businessType,
    coordinates
}: {
    locationId: string;
    businessType: string;
    coordinates: { lat: number; lng: number } | null;
}) {
    return (
        <div><CompetitorAnalysisWithMap locationId={locationId} businessType={businessType} coordinates={coordinates} /></div>
    )
}

export default CompetitorsPage