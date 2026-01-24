'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

// This component listens for Firestore permission errors and throws them,
// making them visible in the Next.js development overlay.
// It is intended for development use ONLY and should not be included in production builds.
export function FirebaseErrorListener() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const handleError = (error: Error) => {
        // Throw the error so Next.js can catch it and display the overlay
        throw error;
      };

      errorEmitter.on('permission-error', handleError);

      return () => {
        errorEmitter.off('permission-error', handleError);
      };
    }
  }, []);

  return null; // This component does not render anything
}
