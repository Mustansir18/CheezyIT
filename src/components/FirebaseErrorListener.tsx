
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error(error); // This will show the full error in the dev console
      toast({
        variant: 'destructive',
        title: 'Firestore Permission Error',
        description:
          'You do not have permission to perform this action. Check the console for details.',
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.removeListener('permission-error', handleError);
    };
  }, [toast]);

  return null;
}

