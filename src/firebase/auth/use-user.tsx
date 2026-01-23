'use client';

import { useEffect, useState } from 'react';

export function useUser() {
  const [user, setUser] = useState<{ uid: string, email: string, displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('mockUser') : null;
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
