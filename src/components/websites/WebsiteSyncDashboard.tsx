"use client"

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Image, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import WebsiteSync from './WebsiteSync';
import { usePageStore } from '@/store/usePageStore';

interface WebsiteDataOverview {
    website: {
        id: string;
        subdomain: string;
        title: string;
        description?: string;
        logoUrl?: string;
        isPublished: boolean;
        cachedData?: {
            businessInfo: any;
            reviews: any[];
            photos: any[];
            posts: any[];
            lastSyncedAt?: string;
        };
    }
}

interface WebsiteSyncDashboardProps {
    websiteId: string;
}

export function WebsiteSyncDashboard({ websiteId }: WebsiteSyncDashboardProps) {
    const [websiteData, setWebsiteData] = useState<WebsiteDataOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const setPageName = usePageStore((state) => state.setPageName);

    useEffect(() => {
        fetchWebsiteData();
        setPageName('Sync Website')
    }, [websiteId]);


    const fetchWebsiteData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await axios.get(`/api/websites/${websiteId}`);
            setWebsiteData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load website data');
            console.error('Error fetching website data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncComplete = (syncResponse: any) => {
        // Refresh website data after successful sync
        fetchWebsiteData();
    };

    const formatLastSynced = (dateStr?: string) => {
        if (!dateStr) return 'Never synced';

        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return `${diffDays}d ago`;
        } catch (e) {
            return 'Invalid date';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                {error}
            </div>
        );
    }

    if (!websiteData) {
        return (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                Website not found
            </div>
        );
    }

    const businessInfo = websiteData?.website.cachedData?.businessInfo || {};
    const reviews = websiteData?.website.cachedData?.reviews || [];
    const photos = websiteData?.website.cachedData?.photos || [];
    const lastSyncedAt = websiteData?.website.cachedData?.lastSyncedAt;

    return (
        <div className="space-y-6">
            {/* ===== BUSINESS INFO CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Reviews Count */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Reviews</h4>
                        <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
                    <p className="text-xs text-gray-500 mt-1">
                        Rating: {businessInfo.rating ? businessInfo.rating.toFixed(1) : 'N/A'} ⭐
                    </p>
                </div>

                {/* Photos Count */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Photos</h4>
                        <Image className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{photos.length}</div>
                    <p className="text-xs text-gray-500 mt-1">From Google My Business</p>
                </div>

                {/* Last Synced */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Last Synced</h4>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                        {formatLastSynced(lastSyncedAt)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {lastSyncedAt
                            ? new Date(lastSyncedAt).toLocaleDateString()
                            : 'Not available'}
                    </p>
                </div>

                {/* Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Status</h4>
                        <BarChart3 className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {websiteData?.website.isPublished ? '🟢' : '⚪'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {websiteData?.website.isPublished ? 'Published' : 'Not Published'}
                    </p>
                </div>
            </div>

            {/* ===== BUSINESS INFO ===== */}
            {businessInfo.displayName && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Business Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase">Business Name</label>
                            <p className="text-gray-900 mt-1">{businessInfo.displayName}</p>
                        </div>

                        {businessInfo.formattedAddress && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Address</label>
                                <p className="text-gray-900 mt-1">{businessInfo.formattedAddress}</p>
                            </div>
                        )}

                        {businessInfo.phoneNumber && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                                <p className="text-gray-900 mt-1">{businessInfo.phoneNumber}</p>
                            </div>
                        )}

                        {businessInfo.websiteUri && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Website</label>
                                <a
                                    href={businessInfo.websiteUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline mt-1 block"
                                >
                                    {businessInfo.websiteUri}
                                </a>
                            </div>
                        )}

                        {businessInfo.totalReviewCount && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Total Reviews</label>
                                <p className="text-gray-900 mt-1">{businessInfo.totalReviewCount}</p>
                            </div>
                        )}

                        {businessInfo.rating && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Average Rating</label>
                                <p className="text-gray-900 mt-1">
                                    {businessInfo.rating.toFixed(1)} ⭐
                                </p>
                            </div>
                        )}
                    </div>

                    {businessInfo.description && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                            <p className="text-gray-900 mt-1">{businessInfo.description}</p>
                        </div>
                    )}

                    {businessInfo.openingHours && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <label className="text-xs font-medium text-gray-500 uppercase">Opening Hours</label>
                            <div className="text-gray-900 mt-1">
                                <pre className="text-xs bg-gray-50 p-2 rounded">
                                    {JSON.stringify(businessInfo.openingHours, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== SYNC COMPONENT ===== */}
            <WebsiteSync
                websiteId={websiteId}
                websiteTitle={websiteData?.website.title}
                onSyncComplete={handleSyncComplete}
            />
        </div>
    );
}

export default WebsiteSyncDashboard;