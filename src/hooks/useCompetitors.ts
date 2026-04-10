import { useState, useEffect } from 'react';

interface KeywordRanking {
    keyword: string;
    rank: number;
    url?: string;
    title?: string;
}

interface EnhancedCompetitor {
    id: string;
    name: string;
    domain?: string;
    address?: string;
    rating?: number;
    reviewCount?: number;
    distance?: number;
    googleMapsUri?: string;
    website?: string;
    coordinates?: { lat: number; lng: number };
    keywordRankings: KeywordRanking[];
    averageRank?: number;
    totalKeywordsRanked?: number;
    rank: number;
    bestRank: number;
    worstRank: number;
}

interface UseCompetitorsReturn {
    competitors: EnhancedCompetitor[];
    hasKeywords: boolean;
    trackedKeywordsCount: number;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useCompetitors(
    locationId: string,
    businessName: string | null,
    coordinates: { lat: number; lng: number } | null,
    businessType
    
): UseCompetitorsReturn {
    const [competitors, setCompetitors] = useState<EnhancedCompetitor[]>([]);
    const [hasKeywords, setHasKeywords] = useState(false);
    const [trackedKeywordsCount, setTrackedKeywordsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    

    const fetchCompetitors = async () => {
        if (!locationId || !coordinates) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);


        try {
            const params = new URLSearchParams({
                lat: coordinates.lat.toString(),
                lng: coordinates.lng.toString(),
                businessType: businessType
            });

            if (businessName) {
                params.append('businessName', businessName);
            }

            const response = await fetch(`/api/competitors/${locationId}?${params}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch competitors');
            }

            const result = await response.json();

            if (result.success) {
                setCompetitors(result.data.competitors || []);
                setHasKeywords(result.data.hasKeywords || false);
                setTrackedKeywordsCount(result.data.metadata?.trackedKeywordsCount || 0);
            } else {
                throw new Error(result.error || 'Failed to load competitors');
            }
        } catch (err) {
            console.error('Error fetching competitors:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setCompetitors([]);
            setHasKeywords(false);
            setTrackedKeywordsCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetitors();
    }, [locationId, businessName, coordinates?.lat, coordinates?.lng]);

    return {
        competitors,
        hasKeywords,
        trackedKeywordsCount,
        
        loading,
        error,
        refetch: fetchCompetitors,
    };
}