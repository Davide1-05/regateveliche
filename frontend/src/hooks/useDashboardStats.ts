/**
 * Custom React Hook for Dashboard Statistics
 * 
 * Provides real-time counter values with automatic polling,
 * loading states, error handling, and proper cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DashboardStats {
  active_regattas: number;
  registered_sailors: number;
  upcoming_events: number;
  total_registrations: number;
  last_updated: string;
}

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isPollingActive: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_POLLING_INTERVAL = 30000;

export function useDashboardStats(
  pollingInterval: number = DEFAULT_POLLING_INTERVAL
): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(false);

  // Refs for managing polling lifecycle
  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch stats from API
  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (isMountedRef.current) {
        setStats(data);
        setIsLoading(false);
      }
    } catch (err) {
      // Ignore abort errors - they're expected during cleanup
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      if (isMountedRef.current) {
        setError(errorObj);
        setIsLoading(false);
      }
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    stopPolling();
    setIsPollingActive(true);

    // Initial fetch
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    fetchStats(abortControllerRef.current.signal).then(() => {
      if (isPollingActive) {
        pollTimerRef.current = window.setInterval(async () => {
          if (!isMountedRef.current) return;

          // Cancel previous request before starting new one
          abortControllerRef.current?.abort();
          abortControllerRef.current = new AbortController();

          await fetchStats(abortControllerRef.current.signal);
        }, pollingInterval);
      }
    });
  }, [fetchStats, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPollingActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    abortControllerRef.current = new AbortController();
    fetchStats(abortControllerRef.current.signal).then(() => {
      if (isMountedRef.current) {
        startPolling();
      }
    });

    return () => {
      isMountedRef.current = false;
      stopPolling();
      abortControllerRef.current?.abort();
    };
  }, [fetchStats, startPolling, stopPolling]);

  const refetch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    fetchStats(abortControllerRef.current.signal);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch,
    isPollingActive,
  };
}