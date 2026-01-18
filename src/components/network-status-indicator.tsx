
'use client';

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function NetworkStatusIndicator() {
  const { toast, dismiss } = useToast();
  // Start with `undefined` to avoid hydration mismatch on the server and client.
  const [isOnline, setIsOnline] = useState<boolean | undefined>(undefined);
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after initial hydration.
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    // Set the initial status when the component mounts.
    handleStatusChange();

    // Listen for changes in the network status.
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Cleanup the listeners when the component unmounts.
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  useEffect(() => {
    // This effect manages showing and hiding the toast.
    // It does nothing until `isOnline` is a boolean.
    if (isOnline === false) {
      // If we are offline and no toast is currently shown, display one.
      if (!toastIdRef.current) {
        const { id } = toast({
          variant: 'destructive',
          title: 'You Are Offline',
          description: 'Please check your connection. Some features may not be available.',
          duration: Infinity,
        });
        toastIdRef.current = id;
      }
    } else if (isOnline === true) {
      // If we are online, dismiss any existing offline notification.
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [isOnline, toast, dismiss]);

  return null; // This component does not render any UI.
}
