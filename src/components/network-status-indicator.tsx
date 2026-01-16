
'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function NetworkStatusIndicator() {
  const { toast, dismiss } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Set initial state
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      setIsOnline(window.navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      // If a toast is already shown, don't show another one.
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
      }

      const { id } = toast({
        title: 'Internet not working',
        description: 'Please check your connection. Some features may not be available.',
        duration: Infinity,
        className: `
          bg-[#DCF8C6]
          text-black
          border-none
          rounded-2xl
          px-6
          py-4
          text-base
          max-w-[90%]
          shadow-md
        `,
      });
      toastIdRef.current = id;
    } else {
      // If online, dismiss any existing offline toast.
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [isOnline, toast, dismiss]);

  return null; // This component does not render any UI directly.
}
