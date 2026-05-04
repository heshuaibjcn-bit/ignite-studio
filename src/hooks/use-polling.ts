'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Polling hook for job status updates.
 * Automatically stops polling when `enabled` is false.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const poll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    poll();
  }, [enabled, poll]);

  // Polling interval
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, poll]);

  return { data, isLoading, error, refetch: poll };
}
