
'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In development, throw the error to leverage Next.js's error overlay for debugging.
      if (process.env.NODE_ENV === 'development') {
        // Throwing in a timeout breaks out of the current React render/event cycle,
        // allowing Next.js to catch it and display the overlay.
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In a production environment, you would show a generic, user-friendly message.
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render any UI itself.
}
