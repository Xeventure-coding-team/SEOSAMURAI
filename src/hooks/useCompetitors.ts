import { useState, useEffect } from 'react';

interface Competitor {
  id: string;
  name: string;
  address: string;
  businessType: string;
  distance: number;
  googleMapsUri: string;
  lastUpdated: string;
  rank: number;
  rating?: number;
  reviewCount?: number;
}

interface CompetitorResult {
  competitors: Competitor[];
  nextUpdateTime: Date | null;
  canUpdate: boolean;
  hoursUntilNextUpdate: number;
}

export function useCompetitors(
  locationId: string,
  businessType: string,
  coordinates: { lat: number; lng: number } | null
) {
  const [data, setData] = useState<CompetitorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId || !businessType || !coordinates) return;

    const fetchCompetitors = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/competitors/${locationId}?businessType=${encodeURIComponent(businessType)}&lat=${coordinates.lat}&lng=${coordinates.lng}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch competitors');
        }

        const result = await response.json();
        
        // Handle the nested API response structure
        if (result.success && result.data) {
          const { competitors, metadata } = result.data;
          
          setData({
            competitors: competitors || [],
            nextUpdateTime: metadata?.nextUpdateTime ? new Date(metadata.nextUpdateTime) : null,
            canUpdate: metadata?.canUpdate || false,
            hoursUntilNextUpdate: metadata?.hoursUntilNextUpdate || 0
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitors();
  }, [locationId, businessType, coordinates]);

  const refetch = async () => {
    if (!locationId || !businessType || !coordinates) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/competitors/${locationId}?businessType=${encodeURIComponent(businessType)}&lat=${coordinates.lat}&lng=${coordinates.lng}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch competitors');
      }

      const result = await response.json();
      
      // Handle the nested API response structure
      if (result.success && result.data) {
        const { competitors, metadata } = result.data;
        
        setData({
          competitors: competitors || [],
          nextUpdateTime: metadata?.nextUpdateTime ? new Date(metadata.nextUpdateTime) : null,
          canUpdate: metadata?.canUpdate || false,
          hoursUntilNextUpdate: metadata?.hoursUntilNextUpdate || 0
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { 
    competitors: data?.competitors || [], 
    nextUpdateTime: data?.nextUpdateTime,
    canUpdate: data?.canUpdate || false,
    hoursUntilNextUpdate: data?.hoursUntilNextUpdate || 0,
    loading, 
    error,
    refetch
  };
}