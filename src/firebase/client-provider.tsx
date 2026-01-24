'use client';
import React, { useState, useEffect } from 'react';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only render the provider on the client after mounting
  // to avoid server-client mismatch with Firebase initialization.
  if (!isMounted) {
    return null; // Or a loading spinner
  }

  return <FirebaseProvider>{children}</FirebaseProvider>;
}
