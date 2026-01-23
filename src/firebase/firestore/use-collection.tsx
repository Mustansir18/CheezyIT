'use client';
import { useState, useEffect } from 'react';

// Mock implementation since Firebase is detached.
export function useCollection<T = any>(query: any) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a short delay for loading state
    const timer = setTimeout(() => {
      setData([]); // Return empty array as there's no data source
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { data, isLoading, error: null };
}
