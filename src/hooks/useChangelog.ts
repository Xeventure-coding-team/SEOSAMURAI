import { useState, useEffect, useCallback } from 'react';

interface ChangelogEntry {
  id: string;
  title: string;
  version: string;
  body: string;
  type?: "added" | "fixed" | "changed" | "removed" | "security" | null;
  releaseDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UseChangelogOptions {
  limit?: number;
  type?: string;
  version?: string;
  autoFetch?: boolean;
}

export function useChangelog(options: UseChangelogOptions = {}) {
  const { limit, type, version, autoFetch = true } = options;
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChangelog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (type) params.append('type', type);
      if (version) params.append('version', version);

      const url = `/api/changelog${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch changelog');
      }
      
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [limit, type, version]);

  const getLatest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/changelog/latest');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch latest changelog');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getByVersion = useCallback(async (version: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/changelog/version/${version}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch changelog version');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createEntry = useCallback(async (data: Partial<ChangelogEntry>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/changelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create changelog entry');
      }
      
      const newEntry = await response.json();
      setEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEntry = useCallback(async (id: string, data: Partial<ChangelogEntry>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/changelog/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update changelog entry');
      }
      
      const updated = await response.json();
      setEntries(prev => prev.map(entry => 
        entry.id === id ? updated : entry
      ));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/changelog/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete changelog entry');
      }
      
      setEntries(prev => prev.filter(entry => entry.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchChangelog();
    }
  }, [autoFetch, fetchChangelog]);

  return {
    entries,
    loading,
    error,
    fetchChangelog,
    getLatest,
    getByVersion,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}