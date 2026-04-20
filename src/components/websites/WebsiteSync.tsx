import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { RefreshCw, Check, AlertCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncStatus {
    current: {
        lastSyncedAt: string | null;
        nextSyncAt: string | null;
        isSyncing: boolean;
        lastSyncError: string | null;
        syncRetryCount: number;
    };
    history: Array<{
        id: string;
        syncType: string;
        status: string;
        reviewsCount?: number;
        photosCount?: number;
        postsCount?: number;
        errorMessage?: string;
        fetchedAt: string;
        completedAt?: string;
        duration?: number;
    }>;
}

interface SyncResponse {
    message: string;
    website: {
        id: string;
        subdomain: string;
        title: string;
    };
    sync: {
        reviewsCount: number;
        photosCount: number;
        postsCount: number;
        businessInfo: {
            displayName: string;
            rating: number | null;
            totalReviewCount: number;
        };
        lastSyncedAt: string;
        nextSyncAt: string;
    };
}

interface WebsiteSyncProps {
    websiteId: string;
    websiteTitle: string;
    onSyncComplete?: (response: SyncResponse) => void;
}



export function WebsiteSync({
    websiteId,
    websiteTitle,
    onSyncComplete,
}: WebsiteSyncProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [expandHistory, setExpandHistory] = useState(false);

    // ✅ Fetch sync status on mount
    useEffect(() => {
        fetchSyncStatus();
    }, [websiteId]);

    const fetchSyncStatus = async () => {
        try {
            setIsLoadingStatus(true);
            const response = await axios.get(`/api/websites/${websiteId}/sync`);
            setSyncStatus(response.data);
        } catch (error: any) {
            console.error('Failed to fetch sync status:', error);
            toast.error('Failed to load sync status');
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        const loadingToast = toast.loading('Syncing website data from Google My Business...');

        try {
            const response = await axios.post(`/api/websites/${websiteId}/sync`);
            const syncData: SyncResponse = response.data;

            setSyncStatus({
                current: {
                    lastSyncedAt: syncData.sync.lastSyncedAt,
                    nextSyncAt: syncData.sync.nextSyncAt,
                    isSyncing: false,
                    lastSyncError: null,
                    syncRetryCount: 0,
                },
                history: syncStatus?.history || [],
            });

            toast.success(
                `✅ Synced! ${syncData.sync.reviewsCount} reviews, ${syncData.sync.photosCount} photos`,
                { id: loadingToast }
            );

            if (onSyncComplete) {
                onSyncComplete(syncData);
            }

            // Refresh status after 2 seconds
            setTimeout(fetchSyncStatus, 2000);

        } catch (error: any) {
            const errorMsg =
                error.response?.data?.details ||
                error.response?.data?.error ||
                error.message ||
                'Failed to sync website';

            toast.error(`Sync failed: ${errorMsg}`, { id: loadingToast });
        } finally {
            setIsSyncing(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
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
    };

    if (isLoadingStatus) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    const lastSync = syncStatus?.current?.lastSyncedAt;
    const nextSync = syncStatus?.current?.nextSyncAt;
    const latestHistory = syncStatus?.history?.[0];

    return (
        <div className="space-y-6">
 
 {/* ===== SYNC TRIGGER SECTION ===== */}
<div className="p-5 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl shadow-sm">
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
    <div>
      <h3 className="font-semibold text-gray-900 text-lg">Sync Website Data</h3>
      <p className="text-sm text-gray-600 mt-1">
        Refresh reviews, photos, posts, and business info from Google My Business
      </p>
    </div>

    {/* Sync Button - moved to top right on larger screens */}
    <Button
      onClick={handleSync}
      disabled={isSyncing || syncStatus?.current?.isSyncing}
      className="w-full sm:w-auto shrink-0"
      variant={isSyncing ? 'outline' : 'default'}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </Button>
  </div>

  {/* Status Cards Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
    {/* Last Synced */}
    <div className="flex items-center gap-2.5 text-sm bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
      <div className="p-1.5 bg-gray-100 rounded-full">
        <Clock className="w-4 h-4 text-gray-600" />
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Last Synced</div>
        <div className="font-medium text-gray-900">{formatDate(lastSync)}</div>
      </div>
    </div>

    {/* Data Counts */}
    <div className="flex items-center gap-2.5 text-sm bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
      <div className="p-1.5 bg-blue-100 rounded-full">
        <TrendingUp className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Data Stored</div>
        <div className="font-medium text-gray-900">
          {latestHistory?.reviewsCount || 0} reviews, {latestHistory?.photosCount || 0} photos
        </div>
      </div>
    </div>

    {/* Status */}
    <div className="flex items-center gap-2.5 text-sm bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
      <div className={`p-1.5 rounded-full ${
        syncStatus?.current?.isSyncing ? 'bg-blue-100' :
        syncStatus?.current?.lastSyncError ? 'bg-red-100' : 'bg-green-100'
      }`}>
        {syncStatus?.current?.isSyncing ? (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : syncStatus?.current?.lastSyncError ? (
          <AlertCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Check className="w-4 h-4 text-green-600" />
        )}
      </div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">System Status</div>
        <div className={`font-medium ${
          syncStatus?.current?.isSyncing ? 'text-blue-600' :
          syncStatus?.current?.lastSyncError ? 'text-red-600' : 'text-green-600'
        }`}>
          {syncStatus?.current?.isSyncing ? 'Syncing...' :
           syncStatus?.current?.lastSyncError ? 'Error' : 'Ready'}
        </div>
      </div>
    </div>

    {/* Next Scheduled Sync */}
    {nextSync && (
      <div className="flex items-center gap-2.5 text-sm bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
        <div className="p-1.5 bg-purple-100 rounded-full">
          <Calendar className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Next Auto Sync</div>
          <div className="font-medium text-gray-900">{formatDate(nextSync)}</div>
          <div className="text-[11px] text-gray-400">scheduled daily</div>
        </div>
      </div>
    )}
  </div>

  {/* Error Message with better styling */}
  {syncStatus?.current?.lastSyncError && (
    <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-md text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <strong className="text-red-800">Sync failed:</strong>
          <span className="text-red-700 ml-1">{syncStatus.current.lastSyncError}</span>
          {syncStatus?.current?.syncRetryCount > 0 && (
            <div className="text-xs text-red-600 mt-1">
              Failed attempts: {syncStatus.current.syncRetryCount}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* Success Message - new addition */}
  {!syncStatus?.current?.isSyncing && 
   !syncStatus?.current?.lastSyncError && 
   lastSync && 
   new Date(lastSync).toDateString() === new Date().toDateString() && (
    <div className="mt-3 p-2.5 bg-green-50 border-l-4 border-green-500 rounded-md text-sm text-green-700">
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        <span>✓ Sync completed successfully today</span>
      </div>
    </div>
  )}
</div>

 {/* ===== SYNC HISTORY SECTION ===== */}
{syncStatus?.history && syncStatus.history.length > 0 && (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <button
      onClick={() => setExpandHistory(!expandHistory)}
      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between font-medium text-gray-900"
    >
      <span>Sync History ({syncStatus.history.length})</span>
      <svg
        className={`w-5 h-5 transition-transform ${expandHistory ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {expandHistory && (
      <div className="divide-y divide-gray-100">
        {syncStatus.history.map((sync, idx) => (
          <div key={sync.id || idx} className="p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {sync.status === 'success' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium text-gray-900">
                  {sync.syncType === 'manual' ? 'Manual' : 'Auto'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatDate(sync.fetchedAt)}
              </span>
            </div>

            {sync.status === 'success' ? (
              <div className="text-gray-600 text-xs ml-6">
                {sync.reviewsCount || 0} reviews · {sync.photosCount || 0} photos
              </div>
            ) : (
              <div className="text-red-600 text-xs ml-6">
                {sync.errorMessage || 'Sync failed'}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}

            {/* ===== INFO BOX ===== */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                <strong>⚠️ Safe sync:</strong> Only cached data is refreshed. Your website settings, colors, and customizations remain unchanged. Data that fails to sync is preserved from the last successful sync.
            </div>
        </div>
    );
}

export default WebsiteSync;